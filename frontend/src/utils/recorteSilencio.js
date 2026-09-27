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
//      considerar que la voz empezó, y además que lo que seguirá también
//      suene a voz sostenida (§ confirmación). Así, un golpe en la mesa,
//      un chasquido del micrófono al presionar el botón, o el clic de un
//      "clonk" de touchscreen no fijan el punto de corte por sí solos:
//      son ruidos breves que no se sostienen en el tiempo, a diferencia
//      del habla real.
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
 *  recorte se considere fiable. Un valor de 2 equivale a unos 6 dB.
 *
 *  Se fijó inicialmente en 3 (9,5 dB), pero ese valor resultó demasiado
 *  exigente frente al audio real de un navegador: el control automático
 *  de ganancia del micrófono eleva el ruido durante los silencios y
 *  comprime la diferencia con la voz. Con 3, grabaciones perfectamente
 *  recortables quedaban descartadas. */
const RELACION_SENAL_RUIDO_MINIMA = 2;

/** Amplitud RMS por debajo de la cual se considera que no hay señal
 *  audible en absoluto (aproximadamente −50 dBFS). */
const PISO_ABSOLUTO = 0.003;

/** Duración mínima que debe quedar tras el recorte. Un resultado más
 *  corto indica que el algoritmo se equivocó, no que el hablante habló
 *  medio segundo. */
const DURACION_MINIMA_RESULTANTE_MS = 300;

/** Ventana de confirmación: una vez detectado un posible inicio (o
 *  final) de voz, se comprueba que el tramo que sigue durante este
 *  tiempo también contiene energía sostenida, y no que el candidato era
 *  un ruido aislado (un golpe, el clic del botón, un carraspeo). */
const DURACION_CONFIRMACION_MS = 400;

/** Proporción mínima de esa ventana de confirmación que debe seguir
 *  superando el umbral. No se exige el 100 % porque el habla real tiene
 *  pausas breves entre sílabas; con 35 % basta para distinguir una
 *  sílaba real —que arrastra las siguientes— de un ruido puntual que no
 *  vuelve a repetirse. */
const PROPORCION_CONFIRMACION = 0.35;

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
    confirmacionMs = DURACION_CONFIRMACION_MS,
    proporcionConfirmacion = PROPORCION_CONFIRMACION,
  } = opciones;

  // Valores medidos sobre la señal. Se devuelven siempre, tanto si se
  // recorta como si no: son los que permiten entender en campo por qué
  // el módulo tomó la decisión que tomó, sin tener que reproducir la
  // grabación ni adivinar las condiciones acústicas del lugar.
  const diagnostico = {
    ventanas: 0,
    ruidoDeFondo: null,
    nivelDeVoz: null,
    relacionSenalRuido: null,
    umbral: null,
  };

  /** Devuelve la señal intacta, dejando constancia del motivo. */
  const sinRecortar = (motivo) => ({
    muestras,
    recorte: {
      aplicado: false,
      motivo,
      segundosInicio: 0,
      segundosFinal: 0,
      segundosResultantes: muestras.length / frecuenciaMuestreo,
      diagnostico,
    },
  });

  const tamanoVentana = Math.max(
    1,
    Math.round((frecuenciaMuestreo * duracionVentanaMs) / 1000)
  );
  const numeroVentanas = Math.floor(muestras.length / tamanoVentana);
  diagnostico.ventanas = numeroVentanas;

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
  //
  // El percentil de voz es 99 y no 95 por una razón concreta: cuando el
  // enunciado es breve y los silencios largos —por ejemplo, medio
  // segundo de voz entre tres segundos de espera a cada lado—, la voz
  // ocupa menos del 10 % de las ventanas y el percentil 95 cae todavía
  // dentro del silencio. El módulo concluiría entonces que no hay voz
  // que distinguir y devolvería la grabación intacta, que es
  // precisamente el caso en que más falta hace recortar.
  const ordenadas = Float32Array.from(energias).sort();
  const percentil = (p) =>
    ordenadas[Math.min(ordenadas.length - 1, Math.floor(p * ordenadas.length))];

  const ruidoDeFondo = percentil(0.1);
  const nivelDeVoz = percentil(0.99);

  diagnostico.ruidoDeFondo = ruidoDeFondo;
  diagnostico.nivelDeVoz = nivelDeVoz;
  diagnostico.relacionSenalRuido = ruidoDeFondo > 0 ? nivelDeVoz / ruidoDeFondo : Infinity;

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
  diagnostico.umbral = umbral;

  const ventanasConfirmacion = Math.max(1, Math.round(confirmacionMs / duracionVentanaMs));

  const ventanaInicial = buscarVozSostenida(
    energias,
    umbral,
    ventanasMinimasDeVoz,
    'adelante',
    ventanasConfirmacion,
    proporcionConfirmacion
  );
  const ventanaFinal = buscarVozSostenida(
    energias,
    umbral,
    ventanasMinimasDeVoz,
    'atras',
    ventanasConfirmacion,
    proporcionConfirmacion
  );

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
      diagnostico,
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
 * Procede en dos pasos que se repiten hasta encontrar un candidato
 * válido o agotar la señal:
 *
 *   1. Buscar la primera sucesión de `minimas` ventanas consecutivas por
 *      encima del umbral (un ruido breve también supera esta prueba).
 *   2. Confirmar que ese candidato no es un ruido aislado, comprobando
 *      que el tramo que sigue durante `ventanasConfirmacion` ventanas
 *      mantiene energía por encima del umbral en al menos la proporción
 *      `proporcionConfirmacion`.
 *
 * Si la confirmación falla, el candidato se descarta y la búsqueda
 * continúa a partir de la siguiente ventana, en vez de conformarse con
 * el primer sonido que aparece. Este es el motivo por el que un golpe
 * aislado al principio de una grabación —el clic del botón "Grabar", un
 * carraspeo antes de empezar a leer— ya no fija el punto de corte: se
 * detecta, se descarta por no sostenerse, y la búsqueda sigue hasta el
 * verdadero inicio de la voz.
 *
 * @returns {number} Índice de ventana, o -1 si no se encontró voz.
 */
