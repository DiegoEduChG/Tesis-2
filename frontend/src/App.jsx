// frontend/src/App.jsx
//
// Punto de entrada visual. Por ahora solo monta la pantalla de Registro
// de Metadatos y guarda el id_metadatos en memoria (useState), tal como
// indica el DDS: "el identificador obtenido se conserva en el Gestor de
// Estado del Frontend y acompaña a todas las peticiones posteriores".
//
// Las pantallas de Transcripción y Grabación se agregan aquí mismo en
// las siguientes tareas del cronograma.

import { useState } from 'react';
import RegistroMetadatos from './pages/RegistroMetadatos';

function App() {
  const [hablante, setHablante] = useState(null);

  return (
    <div>
      {!hablante && <RegistroMetadatos onHablanteListo={setHablante} />}

      {hablante && (
        <div style={{ maxWidth: 420, margin: '48px auto', fontFamily: 'sans-serif' }}>
          <p>Hablante identificado: id_metadatos = {hablante.id_metadatos}</p>
          <p>(Aquí seguirá la pantalla de redacción del enunciado)</p>
        </div>
      )}
    </div>
  );
}

export default App;
