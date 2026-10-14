"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './Login.css';

function Login() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (cargando) return;

        setCargando(true);
        try {
            const respuesta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena }),
            });
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                alert(resultado.error || 'Correo o contraseña incorrectos.');
                return;
            }

            alert('Inicio de sesión exitoso.');
            router.push('/menu');
        } catch {
            alert('No se pudo conectar con el servidor. Inténtalo de nuevo.');
        } finally {
            setCargando(false);
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
                        <button type="submit" className="btn btn-login" disabled={cargando}>
                            {cargando ? 'Validando...' : 'Iniciar sesión'}
                        </button>

                        <Link href="/register" className="btn btn-crear">
                            Registrarse
                        </Link>
                    </div>

                </form>

            </div>
        </div>
    );
}

export default Login;