function buscarVozSostenida(
  energias,
  umbral,
  minimas,
  sentido,
  ventanasConfirmacion,
  proporcionConfirmacion
) {
  if (sentido === 'adelante') {
    let desde = 0;

    while (desde <= energias.length - minimas) {
      const candidato = escanearRunAdelante(energias, umbral, minimas, desde);
      if (candidato === -1) return -1;

      if (
        confirmarSostenida(
          energias,
          umbral,
          candidato,
          ventanasConfirmacion,
          proporcionConfirmacion,
          'adelante'
        )
      ) {
        return candidato;
      }

      // Candidato descartado por no sostenerse: se retoma la búsqueda
      // justo después, no desde cero, para no volver a tropezar con el
      // mismo ruido.
      desde = candidato + 1;
    }

    return -1;
  }

  let hasta = energias.length - 1;

  while (hasta >= minimas - 1) {
    const candidato = escanearRunAtras(energias, umbral, minimas, hasta);
    if (candidato === -1) return -1;

    if (
      confirmarSostenida(
        energias,
        umbral,
        candidato,
        ventanasConfirmacion,
        proporcionConfirmacion,
        'atras'
      )
    ) {
      return candidato;
    }

    hasta = candidato - 1;
  }

  return -1;
}

/** Sucesión de `minimas` ventanas consecutivas por encima del umbral,
 *  buscando hacia adelante desde el índice `desde`. Devuelve el índice
 *  de la primera ventana de esa sucesión. */
function escanearRunAdelante(energias, umbral, minimas, desde) {
  let consecutivas = 0;

  for (let v = desde; v < energias.length; v++) {
    if (energias[v] >= umbral) {
      consecutivas++;
      if (consecutivas >= minimas) return v - minimas + 1;
    } else {
      consecutivas = 0;
    }
  }

  return -1;
}

/** Análogo a `escanearRunAdelante`, buscando hacia atrás desde el índice
 *  `hasta`. Devuelve el índice de la última ventana de la sucesión. */
function escanearRunAtras(energias, umbral, minimas, hasta) {
  let consecutivas = 0;

  for (let v = hasta; v >= 0; v--) {
    if (energias[v] >= umbral) {
      consecutivas++;
      if (consecutivas >= minimas) return v + minimas - 1;
    } else {
      consecutivas = 0;
    }
  }

  return -1;
}

/**
 * Comprueba que un candidato a inicio/final de voz se sostiene en el
 * tiempo, en vez de ser un sonido aislado.
 *
 * Cuando el candidato está tan cerca del extremo de la grabación que no
 * queda margen suficiente para observar la ventana de confirmación
 * completa, se acepta sin más comprobación: negarlo en ese caso
 * descartaría injustamente grabaciones donde la voz ocupa casi todo el
 * clip, que es exactamente lo que ocurre cuando el recorte funciona
 * bien.
 */
function confirmarSostenida(
  energias,
  umbral,
  candidato,
  ventanasConfirmacion,
  proporcionConfirmacion,
  sentido
) {
  let disponibles, cuenta;

  if (sentido === 'adelante') {
    const fin = Math.min(energias.length, candidato + ventanasConfirmacion);
    disponibles = fin - candidato;
    if (disponibles < ventanasConfirmacion) return true;

    cuenta = 0;
    for (let v = candidato; v < fin; v++) {
      if (energias[v] >= umbral) cuenta++;
    }
  } else {
    const inicio = Math.max(0, candidato - ventanasConfirmacion + 1);
    disponibles = candidato - inicio + 1;
    if (disponibles < ventanasConfirmacion) return true;

    cuenta = 0;
    for (let v = inicio; v <= candidato; v++) {
      if (energias[v] >= umbral) cuenta++;
    }
  }

  return cuenta / disponibles >= proporcionConfirmacion;
}
