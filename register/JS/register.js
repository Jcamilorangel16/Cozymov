//DOMContentLoaded: Espera a que el DOM esté completamente cargado antes de ejecutar el código
document.addEventListener('DOMContentLoaded', function () {
//Funcion para navegar entre los campos del formulario con las teclas Enter, ArrowDown y ArrowUp
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

    camposRegistro.forEach(function (campo, indice) {
        campo.addEventListener('keydown', function (evento) {
            if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(evento.key)) { //.includes sirve para verificar si el valor de evento.key está en el array de teclas permitidas
                return;
            }

            evento.preventDefault(); //evita el comportamiento predeterminado de la tecla presionada

            const desplazamiento = evento.key === 'ArrowUp' ? -1 : 1; //? -1 : 1; es una expresión condicional que asigna -1 si la tecla presionada es ArrowUp y 1 en caso contrario
            const campoDestino = camposRegistro[indice + desplazamiento];

            if (campoDestino) {
                campoDestino.focus();
            } else if (evento.key === 'Enter') {
                botonSiguiente.click();//Si se presiona Enter en el último campo, simula un clic en el botón "Siguiente"
            }
        });
    });

//Botón siguiente de registro, guarda los datos en localStorage y redirige a login.html
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


