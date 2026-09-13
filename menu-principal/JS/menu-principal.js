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
}