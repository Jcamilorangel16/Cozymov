// Presenta los campos de acceso y muestra el resultado del inicio de sesión.
"use client";

import Link from 'next/link';
import { LogoMark } from '../../../components/Logo';
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
        <main className="login-page">
            <div className="login-layout">
                <section className="login-intro" aria-labelledby="login-welcome">
                    <Link href="/" className="login-brand" aria-label="Cozymov, inicio">
                        <LogoMark className="login-brand-mark" />
                        Cozymov
                    </Link>

                    <div className="login-intro-copy">
                        <span className="login-eyebrow">
                            <span aria-hidden="true">✦</span> MOVILIDAD COMPARTIDA
                        </span>
                        <h1 id="login-welcome">
                            Comparte el camino.
                            <span> Llega más lejos.</span>
                        </h1>
                        <p>
                            Encuentra trayectos, comparte gastos y haz más fácil cada
                            viaje a tu destino.
                        </p>
                    </div>

                    <div className="login-benefits" aria-label="Beneficios de Cozymov">
                        <article className="login-benefit">
                            <span className="login-benefit-icon" aria-hidden="true">↗</span>
                            <div>
                                <h2>Viajes compartidos</h2>
                                <p>Conecta con personas que van por tu ruta.</p>
                            </div>
                        </article>
                        <article className="login-benefit">
                            <span className="login-benefit-icon login-benefit-icon-blue" aria-hidden="true">⌖</span>
                            <div>
                                <h2>Encuentra tu trayecto</h2>
                                <p>Explora opciones y elige la que te conviene.</p>
                            </div>
                        </article>
                        <article className="login-benefit">
                            <span className="login-benefit-icon login-benefit-icon-violet" aria-hidden="true">♡</span>
                            <div>
                                <h2>Muévete en comunidad</h2>
                                <p>Publica un viaje y comparte el recorrido.</p>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="login-card" aria-labelledby="login-title">
                    <div className="login-card-heading">
                        <span className="login-card-kicker">QUÉ BUENO TENERTE DE VUELTA</span>
                        <h2 id="login-title">Iniciar sesión</h2>
                        <p>Ingresa tus datos para continuar con Cozymov.</p>
                    </div>

                    <form id="formularioLogin" className="login-form" onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label htmlFor="correo">Correo electrónico</label>
                            <input
                                type="email"
                                className="form-control"
                                id="correo"
                                placeholder="tu@correo.com"
                                autoComplete="email"
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

                        <div className="login-field">
                            <label htmlFor="contrasena">Contraseña</label>
                            <input
                                type="password"
                                className="form-control"
                                id="contrasena"
                                placeholder="Ingresa tu contraseña"
                                autoComplete="current-password"
                                value={contrasena}
                                onChange={(e) => {
                                    setContrasena(e.target.value);
                                    setErrorLogin('');
                                }}
                                aria-invalid={Boolean(errorLogin)}
                                aria-describedby={errorLogin ? 'error-inicio-sesion' : undefined}
                                required
                            />
                            <div className="login-field-aside">
                                <Link href="/recuperar-contrasena">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </div>

                        {errorLogin && (
                            <p
                                className="login-error"
                                id="error-inicio-sesion"
                                role="alert"
                            >
                                {errorLogin}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={cargando}
                            aria-busy={cargando}
                        >
                            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
                            <span aria-hidden="true">→</span>
                        </button>
                    </form>

                    <div className="login-card-footer">
                        <span>¿Aún no tienes cuenta?</span>
                        <Link href="/register">Crear una cuenta</Link>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Login;
