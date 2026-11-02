// Agrupa los campos necesarios para publicar un viaje.

import CamposRutaHorario from "./CamposRutaHorario";
import DetallesViaje from "./DetallesViaje";

/**
 * Presenta el formulario completo de publicación del viaje.
 * @param {object} props Valores del formulario y acción de envío.
 * @returns Formulario visual para publicar un viaje.
 */
export default function FormularioPublicarViaje({
  origen,
  setOrigen,
  destino,
  setDestino,
  puntoEncuentro,
  setPuntoEncuentro,
  precioPasaje,
  setPrecioPasaje,
  cuposDisponibles,
  setCuposDisponibles,
  informacionAdicional,
  setInformacionAdicional,
  fechaSalida,
  setFechaSalida,
  horaSalida,
  setHoraSalida,
  atajoSalida,
  setAtajoSalida,
  errorPublicacion,
  setErrorPublicacion,
  onSubmit,
}) {
  return (
    <section className="card color-card mx-auto w-100" style={{ maxWidth: 720 }}>
      <form className="card-body p-4 p-md-5" onSubmit={onSubmit}>
        <CamposRutaHorario
          origen={origen}
          setOrigen={setOrigen}
          destino={destino}
          setDestino={setDestino}
          fechaSalida={fechaSalida}
          setFechaSalida={setFechaSalida}
          horaSalida={horaSalida}
          setHoraSalida={setHoraSalida}
          atajoSalida={atajoSalida}
          setAtajoSalida={setAtajoSalida}
          setErrorPublicacion={setErrorPublicacion}
        />
        <DetallesViaje
          precioPasaje={precioPasaje}
          setPrecioPasaje={setPrecioPasaje}
          cuposDisponibles={cuposDisponibles}
          setCuposDisponibles={setCuposDisponibles}
          puntoEncuentro={puntoEncuentro}
          setPuntoEncuentro={setPuntoEncuentro}
          informacionAdicional={informacionAdicional}
          setInformacionAdicional={setInformacionAdicional}
          setErrorPublicacion={setErrorPublicacion}
        />

        {errorPublicacion && (
          <p className="small text-danger mb-3" role="alert">
            {errorPublicacion}
          </p>
        )}

        <div className="d-flex justify-content-end">
          <button type="submit" className="btn btn-primary fw-bold px-4">
            Publicar viaje
          </button>
        </div>
      </form>
    </section>
  );
}
