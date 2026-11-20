using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    /// <summary>Datos públicos de un viaje y del vehículo asociado.</summary>
    public sealed record ViajePublicoDTO(
        long IdViaje,
        int IdUsuario,
        long? IdRuta,
        string? Origen,
        string? Destino,
        string? PuntoEncuentro,
        string? InformacionAdicional,
        DateTime FechaHoraSalida,
        decimal Costo,
        int CuposDisponibles,
        string Estado,
        string PrimerNombre,
        string PrimerApellido,
        string NombreConductor,
        string? OcupacionConductor,
        string? TipoVehiculo,
        string? ModeloVehiculo,
        int? CapacidadVehiculo,
        short? NumeroPuertas,
        string? ModalidadMoto);

    public class ViajeDTO
    {
        public long IdViaje { get; set; }
        public int IdUsuario { get; set; }
        public long? IdRuta { get; set; }
        public string? Origen { get; set; }
        public string? Destino { get; set; }
        public string? PuntoEncuentro { get; set; }
        public string? InformacionAdicional { get; set; }
        public DateTime FechaHoraSalida { get; set; } 
        public decimal Costo { get; set; }
        public int CuposDisponibles { get; set; }
        public string Estado { get; set; } = string.Empty;
    }

    public class ViajeCreateDTO
    {
        [Range(1, int.MaxValue)]
        public int IdUsuario { get; set; }

        public long? IdRuta { get; set; }

        [StringLength(200)]
        public string? Origen { get; set; }

        [StringLength(200)]
        public string? Destino { get; set; }

        [StringLength(200)]
        public string? PuntoEncuentro { get; set; }

        [StringLength(500)]
        public string? InformacionAdicional { get; set; }

        [Required]
        public DateTime FechaHoraSalida { get; set; }

        [Range(0, 99999999.99)]
        [DataType(DataType.Currency)]
        public decimal Costo { get; set; }

        [Range(0, int.MaxValue)]
        public int CuposDisponibles { get; set; }

        [Required, StringLength(20)]
        public string Estado { get; set; } = string.Empty;
    }

    public class ReservaViajeCreateDTO
    {
        [Range(1, int.MaxValue)]
        public int IdPasajero { get; set; }
    }

    public class ReservaViajeDTO
    {
        public long IdReserva { get; set; }
        public long IdViaje { get; set; }
        public int IdPasajero { get; set; }
        public string? Origen { get; set; }
        public string? Destino { get; set; }
        public DateTime FechaHoraSalida { get; set; }
        public decimal Costo { get; set; }
        public string NombreConductor { get; set; } = string.Empty;
        public int IdUsuarioConductor { get; set; }
    }

    /// <summary>
    /// Viaje privado que un conductor atiende tras aceptar una solicitud, con los datos
    /// del pasajero que la pidió. Alimenta «En curso» del lado del conductor.
    /// </summary>
    public class ViajeConductorActivoDTO
    {
        public long IdViaje { get; set; }
        public long IdReserva { get; set; }
        public int IdPasajero { get; set; }
        public string NombrePasajero { get; set; } = string.Empty;
        public string? Origen { get; set; }
        public string? Destino { get; set; }
        public DateTime FechaHoraSalida { get; set; }
        public decimal Costo { get; set; }
    }
}