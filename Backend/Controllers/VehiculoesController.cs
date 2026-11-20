using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/vehiculos")]
[ApiController]
public class VehiculoesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VehiculoResponseDto>>> GetVehiculos()
    {
        var vehiculos = await context.Vehiculos
            .ToListAsync();

        return vehiculos.Select(ToResponseDto).ToList();
    }

    [HttpGet("{idVehiculo:long}")]
    public async Task<ActionResult<VehiculoResponseDto>> GetVehiculo(long idVehiculo)
    {
        var vehiculo = await context.Vehiculos
            .FirstOrDefaultAsync(v => v.IdVehiculo == idVehiculo);

        return vehiculo is null ? NotFound() : ToResponseDto(vehiculo);
    }

    /// <summary>
    /// Registra un vehículo con sus archivos (multipart/form-data). Los campos
    /// obligatorios dependen del tipo; ver VehiculoRegistroService.
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ValidadorArchivos.MaxBytesSolicitud)]
    public async Task<ActionResult<VehiculoResponseDto>> PostVehiculo(
        [FromForm] VehiculoCreateDto dto,
        [FromServices] VehiculoRegistroService registro,
        CancellationToken cancellationToken)
    {
        ResultadoRegistroVehiculo resultado;
        try
        {
            resultado = await registro.RegistrarAsync(dto, cancellationToken);
        }
        catch (AlmacenNoConfiguradoException)
        {
            return Problem(
                "El almacenamiento de archivos no está configurado.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        switch (resultado.Estado)
        {
            case EstadoRegistroVehiculo.Creado:
                var respuesta = ToResponseDto(resultado.Vehiculo!);
                return CreatedAtAction(nameof(GetVehiculo), new { idVehiculo = respuesta.IdVehiculo }, respuesta);
            case EstadoRegistroVehiculo.Conflicto:
                return Conflict(new { error = resultado.Mensaje });
            default:
                return ValidationProblem(new ValidationProblemDetails(
                    resultado.Errores!.ToDictionary(e => e.Key, e => e.Value)));
        }
    }

    [HttpPut("{idVehiculo:long}")]
    public async Task<IActionResult> PutVehiculo(long idVehiculo, VehiculoUpdateDto dto)
    {
        var vehiculo = await context.Vehiculos
            .FirstOrDefaultAsync(v => v.IdVehiculo == idVehiculo);
        if (vehiculo is null)
        {
            return NotFound();
        }

        // El tipo define qué tabla de detalle aplica; cambiarlo dejaría datos incompatibles.
        if (TiposVehiculo.Normalizar(vehiculo.Tipo) != TiposVehiculo.Normalizar(dto.Tipo))
        {
            return BadRequest("No se puede cambiar el tipo de un vehículo existente.");
        }

        if (string.IsNullOrWhiteSpace(dto.Modelo) || dto.Capacidad < 1)
        {
            return BadRequest("El modelo y la capacidad son obligatorios.");
        }

        if (vehiculo is Automovil automovil && dto.NumeroPuertas is { } puertas)
        {
            if (puertas is < 2 or > 5)
            {
                return BadRequest("El número de puertas debe estar entre 2 y 5.");
            }
            automovil.NumeroPuertas = puertas;
        }

        if (vehiculo is Moto moto && !string.IsNullOrWhiteSpace(dto.Modalidad))
        {
            if (dto.Modalidad.Length > 20)
            {
                return BadRequest("La modalidad admite máximo 20 caracteres.");
            }
            moto.Modalidad = dto.Modalidad;
        }

        // IdUsuario no se toca: la propiedad no se puede reasignar.
        vehiculo.Modelo = dto.Modelo;
        vehiculo.Capacidad = dto.Capacidad;
        vehiculo.Foto = dto.Foto;

        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idVehiculo:long}")]
    public async Task<IActionResult> DeleteVehiculo(long idVehiculo)
    {
        var vehiculo = await context.Vehiculos.FindAsync(idVehiculo);
        if (vehiculo is null)
        {
            return NotFound();
        }

        context.Vehiculos.Remove(vehiculo);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private static VehiculoResponseDto ToResponseDto(Vehiculo vehiculo) => new()
    {
        IdVehiculo = vehiculo.IdVehiculo,
        Tipo = vehiculo.Tipo,
        Marca = vehiculo.Marca,
        Modelo = vehiculo.Modelo,
        Capacidad = vehiculo.Capacidad,
        Foto = vehiculo.Foto,
        FotoFrontal = vehiculo.FotoFrontal,
        FotoLateral = vehiculo.FotoLateral,
        FotoPerfil = vehiculo.FotoPerfil,
        IdUsuario = vehiculo.IdUsuario,
        Automovil = vehiculo is Automovil automovil
            ? new AutomovilResponseDto
            {
                NumeroPuertas = automovil.NumeroPuertas,
                FotoPlaca = automovil.FotoPlaca,
                FotoLicencia = automovil.FotoLicencia,
                DocTecnomecanica = automovil.DocTecnomecanica,
                DocSoat = automovil.DocSoat
            }
            : null,
        Moto = vehiculo is Moto moto
            ? new MotoResponseDto
            {
                Modalidad = moto.Modalidad,
                FotoPlaca = moto.FotoPlaca,
                FotoLicencia = moto.FotoLicencia,
                DocTecnomecanica = moto.DocTecnomecanica,
                DocSoat = moto.DocSoat
            }
            : null,
        BicicletaElectrica = vehiculo is BicicletaElectrica bicicleta
            ? new BicicletaElectricaResponseDto
            {
                NumeroSerie = bicicleta.NumeroSerie,
                VelocidadMaxima = bicicleta.VelocidadMaxima,
                CapacidadPeso = bicicleta.CapacidadPeso,
                CapacidadVehicular = bicicleta.CapacidadVehicular,
                Casco = bicicleta.Casco,
                Chaleco = bicicleta.Chaleco,
                Luces = bicicleta.Luces
            }
            : null
    };
}
