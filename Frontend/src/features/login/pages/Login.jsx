import { useState } from 'react';
import './Login.css';

function Login() {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();

        const correoIngresado = correo.trim();
        const contrasenaIngresada = contrasena;

        // Obtener usuario registrado
        const usuarioGuardado = localStorage.getItem('usuarioRegistrado');

        if (!usuarioGuardado) {
            alert('No hay ningún usuario registrado.');
            return;
        }

        const datosUsuario = JSON.parse(usuarioGuardado);

        if (
            correoIngresado === datosUsuario.correo &&
            contrasenaIngresada === datosUsuario.contrasena
        ) {
            alert('Inicio de sesión exitoso.');
            window.location.href = 'menu_principal.html';
            // Si usas react-router-dom, reemplaza la línea de arriba por:
            // navigate('/menu-principal');
        } else {
            alert('Correo o contraseña incorrectos.');
        }
    };

    return (
        <div className="container min-vh-100 d-flex justify-content-center align-items-center">
            <div className="contenedor d-flex flex-column justify-content-center align-items-center p-4">

                {/* Logo */}
                <div className="logo mb-3">
                    COZYMOV
                </div>

                {/* Título */}
                <h5 className="titulo mb-4">
                    Iniciar sesión
                </h5>

                {/* Formulario */}
                <form id="formularioLogin" className="formulario" onSubmit={handleSubmit}>

                    {/* Correo */}
                    <div className="mb-3">
                        <label htmlFor="correo" className="form-label">
                            Correo electrónico
                        </label>

                        <input
                            type="email"
                            className="form-control"
                            id="correo"
                            placeholder="Ingrese su correo"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                        />
                    </div>

                    {/* Contraseña */}
                    <div className="mb-3">
                        <label htmlFor="contrasena" className="form-label">
                            Contraseña
                        </label>

                        <input
                            type="password"
                            className="form-control"
                            id="contrasena"
                            placeholder="Ingrese su contraseña"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            required
                        />
                    </div>

                    {/* Botones */}
                    <div className="d-grid gap-3">
                        <button type="submit" className="btn btn-login">
                            Iniciar sesión
                        </button>

                        <a href="register.html" className="btn btn-crear">
                            Registrarse
                        </a>
                    </div>

                </form>

            </div>
        </div>
    );
}

export default Login;
