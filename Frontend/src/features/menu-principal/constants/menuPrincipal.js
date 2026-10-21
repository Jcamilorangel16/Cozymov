// Define enlaces y contenido de muestra utilizado por el panel principal.

export const enlacesMenu = [
  { id: "inicio", label: "Inicio" },
  { id: "buscar", label: "Buscar" },
  { id: "ofrecer", label: "Ofrecer Viaje" },
  { id: "mensajes", label: "Mensajes" },
  { id: "en-curso", label: "En Curso" },
];

export const viajesDestacados = [
  { ruta: "Campus Sur → Centro", horario: "Hoy 7:00 AM · 3 plazas" },
  { ruta: "Norte → Campus Sur", horario: "Mañana 6:45 AM · 1 lugar" },
  { ruta: "Campus Norte → Centro", horario: "Hoy 8:15 AM · 2 plazas" },
  { ruta: "Campus Sur → Este", horario: "Hoy 9:00 AM · 4 lugares" },
];

export const proximosViajes = [
  { ruta: "Campus Norte → Centro", horario: "Mañana 8:00 AM" },
  { ruta: "Campus Norte → Centro", horario: "Mañana 9:00 AM" },
];

export const feedNotificaciones = [
  { icono: "📅", texto: "Cita agendada", detalle: "Camila Angel" },
  { icono: "✉️", texto: "Mensaje recibido", detalle: "Yefersonpazo" },
  { icono: "🔔", texto: "Nuevo viaje publicado", detalle: "system" },
];

// Datos de muestra conservados porque formaban parte del módulo original.
export const resultadosViajes = [
  {
    nombre: "Carlos Monteno", iniciales: "CM", avatarColor: "bg-danger",
    rating: "4.8", viajes: "37", ruta: "Norte → Campus Sur",
    horario: "Hoy · 6:50 AM", vehiculo: "Nissan Versa gris (ABC-123)",
    punto: "Entrada Norte", cupos: "2 lugares libres",
  },
  {
    nombre: "Sara Tomato", iniciales: "ST", avatarColor: "bg-primary",
    rating: "4.9", viajes: "52", ruta: "Norte → Campus Sur",
    horario: "Hoy · 10:50 AM", vehiculo: "Chevrolet Onix azul (XYZ-987)",
    punto: "Estación Central", cupos: "4 lugares libres",
  },
  {
    nombre: "Diego Lopez", iniciales: "DL", avatarColor: "bg-warning text-dark",
    rating: "4.5", viajes: "19", ruta: "Norte → Campus Sur",
    horario: "Mañana · 6:00 AM", vehiculo: "Renault Logan blanco (KLO-456)",
    punto: "Portal Norte", cupos: "1 lugar libre",
  },
];
