document.addEventListener('DOMContentLoaded', function () {
    const enlaces = document.querySelectorAll('.sidebar-nav .nav-link');
 
    enlaces.forEach(function (enlace) {
        enlace.addEventListener('click', function (evento) {
            evento.preventDefault(); // evita que el enlace intente navegar
 
            const nombreVista = enlace.dataset.vista; // toma el valor de data-vista="..."
            mostrarVista(nombreVista, enlace);
        });
    });
});
 
function mostrarVista(nombre, boton) {
    // Ocultar todas las vistas y mostrar solo la elegida
    document.querySelectorAll('.vista').forEach(function (vista) {
        vista.style.display = 'none';
    });
    document.getElementById('vista-' + nombre).style.display = 'block';

    // Mover la clase "active" al boton en el que se hizo click
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(function (link) {
        link.classList.remove('active');
    });
    boton.classList.add('active');

    // Al entrar a Buscar, siempre arrancar mostrando los resultados, no el detalle
    if (nombre === 'buscar') {
        document.getElementById('buscar-resultados').style.display = 'block';
        document.getElementById('buscar-detalle').style.display = 'none';
    }
}

// --- Logica de la vista Buscar: mostrar detalle de un viaje seleccionado ---

document.addEventListener('DOMContentLoaded', function () {
    const tarjetasResultado = document.querySelectorAll('.resultado-viaje');
    const botonVolver = document.getElementById('btn-volver-resultados');

    tarjetasResultado.forEach(function (tarjeta) {
        tarjeta.addEventListener('click', function () {
            llenarDetalleViaje(tarjeta.dataset);

            document.getElementById('buscar-resultados').style.display = 'none';
            document.getElementById('buscar-detalle').style.display = 'block';
        });
    });

    if (botonVolver) {
        botonVolver.addEventListener('click', function () {
            document.getElementById('buscar-detalle').style.display = 'none';
            document.getElementById('buscar-resultados').style.display = 'block';
        });
    }
});

function llenarDetalleViaje(datos) {
    document.getElementById('detalle-ruta').textContent = datos.ruta;
    document.getElementById('detalle-horario').textContent = datos.horario;
    document.getElementById('detalle-nombre').textContent = datos.nombre;
    document.getElementById('detalle-rating').textContent = '★ ' + datos.rating + ' · ' + datos.viajes + ' viajes';
    document.getElementById('detalle-vehiculo').textContent = datos.vehiculo;
    document.getElementById('detalle-punto').textContent = datos.punto;
    document.getElementById('detalle-cupos').textContent = datos.cupos;

    const avatar = document.getElementById('detalle-avatar');
    avatar.textContent = datos.iniciales;
    avatar.className = 'user-avatar ' + datos.avatarColor;
}