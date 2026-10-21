"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import './Login.css';

function Login() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [cargando, setCargando] = useState(false);
    const [errorLogin, setErrorLogin] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (cargando) return;

        setCargando(true);
        setErrorLogin('');
        const inicioSolicitud = Date.now();
        try {
            const respuesta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena }),
            });
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                setErrorLogin(
                    respuesta.status === 401
                        ? 'El correo o la contraseña son incorrectos. Verifica los datos e inténtalo de nuevo.'
                        : resultado.error || 'No se pudo iniciar sesión. Inténtalo de nuevo.',
                );
                return;
            }

            window.sessionStorage.setItem('cozymov-usuario-id', resultado.usuario.id);

            void Swal.fire({
                title: 'Iniciando sesión',
                text: 'Estamos validando tus datos.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading(),
            });
            const tiempoRestante = Math.max(0, 1000 - (Date.now() - inicioSolicitud));
            if (tiempoRestante > 0) {
                await new Promise((resolve) => window.setTimeout(resolve, tiempoRestante));
            }
            void Swal.fire({
                icon: 'success',
                title: '¡Inicio de sesión exitoso!',
                text: 'Has iniciado sesión correctamente.',
                timer: 500,
                timerProgressBar: true,
                allowOutsideClick: false,
                allowEscapeKey: false,
            }).then(({ dismiss }) => {
                if (dismiss === Swal.DismissReason.timer) router.push('/menu');
            });
        } catch {
            setErrorLogin('No se pudo conectar con el servidor. Inténtalo de nuevo.');
        } finally {
            setCargando(false);
        }
    };

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
