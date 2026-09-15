document.addEventListener('DOMContentLoaded', function () {
    const botonSiguiente = document.getElementById('siguiente');

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

        if (datosUsuario.contrasena !== confirmarContrasena) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        localStorage.setItem('usuarioRegistrado', JSON.stringify(datosUsuario));
        window.location.href = '../view/login.html';
    });
});


