// Presenta los campos de acceso y muestra el resultado del inicio de sesión.
"use client";

import Link from 'next/link';
import '../styles/Login.css';
import { useLogin } from '../hooks/useLogin';

/**
 * Renderiza el formulario de acceso a la aplicación.
 * @returns Interfaz de inicio de sesión.
 */
function Login() {
    const {
        correo,
        setCorreo,
        contrasena,
        setContrasena,
        cargando,
        errorLogin,
        setErrorLogin,
        handleSubmit,
    } = useLogin();

    return (
        <>
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
                            onChange={(e) => {
                                setCorreo(e.target.value);
                                setErrorLogin('');
                            }}
                            aria-invalid={Boolean(errorLogin)}
                            aria-describedby={errorLogin ? 'error-inicio-sesion' : undefined}
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
                            onChange={(e) => {
                                setContrasena(e.target.value);
                                setErrorLogin('');
                            }}
                            aria-invalid={Boolean(errorLogin)}
                            aria-describedby={errorLogin ? 'error-inicio-sesion' : undefined}
                            required
                        />

                        {/* Enlace de recuperación de contraseña */}
                        <div className="text-end mt-1">
                            <Link href="/recuperar-contrasena" className="small text-muted text-decoration-none">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    {errorLogin && (
                        <p
                            className="small text-danger mb-3"
                            id="error-inicio-sesion"
                            role="alert"
                        >
                            {errorLogin}
                        </p>
                    )}

                    {/* Botones */}
                    <div className="d-grid gap-3">
                        <button type="submit" className="btn btn-login" disabled={cargando} aria-busy={cargando}>
                            Iniciar sesión
                        </button>

                        <Link href="/register" className="btn btn-crear">
                            Registrarse
                        </Link>
                    </div>

                </form>

            </div>
        </div>
        </>
    );
}

export default Login;
