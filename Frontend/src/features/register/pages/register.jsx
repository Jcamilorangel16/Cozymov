"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import './register.css';

function mostrarError(mensaje) {
  void Swal.fire({ icon: 'error', text: mensaje });
}

function Register() {
  const router = useRouter();
  const refs = useRef({});
  const temporizadorRegistro = useRef(null);

  const [datosUsuario, setDatosUsuario] = useState({
    idUsuario: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    edad: '',
    correo: '',
    contrasena: '',
  });
  const [tipoOcupacion, setTipoOcupacion] = useState('');
  const [ocupacionOtro, setOcupacionOtro] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(
    () => () => window.clearTimeout(temporizadorRegistro.current),
    [],
  );

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setDatosUsuario((prev) => ({ ...prev, [name]: value }));
  }

  function manejarTeclado(evento, campoActual) {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(evento.key)) return;
    evento.preventDefault();

    const campos = [
      'primerNombre',
      'segundoNombre',
      'primerApellido',
      'segundoApellido',
      'idUsuario',
      'edad',
      'tipoOcupacion',
      ...(tipoOcupacion === 'otro' ? ['ocupacionOtro'] : []),
      'correo',
      'contrasena',
      'confirmar-contrasena',
    ];
    const indice = campos.indexOf(campoActual);
    const desplazamiento = evento.key === 'ArrowUp' ? -1 : 1;
    const idDestino = campos[indice + desplazamiento];

    if (idDestino) {
      refs.current[idDestino]?.focus();
    } else if (evento.key === 'Enter') {
      manejarSiguiente();
    }
  }

  async function manejarSiguiente() {
    if (guardando) return;

    const camposObligatorios = [
      'primerNombre',
      'primerApellido',
      'idUsuario',
      'edad',
      'correo',
      'contrasena',
    ];
    if (
      camposObligatorios.some((campo) => !datosUsuario[campo].trim()) ||
      !tipoOcupacion ||
      (tipoOcupacion === 'otro' && !ocupacionOtro.trim()) ||
      confirmarContrasena === ''
    ) {
      mostrarError('Por favor, completa todos los campos.');
      return;
    }

    if (datosUsuario.idUsuario.trim().length > 20) {
      mostrarError('La cédula no puede superar los 20 caracteres.');
      refs.current.idUsuario?.focus();
      return;
    }

    if (
      !Number.isInteger(Number(datosUsuario.edad)) ||
      Number(datosUsuario.edad) < 16 ||
      Number(datosUsuario.edad) > 32767
    ) {
      mostrarError('La edad debe ser un número entero entre 16 y 32767 años.');
      refs.current.edad?.focus();
      return;
    }

    const correoInstitucional = /^[^\s@]+@[^\s@]+\.edu\.co$/i;
    if (!correoInstitucional.test(datosUsuario.correo)) {
      mostrarError('Ingresa un correo válido que termine en .edu.co.');
      refs.current.correo?.focus();
      return;
    }

    if (datosUsuario.contrasena !== confirmarContrasena) {
      mostrarError('Las contraseñas no coinciden.');
      return;
    }

    if (datosUsuario.contrasena.length < 8) {
      mostrarError('La contraseña debe tener al menos 8 caracteres.');
      refs.current.contrasena?.focus();
      return;
    }

    setGuardando(true);
    void Swal.fire({
      title: 'Registrando usuario',
      text: 'Estamos guardando tu información. Esto tomará unos segundos.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });
    const inicioRegistro = Date.now();
    try {
      const respuesta = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datosUsuario,
          edad: Number(datosUsuario.edad),
          ocupacion: tipoOcupacion === 'otro' ? ocupacionOtro.trim() : tipoOcupacion,
        }),
      });
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        mostrarError(resultado.error || 'No se pudo crear la cuenta.');
        return;
      }

      const tiempoRestante = Math.max(0, 2000 - (Date.now() - inicioRegistro));
      if (tiempoRestante > 0) {
        await new Promise((resolve) => {
          temporizadorRegistro.current = window.setTimeout(resolve, tiempoRestante);
        });
      }
      void Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: 'Tu cuenta se creó correctamente.',
        confirmButtonText: 'Continuar',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(({ isConfirmed }) => {
        if (isConfirmed) router.push('/');
      });
    } catch {
      mostrarError('No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="register-page d-flex justify-content-center align-items-center min-vh-100">
        <div className="card shadow rounded-4 p-4 register-card">
          <h2 className="display-6 text-center fw-bold text-primary mb-3">Cozymov</h2>
          <h1 className="text-center mb-3">Crear cuenta</h1>
          <h5 className="text-center text-muted mb-4">Únete a nosotros y empieza tu viaje</h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="primerNombre" className="form-label">Primer nombre</label>
              <input
                id="primerNombre"
                name="primerNombre"
                type="text"
                className="form-control"
                maxLength={50}
                placeholder="Primer nombre"
                value={datosUsuario.primerNombre}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'primerNombre')}
                ref={(el) => (refs.current.primerNombre = el)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="segundoNombre" className="form-label">Segundo nombre (opcional)</label>
              <input
                id="segundoNombre"
                name="segundoNombre"
                type="text"
                className="form-control"
                maxLength={50}
                value={datosUsuario.segundoNombre}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'segundoNombre')}
                ref={(el) => (refs.current.segundoNombre = el)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="primerApellido" className="form-label">Primer apellido</label>
              <input
                id="primerApellido"
                name="primerApellido"
                type="text"
                className="form-control"
                maxLength={50}
                placeholder="Primer apellido"
                value={datosUsuario.primerApellido}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'primerApellido')}
                ref={(el) => (refs.current.primerApellido = el)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="segundoApellido" className="form-label">Segundo apellido (opcional)</label>
              <input
                id="segundoApellido"
                name="segundoApellido"
                type="text"
                className="form-control"
                maxLength={50}
                value={datosUsuario.segundoApellido}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'segundoApellido')}
                ref={(el) => (refs.current.segundoApellido = el)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="idUsuario" className="form-label">Cédula</label>
              <input
                id="idUsuario"
                name="idUsuario"
                type="text"
                inputMode="numeric"
                className="form-control"
                maxLength={20}
                placeholder="Número de cédula"
                value={datosUsuario.idUsuario}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'idUsuario')}
                ref={(el) => (refs.current.idUsuario = el)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="edad" className="form-label">Edad</label>
              <input
                id="edad"
                name="edad"
                type="number"
                className="form-control"
                min="16"
                max="32767"
                step="1"
                value={datosUsuario.edad}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'edad')}
                ref={(el) => (refs.current.edad = el)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="tipoOcupacion" className="form-label">Ocupación</label>
              <select
                id="tipoOcupacion"
                className="form-select"
                required
                value={tipoOcupacion}
                onChange={(evento) => setTipoOcupacion(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault();
                    refs.current[tipoOcupacion === 'otro' ? 'ocupacionOtro' : 'correo']?.focus();
                  }
                }}
                ref={(el) => (refs.current.tipoOcupacion = el)}
              >
                <option value="" disabled>Selecciona una ocupación</option>
                <option value="estudiante">Estudiante</option>
                <option value="profesor">Profesor</option>
                <option value="otro">Otro</option>
              </select>
              {tipoOcupacion === 'otro' && (
                <input
                  id="ocupacionOtro"
                  name="ocupacionOtro"
                  type="text"
                  className="form-control mt-2"
                  maxLength={50}
                  placeholder="Escribe tu ocupación"
                  value={ocupacionOtro}
                  onChange={(evento) => setOcupacionOtro(evento.target.value)}
                  onKeyDown={(evento) => manejarTeclado(evento, 'ocupacionOtro')}
                  ref={(el) => (refs.current.ocupacionOtro = el)}
                  required
                  aria-label="Especifica tu ocupación"
                />
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="correo" className="form-label">Correo Institucional</label>
              <input
                id="correo"
                name="correo"
                type="email"
                className="form-control"
                placeholder="✉ Sergio.Gomez@universidad.edu.co"
                pattern="[^\s@]+@[^\s@]+\.edu\.co"
                title="Usa un correo institucional que termine en .edu.co"
                maxLength={150}
                value={datosUsuario.correo}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, 'correo')}
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
                onKeyDown={(e) => manejarTeclado(e, 'contrasena')}
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
                onKeyDown={(e) => manejarTeclado(e, 'confirmar-contrasena')}
                ref={(el) => (refs.current['confirmar-contrasena'] = el)}
              />

              <button id="siguiente" type="button" className="btn btn-primary w-100 mt-5" onClick={manejarSiguiente} disabled={guardando}>
                {guardando ? 'Creando cuenta...' : 'Siguiente'}
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