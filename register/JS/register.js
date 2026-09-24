//DOMContentLoaded: Espera a que el DOM esté completamente cargado antes de ejecutar el código
document.addEventListener('DOMContentLoaded', function () {

    // Botón siguiente de registro
    const botonSiguiente = document.getElementById('siguiente');

    // Campos del formulario
    const camposRegistro = [
        'nombre',
        'apellido',
        'documento',
        'numero',
        'correo',
        'contrasena',
        'confirmar-contrasena'
    ].map(function (id) {
        return document.getElementById(id);
    });

    // Función para navegar entre los campos del formulario con Enter, ArrowDown y ArrowUp
    camposRegistro.forEach(function (campo, indice) {
        campo.addEventListener('keydown', function (evento) {

            if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(evento.key)) {
                return;
            }

            evento.preventDefault();

            const desplazamiento = evento.key === 'ArrowUp' ? -1 : 1;
            const campoDestino = camposRegistro[indice + desplazamiento];

            if (campoDestino) {
                campoDestino.focus();
            } else if (evento.key === 'Enter') {
                botonSiguiente.click();
            }
        });
    });

    // Botón siguiente de registro, guarda los datos en localStorage y redirige a login.html
    botonSiguiente.addEventListener('click', function () {

        const datosUsuario = {
            nombre: document.getElementById('nombre').value.trim(),
            apellido: document.getElementById('apellido').value.trim(),
            documento: document.getElementById('documento').value.trim(),
            numero: document.getElementById('numero').value.trim(),
            correo: document.getElementById('correo').value.trim(),
            contrasena: document.getElementById('contrasena').value
        };

        const confirmarContrasena = document.getElementById('confirmar-contrasena').value;

        if (Object.values(datosUsuario).some(function (valor) {
            return valor === '';
        })) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        const correoInstitucional = /^[^\s@]+@[^\s@]+\.edu\.co$/i;

        if (!correoInstitucional.test(datosUsuario.correo)) {
            alert('Ingresa un correo válido que termine en .edu.co.');
            document.getElementById('correo').focus();
            return;
        }

        if (datosUsuario.contrasena !== confirmarContrasena) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        localStorage.setItem('usuarioRegistrado', JSON.stringify(datosUsuario));
        window.location.href = '../view/login.html';
    });
});