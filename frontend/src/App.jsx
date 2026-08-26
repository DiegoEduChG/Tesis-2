// frontend/src/App.jsx
//
// Encadena las pantallas del flujo del hablante nativo, siguiendo el
// orden que el DDS establece: identificación → redacción del enunciado
// → grabación (siguiente tarea del cronograma) → validación.
//
// El estado (hablante, enunciado) vive aquí, en el "Gestor de Estado"
// del Frontend, y se pasa hacia abajo por props — tal como describe el
// DDS en 2.2.1.1.

import { useState } from 'react';
import RegistroMetadatos from './pages/RegistroMetadatos';
import RedactarEnunciado from './pages/RedactarEnunciado';

function App() {
  const [hablante, setHablante] = useState(null);
  const [enunciado, setEnunciado] = useState(null);

  return (
    <div>
      {!hablante && <RegistroMetadatos onHablanteListo={setHablante} />}

  // Placeholder: aquí sigue la pantalla de Grabación (Web Audio API),
  // siguiente tarea del cronograma.
  return (
    <div style={{ maxWidth: 420, margin: '48px auto', fontFamily: 'sans-serif' }}>
      <p>Enunciado guardado: id_transcripcion = {enunciado.id_transcripcion}</p>
      <p>"{enunciado.texto_transcripcion}"</p>
      <p>(Aquí seguirá la pantalla de grabación de voz)</p>
    </div>
  );
}

export default App;
