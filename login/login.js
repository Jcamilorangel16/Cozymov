document.addEventListener('DOMContentLoaded', function () {

    const formularioLogin = document.getElementById('formularioLogin');

    formularioLogin.addEventListener('submit', function (event) {

        event.preventDefault();

        // Obtener datos ingresados
        const correoIngresado = document.getElementById('correo').value.trim();
        const contrasenaIngresada = document.getElementById('contrasena').value;

        // Obtener usuario registrado
        const usuarioGuardado = localStorage.getItem('usuarioRegistrado');

        // Comprobar si existe un usuario
        if (!usuarioGuardado) {

            alert('No hay ningún usuario registrado.');

            return;
        }

        // Convertir los datos guardados de JSON a objeto
        const datosUsuario = JSON.parse(usuarioGuardado);

        // Comparar correo y contraseña
        if (
            correoIngresado === datosUsuario.correo &&
            contrasenaIngresada === datosUsuario.contrasena
        ) {

            alert('Inicio de sesión exitoso.');

            // Ir al menú principal
            window.location.href = 'menu_principal.html';

        } else {

            alert('Correo o contraseña incorrectos.');

        }

    });

});