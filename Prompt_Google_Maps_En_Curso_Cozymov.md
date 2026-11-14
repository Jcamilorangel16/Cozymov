# Prompt: Google Maps en «En curso»

Proyecto Cozymov · Instrucciones listas para implementar

# PROMPT

Actúa como ingeniero de software en este repositorio e integra un mapa de Google Maps en la vista «En curso». Usa el contexto confirmado de abajo: no vuelvas a pedirme que investigue o describa la estructura, el framework o los archivos que aquí ya están identificados. Antes de cambiar código, presenta un plan breve; espera mi confirmación solo si aparece una decisión importante o un dato imprescindible que no se pueda resolver con el contexto existente.

# Contexto confirmado del proyecto

• Proyecto: Cozymov. Frontend en Frontend; Next.js 16 con App Router, React 19, JavaScript y TypeScript, gestor npm.

• La vista actual está en Frontend\\src\\features\\viaje-en-curso/components/ViajeEnCurso.jsx. Consulta GET /api/viajes/en-curso y muestra la reserva, ruta, conductor y acciones para enviar mensaje o salir del viaje.

• La ruta API está en Frontend\\app\\api\\viajes/en-curso/route.ts. La respuesta normalizada incluye origen, destino, fecha/hora, precio e identificadores; origen y destino son actualmente textos, no coordenadas.

• El payload actual no incluye una posición en tiempo real. No uses la ubicación del pasajero como si fuera la del conductor ni agregues seguimiento o permisos de ubicación sin una fuente real y autorización explícita.

• La vista usa los estilos existentes del proyecto. package.json ya contiene React-Leaflet/Leaflet, pero la solicitud es integrar Google Maps en esta sección: evita reescribir lo demás o retirar dependencias que puedan usarse en otras vistas.

• Frontend/.gitignore ignora los archivos .env\* y permite .env.example. Ya existe Frontend/.env.local: no leas, muestres, copies ni sobrescribas su valor real.

# Implementación solicitada

• Integra un componente reutilizable RutaMapa (o nombre coherente con el proyecto) que reciba origen, destino y, solo si existe una fuente legítima, posición actual opcional.

• Usa una integración adecuada para React/Next.js, preferentemente @vis.gl/react-google-maps o el loader oficial @googlemaps/js-api-loader. Carga el script asíncronamente una sola vez y limpia listeners/recursos al desmontar.

• Traza la ruta con Directions API/Routes API según la solución elegida; muestra marcadores de origen y destino, y el de posición actual solo si hay coordenadas disponibles. Ajusta el encuadre con fitBounds y muestra distancia y duración estimada.

• Los valores actuales de origen/destino son texto. Comprueba si identifican ubicaciones con precisión suficiente para geocodificarse. Si no, no inventes coordenadas: hazme una pregunta concreta antes de implementar esa parte. Usa Geocoding API solo si hace falta convertir direcciones.

• Incluye estados accesibles y mensajes claros para carga, error de mapa/ruta o conexión y datos insuficientes. Si la ubicación actual no está disponible, omite ese marcador sin impedir mostrar la ruta. Mantén el mapa responsive, también en móvil.

• Conserva intactos los estados, el resumen del viaje, la navegación, el envío de mensajes y la cancelación de reserva existentes. Limita los cambios a lo necesario para esta integración.

# Clave y configuración de Google Cloud

• Para el mapa cliente de Next.js, usa NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en Frontend/.env.local y agrega Frontend/.env.example con el nombre de la variable y un valor vacío o ilustrativo, nunca una clave real. La variable NEXT_PUBLIC_ es visible en el navegador; protege la clave con restricciones, no la trates como secreto de servidor.

• Verifica que .env.local siga ignorado por Git y que .env.example pueda versionarse. No imprimas claves en logs ni las incluyas en el código.

• Explica cómo habilitar Maps JavaScript API y Directions API o Routes API (según la implementación), además de Geocoding API únicamente si se utiliza; crear una clave, restringirla a los dominios/referrers de desarrollo y producción y a las APIs necesarias; y activar facturación en Google Cloud.

# Verificación y entrega

• Añade solo las dependencias necesarias. Ejecuta las validaciones disponibles y pertinentes, como lint y build del frontend, y corrige fallos causados por tus cambios.

• Al terminar, informa qué archivos creaste/modificaste, qué dependencias agregaste, cómo configurar una clave local y cómo probar la vista. Indica también cualquier limitación que dependa de coordenadas o de una fuente de ubicación en vivo.

Implementa únicamente después del plan y de resolver cualquier dato imprescindible; no solicites contexto general que ya está descrito aquí.