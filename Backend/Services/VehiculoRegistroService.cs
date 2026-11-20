using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Backend.Services;

public enum EstadoRegistroVehiculo
{
    Creado,
    Invalido,
    Conflicto
}

public sealed record ResultadoRegistroVehiculo(
    EstadoRegistroVehiculo Estado,
    Vehiculo? Vehiculo = null,
    IReadOnlyDictionary<string, string[]>? Errores = null,
    string? Mensaje = null);

/// <summary>
/// Valida y registra un vehículo con los archivos de su tipo. Vehículo y subtipo se
/// guardan en un único SaveChanges (una transacción); si algo falla, se borran los
/// archivos que ya se habían subido.
/// </summary>
public sealed class VehiculoRegistroService(
    AppDbContext db,
    IAlmacenArchivos almacen,
    ILogger<VehiculoRegistroService> logger)
{
    private const string MensajeSerieDuplicada = "Ya existe una bicicleta registrada con ese número de serie.";

    public async Task<ResultadoRegistroVehiculo> RegistrarAsync(VehiculoCreateDto dto, CancellationToken cancellationToken)
    {
        var errores = new Dictionary<string, List<string>>();
        void Error(string campo, string mensaje)
        {
            if (!errores.TryGetValue(campo, out var lista))
            {
                errores[campo] = lista = [];
            }
            lista.Add(mensaje);
        }

        var tipo = TiposVehiculo.Normalizar(dto.Tipo);
        if (tipo is null)
        {
            Error("tipo", "El tipo debe ser automovil, moto o bicicleta_electrica.");
        }

        if (dto.IdUsuario is null or < 1)
        {
            Error("idUsuario", "El usuario es obligatorio.");
        }
        else if (!await db.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario, cancellationToken))
        {
            Error("idUsuario", $"El usuario {dto.IdUsuario} no existe.");
        }

        var marca = dto.Marca?.Trim();
        var modelo = dto.Modelo?.Trim();
        if (string.IsNullOrEmpty(marca)) Error("marca", "La marca es obligatoria.");
        else if (marca.Length > 100) Error("marca", "La marca admite máximo 100 caracteres.");
        if (string.IsNullOrEmpty(modelo)) Error("modelo", "El modelo es obligatorio.");
        else if (modelo.Length > 50) Error("modelo", "El modelo admite máximo 50 caracteres.");
        if (dto.Capacidad is null or < 1 or > 32767) Error("capacidad", "La capacidad debe estar entre 1 y 32767.");

        // Archivos: nombre del campo -> (archivo, clase, obligatorio según el tipo).
        var archivos = new (string Campo, IFormFile? Archivo, ClaseArchivo Clase, bool Aplica)[]
        {
            ("fotoFrontal", dto.FotoFrontal, ClaseArchivo.Imagen, true),
            ("fotoLateral", dto.FotoLateral, ClaseArchivo.Imagen, true),
            ("fotoPerfil", dto.FotoPerfil, ClaseArchivo.Imagen, true),
            ("fotoPlaca", dto.FotoPlaca, ClaseArchivo.Imagen, tipo is TiposVehiculo.Automovil or TiposVehiculo.Moto),
            ("fotoLicencia", dto.FotoLicencia, ClaseArchivo.Imagen, tipo is TiposVehiculo.Automovil or TiposVehiculo.Moto),
            ("docTecnomecanica", dto.DocTecnomecanica, ClaseArchivo.Pdf, tipo is TiposVehiculo.Automovil or TiposVehiculo.Moto),
            ("docSoat", dto.DocSoat, ClaseArchivo.Pdf, tipo is TiposVehiculo.Automovil or TiposVehiculo.Moto),
        };

        // Campos que solo corresponden a un tipo: si llegan con otro, se rechazan.
        var propios = new (string Campo, bool Presente, string? Tipo)[]
        {
            ("numeroPuertas", dto.NumeroPuertas is not null, TiposVehiculo.Automovil),
            ("modalidad", dto.Modalidad is not null, TiposVehiculo.Moto),
            ("numeroSerie", dto.NumeroSerie is not null, TiposVehiculo.BicicletaElectrica),
            ("velocidadMaxima", dto.VelocidadMaxima is not null, TiposVehiculo.BicicletaElectrica),
            ("capacidadPeso", dto.CapacidadPeso is not null, TiposVehiculo.BicicletaElectrica),
            ("capacidadVehicular", dto.CapacidadVehicular is not null, TiposVehiculo.BicicletaElectrica),
            ("casco", dto.Casco is not null, TiposVehiculo.BicicletaElectrica),
            ("chaleco", dto.Chaleco is not null, TiposVehiculo.BicicletaElectrica),
            ("luces", dto.Luces is not null, TiposVehiculo.BicicletaElectrica),
        };

        if (tipo is not null)
        {
            foreach (var (campo, presente, tipoDueno) in propios)
            {
                if (presente && tipoDueno != tipo)
                {
                    Error(campo, $"El campo no corresponde a un vehículo de tipo {tipo}.");
                }
            }
            foreach (var (campo, archivo, _, aplica) in archivos)
            {
                if (archivo is not null && !aplica)
                {
                    Error(campo, $"El archivo no corresponde a un vehículo de tipo {tipo}.");
                }
            }
        }

        var validados = new Dictionary<string, (IFormFile Archivo, ArchivoValidado Info)>();
        foreach (var (campo, archivo, clase, aplica) in archivos)
        {
            if (!aplica)
            {
                continue;
            }
            if (archivo is null)
            {
                Error(campo, "El archivo es obligatorio.");
                continue;
            }
            var info = await ValidadorArchivos.ValidarAsync(archivo, clase, cancellationToken, m => Error(campo, m));
            if (info is not null)
            {
                validados[campo] = (archivo, info);
            }
        }

        string? numeroSerie = null;
        switch (tipo)
        {
            case TiposVehiculo.Automovil:
                if (dto.NumeroPuertas is not (>= 2 and <= 5)) Error("numeroPuertas", "El número de puertas debe estar entre 2 y 5.");
                break;
            case TiposVehiculo.Moto:
                if (string.IsNullOrWhiteSpace(dto.Modalidad)) Error("modalidad", "La modalidad es obligatoria.");
                else if (dto.Modalidad.Trim().Length > 20) Error("modalidad", "La modalidad admite máximo 20 caracteres.");
                break;
            case TiposVehiculo.BicicletaElectrica:
                numeroSerie = dto.NumeroSerie?.Trim();
                if (string.IsNullOrEmpty(numeroSerie)) Error("numeroSerie", "El número de serie es obligatorio.");
                else if (numeroSerie.Length > 100) Error("numeroSerie", "El número de serie admite máximo 100 caracteres.");
                if (dto.VelocidadMaxima is not (> 0 and <= 999.99m)) Error("velocidadMaxima", "La velocidad máxima debe ser mayor que 0 y de máximo 999.99.");
                if (dto.CapacidadPeso is not (> 0 and <= 9999.99m)) Error("capacidadPeso", "La capacidad de peso debe ser mayor que 0 y de máximo 9999.99.");
                break;
        }

        if (errores.Count > 0)
        {
            return Invalido(errores);
        }

        if (tipo == TiposVehiculo.BicicletaElectrica
            && await db.BicicletasElectricas.AnyAsync(b => b.NumeroSerie == numeroSerie, cancellationToken))
        {
            return new ResultadoRegistroVehiculo(EstadoRegistroVehiculo.Conflicto, Mensaje: MensajeSerieDuplicada);
        }

        var subidos = new List<string>();
        try
        {
            var carpeta = $"vehiculos/{dto.IdUsuario}/{Guid.NewGuid():N}";
            var rutas = new Dictionary<string, string>();
            foreach (var (campo, (archivo, info)) in validados)
            {
                await using var flujo = archivo.OpenReadStream();
                var ruta = $"{carpeta}/{campo}.{info.Extension}";
                await almacen.SubirAsync(ruta, flujo, info.ContentType, cancellationToken);
                subidos.Add(ruta);
                rutas[campo] = ruta;
            }

            string? Ruta(string campo) => rutas.GetValueOrDefault(campo);

            Vehiculo vehiculo = tipo switch
            {
                TiposVehiculo.Automovil => new Automovil
                {
                    NumeroPuertas = dto.NumeroPuertas!.Value,
                    FotoPlaca = Ruta("fotoPlaca"),
                    FotoLicencia = Ruta("fotoLicencia"),
                    DocTecnomecanica = Ruta("docTecnomecanica"),
                    DocSoat = Ruta("docSoat"),
                },
                TiposVehiculo.Moto => new Moto
                {
                    Modalidad = dto.Modalidad!.Trim(),
                    FotoPlaca = Ruta("fotoPlaca"),
                    FotoLicencia = Ruta("fotoLicencia"),
                    DocTecnomecanica = Ruta("docTecnomecanica"),
                    DocSoat = Ruta("docSoat"),
                },
                _ => new BicicletaElectrica
                {
                    NumeroSerie = numeroSerie,
                    VelocidadMaxima = dto.VelocidadMaxima,
                    CapacidadPeso = dto.CapacidadPeso,
                    CapacidadVehicular = dto.CapacidadVehicular ?? false,
                    Casco = dto.Casco ?? false,
                    Chaleco = dto.Chaleco ?? false,
                    Luces = dto.Luces ?? false,
                },
            };

            vehiculo.Tipo = tipo!;
            vehiculo.Marca = marca;
            vehiculo.Modelo = modelo!;
            vehiculo.Capacidad = dto.Capacidad!.Value;
            vehiculo.IdUsuario = dto.IdUsuario!.Value;
            vehiculo.FotoFrontal = Ruta("fotoFrontal");
            vehiculo.FotoLateral = Ruta("fotoLateral");
            vehiculo.FotoPerfil = Ruta("fotoPerfil");

            db.Vehiculos.Add(vehiculo);
            await db.SaveChangesAsync(cancellationToken);
            return new ResultadoRegistroVehiculo(EstadoRegistroVehiculo.Creado, vehiculo);
        }
        catch (Exception ex)
        {
            await LimpiarAsync(subidos);
            if (ex is DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } })
            {
                return new ResultadoRegistroVehiculo(EstadoRegistroVehiculo.Conflicto, Mensaje: MensajeSerieDuplicada);
            }
            throw;
        }
    }

    private async Task LimpiarAsync(List<string> rutas)
    {
        if (rutas.Count == 0)
        {
            return;
        }
        try
        {
            await almacen.EliminarAsync(rutas, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudieron borrar los archivos huérfanos: {Rutas}", string.Join(", ", rutas));
        }
    }

    private static ResultadoRegistroVehiculo Invalido(Dictionary<string, List<string>> errores) =>
        new(EstadoRegistroVehiculo.Invalido,
            Errores: errores.ToDictionary(e => e.Key, e => e.Value.ToArray()));
}
