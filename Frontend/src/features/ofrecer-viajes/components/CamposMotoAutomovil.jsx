// Campos adicionales para automóviles y motocicletas.
import CampoArchivo from "./CampoArchivo";

/**
 * Presenta los campos específicos y documentos de automóviles/motos.
 * @param {{tipo: string, vehiculo: object, onFieldChange: (campo: string, valor: string|File|null) => void, mostrarErroresRequeridos: boolean}} props Datos del formulario.
 * @returns Campos específicos para automóvil o moto.
 */
export default function CamposMotoAutomovil({
  tipo,
  vehiculo,
  onFieldChange,
  mostrarErroresRequeridos,
}) {
  return (
    <>
      {tipo === "Automovil" ? (
        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="numero-puertas">Número de puertas</label>
          <input
            className="form-control"
            id="numero-puertas"
            type="number"
            min="2"
            max="5"
            step="1"
            required
            value={vehiculo.numeroPuertas}
            onChange={(evento) => onFieldChange("numeroPuertas", evento.target.value)}
          />
        </div>
      ) : (
        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="modalidad-moto">Modalidad de la moto</label>
          <input
            className="form-control"
            id="modalidad-moto"
            type="text"
            maxLength={20}
            required
            value={vehiculo.modalidad}
            onChange={(evento) => onFieldChange("modalidad", evento.target.value)}
          />
        </div>
      )}

      <div className="registro-vehiculo__documentos">
        <CampoArchivo
          id="foto-placa"
          label="Foto de la placa"
          tipoArchivo="imagen"
          archivo={vehiculo.fotoPlaca}
          mostrarErrorRequerido={mostrarErroresRequeridos}
          onChange={(archivo) => onFieldChange("fotoPlaca", archivo)}
        />
        <CampoArchivo
          id="foto-licencia"
          label="Foto de la licencia"
          tipoArchivo="imagen"
          archivo={vehiculo.fotoLicencia}
          mostrarErrorRequerido={mostrarErroresRequeridos}
          onChange={(archivo) => onFieldChange("fotoLicencia", archivo)}
        />
        <CampoArchivo
          id="doc-tecnomecanica"
          label="Documento de tecnomecánica"
          tipoArchivo="pdf"
          archivo={vehiculo.docTecnomecanica}
          mostrarErrorRequerido={mostrarErroresRequeridos}
          onChange={(archivo) => onFieldChange("docTecnomecanica", archivo)}
        />
        <CampoArchivo
          id="doc-soat"
          label="SOAT"
          tipoArchivo="pdf"
          archivo={vehiculo.docSoat}
          mostrarErrorRequerido={mostrarErroresRequeridos}
          onChange={(archivo) => onFieldChange("docSoat", archivo)}
        />
      </div>
    </>
  );
}
