using Microsoft.AspNetCore.Http;

namespace Backend.Services;

public enum ClaseArchivo
{
    Imagen,
    Pdf
}

public sealed record ArchivoValidado(string Extension, string ContentType);

/// <summary>
/// Valida archivos subidos comprobando su contenido real (firma binaria), no la
/// extensión ni el Content-Type que declara el cliente.
/// </summary>
public static class ValidadorArchivos
{
    public const long MaxBytes = 5 * 1024 * 1024;

    /// <summary>Máximo de archivos por registro: 3 fotos + placa + licencia + tecnomecánica + SOAT.</summary>
    public const int MaxArchivosPorRegistro = 7;

    /// <summary>Tope del cuerpo de la solicitud (archivos + campos de texto).</summary>
    public const long MaxBytesSolicitud = MaxArchivosPorRegistro * MaxBytes + 1024 * 1024;

    private const int BytesCabecera = 12;

    /// <returns>El archivo validado, o null con el motivo en <paramref name="error"/>.</returns>
    public static async Task<ArchivoValidado?> ValidarAsync(
        IFormFile archivo,
        ClaseArchivo clase,
        CancellationToken cancellationToken,
        Action<string> error)
    {
        if (archivo.Length == 0)
        {
            error("El archivo está vacío.");
            return null;
        }
        if (archivo.Length > MaxBytes)
        {
            error($"El archivo supera el máximo de {MaxBytes / (1024 * 1024)} MB.");
            return null;
        }

        var cabecera = new byte[BytesCabecera];
        int leidos;
        await using (var flujo = archivo.OpenReadStream())
        {
            leidos = await ReadAtLeastAsync(flujo, cabecera, cancellationToken);
        }

        var detectado = Detectar(cabecera.AsSpan(0, leidos));
        if (detectado is null)
        {
            error(clase == ClaseArchivo.Imagen
                ? "El archivo debe ser una imagen JPG, PNG o WEBP."
                : "El archivo debe ser un PDF.");
            return null;
        }

        var esPdf = detectado.ContentType == "application/pdf";
        if (esPdf != (clase == ClaseArchivo.Pdf))
        {
            error(clase == ClaseArchivo.Imagen
                ? "El archivo debe ser una imagen JPG, PNG o WEBP."
                : "El archivo debe ser un PDF.");
            return null;
        }

        return detectado;
    }

    /// <summary>Identifica el formato por su firma binaria.</summary>
    public static ArchivoValidado? Detectar(ReadOnlySpan<byte> cabecera)
    {
        if (cabecera.Length >= 3 && cabecera[0] == 0xFF && cabecera[1] == 0xD8 && cabecera[2] == 0xFF)
        {
            return new ArchivoValidado("jpg", "image/jpeg");
        }
        if (cabecera.Length >= 8 && cabecera[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return new ArchivoValidado("png", "image/png");
        }
        if (cabecera.Length >= 12
            && cabecera[..4].SequenceEqual("RIFF"u8)
            && cabecera[8..12].SequenceEqual("WEBP"u8))
        {
            return new ArchivoValidado("webp", "image/webp");
        }
        if (cabecera.Length >= 5 && cabecera[..5].SequenceEqual("%PDF-"u8))
        {
            return new ArchivoValidado("pdf", "application/pdf");
        }
        return null;
    }

    private static async Task<int> ReadAtLeastAsync(Stream flujo, byte[] buffer, CancellationToken cancellationToken)
    {
        var total = 0;
        while (total < buffer.Length)
        {
            var n = await flujo.ReadAsync(buffer.AsMemory(total), cancellationToken);
            if (n == 0)
            {
                break;
            }
            total += n;
        }
        return total;
    }
}
