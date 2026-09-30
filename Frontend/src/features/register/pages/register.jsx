"use client";
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './register.css';

const CAMPOS = ['nombre', 'apellido', 'documento', 'numero', 'correo', 'contrasena', 'confirmar-contrasena'];

function Register() {
  const router = useRouter();
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
    router.push('/');
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <h1>Crear cuenta</h1>

        <input
          id="nombre"
          name="nombre"
          placeholder="Nombre"
          value={datosUsuario.nombre}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, 0)}
          ref={(el) => (refs.current.nombre = el)}
        />

        <input
          id="apellido"
          name="apellido"
          placeholder="Apellido"
          value={datosUsuario.apellido}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, 1)}
          ref={(el) => (refs.current.apellido = el)}
        />

        <input
          id="documento"
          name="documento"
          placeholder="Documento"
          value={datosUsuario.documento}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, 2)}
          ref={(el) => (refs.current.documento = el)}
        />

        <input
          id="numero"
          name="numero"
          placeholder="Número de teléfono"
          value={datosUsuario.numero}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, 3)}
          ref={(el) => (refs.current.numero = el)}
        />

        <input
          id="correo"
          name="correo"
          type="email"
          placeholder="Correo institucional"
          value={datosUsuario.correo}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, 4)}
          ref={(el) => (refs.current.correo = el)}
        />

        <input
          id="contrasena"
          name="contrasena"
          type="password"
          placeholder="Contraseña"
          value={datosUsuario.contrasena}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, 5)}
          ref={(el) => (refs.current.contrasena = el)}
        />

        <input
          id="confirmar-contrasena"
          name="confirmar-contrasena"
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmarContrasena}
          onChange={(e) => setConfirmarContrasena(e.target.value)}
          onKeyDown={(e) => manejarTeclado(e, 6)}
          ref={(el) => (refs.current['confirmar-contrasena'] = el)}
        />

        <button id="siguiente" type="button" onClick={manejarSiguiente}>
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default Register;