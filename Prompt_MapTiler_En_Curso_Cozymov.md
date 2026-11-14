# Prompt: MapTiler en «En curso»

Proyecto Cozymov · Instrucciones listas para implementar

# PROMPT

Actúa como ingeniero de software en este repositorio e integra un mapa de MapTiler en la vista «En curso». Usa el contexto confirmado de abajo: no vuelvas a pedirme que investigue o describa la estructura, el framework o los archivos que aquí ya están identificados. Antes de cambiar código, presenta un plan breve; espera mi confirmación solo si aparece una decisión importante o un dato imprescindible que no se pueda resolver con el contexto existente.

# Contexto confirmado del proyecto

• Proyecto: Cozymov. Frontend en Frontend; Next.js 16 con App Router, React 19, JavaScript y TypeScript, gestor npm.

• La vista actual está en Frontend\\src\\features\\viaje-en-curso/components/ViajeEnCurso.jsx. Consulta GET /api/viajes/en-curso y muestra la reserva, ruta, conductor y acciones para enviar mensaje o salir del viaje.

• La ruta API está en Frontend\\app\\api\\viajes/en-curso/route.ts. La respuesta normalizada incluye origen, destino, fecha/hora, precio e identificadores; origen y destino son actualmente textos, no coordenadas.

• El payload actual no incluye una posición en tiempo real. No uses la ubicación del pasajero como si fuera la del conductor ni agregues seguimiento o permisos de ubicación sin una fuente real y autorización explícita.

• La vista usa los estilos existentes del proyecto. package.json ya contiene React-Leaflet/Leaflet. Usa esas dependencias para mostrar el mapa de MapTiler y evita reescribir lo demás.

• Frontend/.gitignore ignora los archivos .env\* y permite .env.example. Ya existe Frontend/.env.local: no leas, muestres, copies ni sobrescribas su valor real.

# Implementación solicitada

• Integra un componente reutilizable MapaRuta (o nombre coherente con el proyecto) que reciba origen, destino y, solo si existe una fuente legítima, posición actual opcional.

• Usa MapTiler para renderizar el mapa. El mapa inicia en Valledupar, Colombia, y debe permitir cambiar la ciudad desde un control de ajustes junto al mapa. Incluye un menú desplegable con autocompletado de ciudades de Colombia; al elegir otra ciudad, actualiza el centro y los límites del mapa y guarda esa preferencia únicamente en el navegador, sin modificar la reserva.

• Permite buscar direcciones colombianas por nomenclatura, por ejemplo «Calle 45 # 15-20». El autocompletado debe priorizar Colombia y la ciudad seleccionada. Elegir una sugerencia fija manualmente el origen o destino activo; si no hay coincidencias, conserva la opción de seleccionar el punto con un clic en el mapa. En este proyecto Next.js, la variable del cliente debe llamarse NEXT_PUBLIC_MAPTILER_API_KEY; VITE_MAPTILER_API_KEY no se expone automáticamente en Next.js.

• MapTiler no ofrece el servicio de rutas viales. Para trazar una ruta, obtener distancia y duración estimadas, solicita autorización antes de usar un proveedor externo de rutas. Si se autoriza OSRM, explica que las coordenadas geocodificadas se envían a ese servicio. Muestra marcadores de origen y destino, y el de posición actual solo si hay coordenadas disponibles. Ajusta el encuadre y muestra distancia y duración estimada.

• No coloques automáticamente el origen ni el destino a partir del texto de la reserva. El usuario debe elegirlos manualmente con el mapa o con una sugerencia de dirección. Limita la selección a la ciudad activa y muestra mensajes claros cuando la geocodificación no encuentre la dirección.

• Incluye estados accesibles y mensajes claros para carga, error de mapa/ruta o conexión y datos insuficientes. Si la ubicación actual no está disponible, omite ese marcador sin impedir mostrar la ruta. Mantén el mapa responsive, también en móvil.

• Conserva intactos los estados, el resumen del viaje, la navegación, el envío de mensajes y la cancelación de reserva existentes. Limita los cambios a lo necesario para esta integración.

# Clave y configuración de MapTiler

• Para el mapa cliente de Next.js, usa NEXT_PUBLIC_MAPTILER_API_KEY en Frontend/.env.local y Frontend/.env.example con valor vacío o ilustrativo, nunca una clave real. La variable NEXT_PUBLIC_ es visible en el navegador; protege la clave con restricciones de dominio y no la trates como secreto de servidor.

• Verifica que .env.local siga ignorado por Git y que .env.example pueda versionarse. No imprimas claves en logs ni las incluyas en el código.

• Explica cómo crear una clave en MapTiler Cloud, restringirla a los dominios de desarrollo y producción y cómo configurar OSRM si se necesita el trazado vial.

# Verificación y entrega

• Añade solo las dependencias necesarias. Ejecuta las validaciones disponibles y pertinentes, como lint y build del frontend, y corrige fallos causados por tus cambios.

• Al terminar, informa qué archivos creaste/modificaste, qué dependencias agregaste, cómo configurar la clave local y cómo probar la vista. Indica también cualquier limitación que dependa de coordenadas o de una fuente de ubicación en vivo.

Implementa únicamente después del plan y de resolver cualquier dato imprescindible; no solicites contexto general que ya está descrito aquí.