// frontend/src/config/api.js
//
// Dirección base de la API. Punto único desde el que todos los
// servicios obtienen la raíz de las peticiones.
//
// ---------------------------------------------------------------------
// POR QUÉ NO ESTÁ ESCRITA A MANO EN CADA SERVICIO
// ---------------------------------------------------------------------
// Hasta la versión anterior cada archivo de servicio declaraba su
// propia constante con el valor "http://localhost:3000/api". Eso
// bastaba mientras el sistema se ejecutaba en la misma máquina que el
// servidor, pero impedía desplegarlo: habría obligado a editar seis
// archivos antes de cada compilación, y cualquier olvido habría
// producido una pantalla que funciona y otra que no.
//
// El valor se resuelve ahora en tiempo de compilación a partir de una
// variable de entorno de Vite:
//
//   Desarrollo  → sin variable definida, se usa el servidor local.
//   Producción  → VITE_API_BASE=/api
//
// En producción la ruta es relativa porque el frontend y la API se
// sirven desde el mismo origen a través de CloudFront. Al compartir
// origen no interviene el control de acceso entre dominios (CORS), y
// las peticiones viajan por HTTPS sin configuración adicional.
//
// La condición de origen seguro no es opcional: la interfaz de captura
// de audio del navegador (getUserMedia) solo está disponible en
// contextos seguros, es decir, bajo HTTPS o en localhost. Servir el
// sistema desde una dirección IP sin certificado dejaría la grabación
// inoperante.
// ---------------------------------------------------------------------

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
