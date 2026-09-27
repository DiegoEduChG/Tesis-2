// frontend/src/utils/recorteSilencio.js
//
// Recorte de los silencios al inicio y al final de una grabación.
//
// ---------------------------------------------------------------------
// POR QUÉ ESTE MÓDULO EXISTE
// ---------------------------------------------------------------------
// Entre que el hablante pulsa "Grabar" y empieza a leer el enunciado
// transcurre un intervalo de duración variable, y lo mismo ocurre entre
// que termina de leer y pulsa "Detener". Ese intervalo no contiene voz,
// pero sí ocupa espacio en el corpus y, sobre todo, contamina la
// duración registrada de cada grabación, que es uno de los valores con
// los que se mide el resultado R4.1 (minutos de audio validado).
//
// Un corpus de voz cuyos clips arrancan y terminan con dos segundos de
// sala vacía es un corpus de peor calidad para entrenar modelos del
// habla, que es el uso previsto del material recolectado.
//
// ---------------------------------------------------------------------
// CRITERIO DE DISEÑO: PRUDENCIA ANTES QUE AGRESIVIDAD
// ---------------------------------------------------------------------
// Este recorte es irreversible: las muestras eliminadas no se conservan
// en ninguna parte, y si el algoritmo se come la primera sílaba, el
// hablante no tiene forma de recuperarla salvo volver a grabar. Por eso
// el módulo está construido para equivocarse siempre del lado de
// recortar de menos:
//
//   1. El umbral no es un valor absoluto, sino que se deriva del propio
//      audio: se estima el ruido de fondo de esa grabación concreta y el
//      nivel de la voz, y el umbral se sitúa cerca del ruido. Un valor
//      fijo funcionaría en una habitación silenciosa y fallaría en un
//      patio con viento o con animales de fondo, que es el escenario
//      previsible de la prueba piloto.
//
//   2. Se exige que varias ventanas consecutivas superen el umbral para
//      considerar que la voz empezó. Así, un golpe en la mesa o un
//      chasquido del micrófono no fijan el punto de corte.
//
//   3. Se conserva un margen de silencio a cada lado. Las consonantes
//      sordas iniciales (/p/, /t/, /k/, /s/) tienen muy poca energía y
//      quedarían por debajo del umbral; el margen las protege.
//
//   4. Si la grabación no permite distinguir voz de ruido con holgura
//      suficiente, NO se recorta nada y se devuelve el audio íntegro con
//      el motivo. Preferir el audio sin tocar a un recorte dudoso.
//
// El módulo es una función pura sobre un arreglo de muestras: no accede
// al DOM, ni a la red, ni a las APIs de audio del navegador. Esto lo
// hace verificable mediante pruebas unitarias con señales sintéticas.
// ---------------------------------------------------------------------

/** Duración de la ventana de análisis. A 16 kHz equivale a 320 muestras.
 *  Es el orden de magnitud en el que la energía de la voz se mantiene
 *  estable: ventanas mucho más cortas oscilan con cada ciclo de la onda. */
const DURACION_VENTANA_MS = 20;

/** Silencio que se conserva a cada lado del tramo con voz. */
const MARGEN_SEGURIDAD_MS = 150;

/** Ventanas consecutivas por encima del umbral que se exigen para dar
 *  por comenzada (o terminada) la voz. Tres ventanas son 60 ms: menos
 *  que la sílaba más breve, más que cualquier ruido impulsivo. */
const VENTANAS_MINIMAS_DE_VOZ = 3;

/** Posición del umbral dentro del rango que va del ruido de fondo al
 *  nivel de la voz. Un 8 % lo deja deliberadamente cerca del ruido. */
const PROPORCION_UMBRAL = 0.08;

/** Relación mínima entre el nivel de voz y el de ruido para que el
 *  recorte se considere fiable. Un valor de 3 equivale a unos 9,5 dB. */
const RELACION_SENAL_RUIDO_MINIMA = 3;

/** Amplitud RMS por debajo de la cual se considera que no hay señal
 *  audible en absoluto (aproximadamente −50 dBFS). */
const PISO_ABSOLUTO = 0.003;

/** Duración mínima que debe quedar tras el recorte. Un resultado más
 *  corto indica que el algoritmo se equivocó, no que el hablante habló
 *  medio segundo. */
const DURACION_MINIMA_RESULTANTE_MS = 300;

/**
 * Elimina el silencio inicial y final de una señal de audio.
 *
 * @param {Float32Array} muestras Muestras en el rango [-1, 1].
 * @param {object} [opciones]
 * @param {number} [opciones.frecuenciaMuestreo=16000]
 * @returns {{muestras: Float32Array, recorte: object}}
 *   `muestras` es la señal recortada, o la original si no se recortó.
 *   `recorte` describe qué se hizo y, si no se hizo nada, por qué.
 */
