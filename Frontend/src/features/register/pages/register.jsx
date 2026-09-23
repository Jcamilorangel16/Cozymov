import { useRef, useState } from 'react';
import Head from 'next/head';

const CAMPOS = ['nombre', 'apellido', 'documento', 'numero', 'correo', 'contrasena', 'confirmar-contrasena'];

function Register() {
  const refs = useRef({}); // { nombre: <input>, apellido: <input>, ... }

  const [datosUsuario, setDatosUsuario] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    numero: '',
    correo: '',
    contrasena: '',
  });
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  // Un solo handler para todos los inputs normales, usando el "name"
  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setDatosUsuario((prev) => ({ ...prev, [name]: value }));
  }

  // Navegación entre campos con Enter / ArrowUp / ArrowDown
  function manejarTeclado(evento, indice) {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(evento.key)) return;
    evento.preventDefault();

    const desplazamiento = evento.key === 'ArrowUp' ? -1 : 1;
    const idDestino = CAMPOS[indice + desplazamiento];

    if (idDestino) {
      refs.current[idDestino]?.focus();
    } else if (evento.key === 'Enter') {
      manejarSiguiente();
    }
  }

  // Validación y guardado (misma lógica que register.js, leyendo del estado)
  function manejarSiguiente() {
    if (Object.values(datosUsuario).some((valor) => valor === '') || confirmarContrasena === '') {
      alert('Por favor, completa todos los campos.');
      return;
    }

    const correoInstitucional = /^[^\s@]+@[^\s@]+\.edu\.co$/i;
    if (!correoInstitucional.test(datosUsuario.correo)) {
      alert('Ingresa un correo válido que termine en .edu.co.');
      refs.current.correo?.focus();
      return;
    }

    if (datosUsuario.contrasena !== confirmarContrasena) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    localStorage.setItem('usuarioRegistrado', JSON.stringify(datosUsuario));
    window.location.assign('/login');
  }

  return (
    <>
      <Head>
        <title>register</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
      </Head>

      <div className="register-page d-flex justify-content-center align-items-center min-vh-100">
        <div className="card shadow rounded-4 p-4 register-card">
          <h2 className="display-6 text-center fw-bold text-primary mb-3">Cozymov</h2>
          <h1 className="text-center mb-3">Crear cuenta</h1>
          <h5 className="text-center text-muted mb-4">Únete a nosotros y empieza tu viaje</h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="nombre" className="form-label">Nombres</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                className="form-control"
                placeholder="👤 Sergio David"
                value={datosUsuario.nombre}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 0)}
                ref={(el) => (refs.current.nombre = el)}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="apellido" className="form-label">Apellidos</label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                className="form-control"
                placeholder="👤 Gomez Gonzales"
                value={datosUsuario.apellido}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 1)}
                ref={(el) => (refs.current.apellido = el)}
              />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label htmlFor="documento" className="form-label">Documento de Identidad</label>
              <input
                id="documento"
                name="documento"
                type="number"
                className="form-control"
                placeholder="🪪 0123456789"
                value={datosUsuario.documento}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 2)}
                ref={(el) => (refs.current.documento = el)}
              />

              <label htmlFor="numero" className="form-label mt-3">Número de Teléfono</label>
              <input
                id="numero"
                name="numero"
                type="tel"
                className="form-control"
                placeholder="📞 3001234567"
                value={datosUsuario.numero}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 3)}
                ref={(el) => (refs.current.numero = el)}
              />

              <label htmlFor="correo" className="form-label mt-3">Correo Institucional</label>
              <input
                id="correo"
                name="correo"
                type="email"
                className="form-control"
                placeholder="📩 Sergio.Gomez@universidad.edu.co"
                pattern="[^\s@]+@[^\s@]+\.edu\.co"
                title="Usa un correo institucional que termine en .edu.co"
                value={datosUsuario.correo}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 4)}
                ref={(el) => (refs.current.correo = el)}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="contrasena" className="form-label">Contraseña</label>
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                className="form-control"
                placeholder=" 🔒 Ingrese su contraseña"
                value={datosUsuario.contrasena}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 5)}
                ref={(el) => (refs.current.contrasena = el)}
              />

              <label htmlFor="confirmar-contrasena" className="form-label mt-3">Confirmar Contraseña</label>
              <input
                id="confirmar-contrasena"
                name="confirmar-contrasena"
                type="password"
                className="form-control"
                placeholder=" 🔒 Confirme su contraseña"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                onKeyDown={(e) => manejarTeclado(e, 6)}
                ref={(el) => (refs.current['confirmar-contrasena'] = el)}
              />

              <button id="siguiente" type="button" className="btn btn-primary w-100 mt-5" onClick={manejarSiguiente}>
                Siguiente
              </button>
              <button
                id="volver"
                type="button"
                className="btn btn-light position-fixed top-0 start-0 m-5 shadow-sm"
                onClick={() => window.history.back()}
                aria-label="Volver a la página anterior"
              >
                &larr; Atrás
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;