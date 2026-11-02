// Datos de ejemplo del viaje en curso hasta conectar el servicio real.
export const viajeEnCursoEjemplo = {
  estado: "en-camino",
  conductor: {
    id: "conductor_1",
    nombre: "Camila Ángel",
    calificacion: 4.8,
    viajesRealizados: 126,
    telefono: "+57 300 000 0000",
    vehiculo: "Mazda 2 · Gris",
    placa: "ABC-123",
  },
  ruta: {
    origen: "Campus Norte",
    destino: "Centro",
    salida: "Mañana 8:00 AM",
    llegadaEstimada: "8:25 AM",
    distancia: "6,4 km",
    duracion: "25 min",
    plazas: 2,
    precio: "$4.000",
    puntoEncuentro: "Portería principal",
  },
  coordenadas: {
    origen: [10.4850, -73.2650],
    destino: [10.4631, -73.2532],
    conductor: [10.4780, -73.2610],
    trayecto: [
      [10.4850, -73.2650],
      [10.4810, -73.2630],
      [10.4760, -73.2600],
      [10.4700, -73.2570],
      [10.4631, -73.2532],
    ],
  },
};