export function recortarSilencio(muestras, opciones = {}) {
  const {
    frecuenciaMuestreo = 16000,
    duracionVentanaMs = DURACION_VENTANA_MS,
    margenMs = MARGEN_SEGURIDAD_MS,
    ventanasMinimasDeVoz = VENTANAS_MINIMAS_DE_VOZ,
    proporcionUmbral = PROPORCION_UMBRAL,
    relacionSenalRuidoMinima = RELACION_SENAL_RUIDO_MINIMA,
    pisoAbsoluto = PISO_ABSOLUTO,
  } = opciones;

  /** Devuelve la señal intacta, dejando constancia del motivo. */
  const sinRecortar = (motivo) => ({
    muestras,
    recorte: {
      aplicado: false,
      motivo,
      segundosInicio: 0,
      segundosFinal: 0,
      segundosResultantes: muestras.length / frecuenciaMuestreo,
    },
  });

  const tamanoVentana = Math.max(
    1,
    Math.round((frecuenciaMuestreo * duracionVentanaMs) / 1000)
  );
  const numeroVentanas = Math.floor(muestras.length / tamanoVentana);

  // Con menos ventanas que las exigidas para detectar voz al inicio y al
  // final no hay material suficiente para decidir nada.
  if (numeroVentanas < ventanasMinimasDeVoz * 2) {
    return sinRecortar('grabacion_demasiado_corta');
  }

  const energias = calcularEnergiaPorVentana(muestras, tamanoVentana, numeroVentanas);

  // El ruido de fondo se estima con un percentil bajo en lugar del
  // mínimo, para que una única ventana anormalmente limpia no lo
  // subestime; el nivel de voz, con un percentil alto en lugar del
  // máximo, para que un golpe aislado no lo sobreestime.
  const ordenadas = Float32Array.from(energias).sort();
  const percentil = (p) =>
    ordenadas[Math.min(ordenadas.length - 1, Math.floor(p * ordenadas.length))];

  const ruidoDeFondo = percentil(0.1);
  const nivelDeVoz = percentil(0.95);

  if (nivelDeVoz < pisoAbsoluto) {
    return sinRecortar('sin_senal_audible');
  }

  // Grabación demasiado ruidosa: la voz no sobresale lo suficiente del
  // fondo como para localizar sus extremos con confianza.
  if (nivelDeVoz < ruidoDeFondo * relacionSenalRuidoMinima) {
    return sinRecortar('relacion_senal_ruido_insuficiente');
  }

  const umbral = Math.max(
    ruidoDeFondo + (nivelDeVoz - ruidoDeFondo) * proporcionUmbral,
    pisoAbsoluto
  );

  const ventanaInicial = buscarVozSostenida(energias, umbral, ventanasMinimasDeVoz, 'adelante');
  const ventanaFinal = buscarVozSostenida(energias, umbral, ventanasMinimasDeVoz, 'atras');

  if (ventanaInicial === -1 || ventanaFinal === -1 || ventanaFinal <= ventanaInicial) {
    return sinRecortar('no_se_detecto_voz');
  }

  const margenMuestras = Math.round((frecuenciaMuestreo * margenMs) / 1000);
  const inicio = Math.max(0, ventanaInicial * tamanoVentana - margenMuestras);
  const fin = Math.min(muestras.length, (ventanaFinal + 1) * tamanoVentana + margenMuestras);

  if (inicio === 0 && fin === muestras.length) {
    return sinRecortar('nada_que_recortar');
  }

  const muestrasMinimas = Math.round(
    (frecuenciaMuestreo * DURACION_MINIMA_RESULTANTE_MS) / 1000
  );

  // Salvaguarda final: si el recorte dejaría un fragmento inverosímil,
  // se descarta por completo en lugar de entregar un audio mutilado.
  if (fin - inicio < muestrasMinimas) {
    return sinRecortar('resultado_demasiado_corto');
  }

  const recortadas = muestras.slice(inicio, fin);

  return {
    muestras: recortadas,
    recorte: {
      aplicado: true,
      motivo: null,
      segundosInicio: inicio / frecuenciaMuestreo,
      segundosFinal: (muestras.length - fin) / frecuenciaMuestreo,
      segundosResultantes: recortadas.length / frecuenciaMuestreo,
    },
  };
}

/**
 * Energía RMS de cada ventana. Se usa RMS y no la amplitud máxima
 * porque el valor máximo de una ventana lo fija una sola muestra, que
 * puede ser un pico de ruido, mientras que el RMS describe el contenido
 * energético del tramo completo.
 */
function calcularEnergiaPorVentana(muestras, tamanoVentana, numeroVentanas) {
  const energias = new Float32Array(numeroVentanas);

  for (let v = 0; v < numeroVentanas; v++) {
    const inicio = v * tamanoVentana;
    let sumaCuadrados = 0;

    for (let i = inicio; i < inicio + tamanoVentana; i++) {
      sumaCuadrados += muestras[i] * muestras[i];
    }

    energias[v] = Math.sqrt(sumaCuadrados / tamanoVentana);
  }

  return energias;
}

/**
 * Localiza el extremo del tramo con voz.
 *
 * Recorre las ventanas en el sentido indicado hasta encontrar una
 * sucesión ininterrumpida de `minimas` ventanas por encima del umbral, y
 * devuelve el índice de la ventana de esa sucesión que queda más hacia
 * el exterior de la grabación: la primera en orden temporal si se busca
 * hacia adelante, la última si se busca hacia atrás.
 *
 * @returns {number} Índice de ventana, o -1 si no se encontró voz.
 */
function buscarVozSostenida(energias, umbral, minimas, sentido) {
  let consecutivas = 0;

  if (sentido === 'adelante') {
    for (let v = 0; v < energias.length; v++) {
      if (energias[v] >= umbral) {
        consecutivas++;
        if (consecutivas >= minimas) return v - minimas + 1;
      } else {
        consecutivas = 0;
      }
    }
  } else {
    for (let v = energias.length - 1; v >= 0; v--) {
      if (energias[v] >= umbral) {
        consecutivas++;
        if (consecutivas >= minimas) return v + minimas - 1;
      } else {
        consecutivas = 0;
      }
    }
  }

  return -1;
}
