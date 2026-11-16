// Presenta los campos de acceso y muestra el resultado del inicio de sesión.
"use client";

import Link from 'next/link';
import '../styles/Login.css';
import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import BotonVerContrasena from '../../../components/BotonVerContrasena';

/**
 * Renderiza el formulario de acceso a la aplicación.
 * @returns Interfaz de inicio de sesión.
 */
function Login({ errorGoogle = '' }) {
    const [verContrasena, setVerContrasena] = useState(false);
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

                        <div className="input-group">
                            <input
                                type={verContrasena ? 'text' : 'password'}
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
                            <BotonVerContrasena
                                visible={verContrasena}
                                onAlternar={() => setVerContrasena((v) => !v)}
                                controla="contrasena"
                                disabled={cargando}
                            />
                        </div>

                        {/* Enlace de recuperación de contraseña */}
                        <div className="text-end mt-1">
                            <Link href="/recuperar-contrasena" className="small text-muted text-decoration-none">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    {(errorLogin || errorGoogle) && (
                        <p
                            className="small text-danger mb-3"
                            id="error-inicio-sesion"
                            role="alert"
                        >
                            {errorLogin || errorGoogle}
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

                        <div className="separador-google" role="separator" aria-label="o">
                            <span>o</span>
                        </div>

                        {/* Navegación completa: la ruta redirige a Google, no es una página de Next. */}
                        <a
                            href="/api/auth/google"
                            className={`btn btn-google${cargando ? ' disabled' : ''}`}
                            aria-disabled={cargando}
                        >
                            <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
                                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
                                <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
                                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                            </svg>
                            Continuar con Google
                        </a>
                    </div>

                </form>

            </div>
        </div>
        </>
    );
}

export default Login;
