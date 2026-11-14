using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace Backend.Services;

public sealed class VerificadorCorreoHmac : IVerificadorCorreo
{
    private static readonly TimeSpan DuracionComprobante = TimeSpan.FromMinutes(10);
    private readonly byte[] _claveFirma;
    private readonly TimeProvider _timeProvider;

    public VerificadorCorreoHmac(IConfiguration configuration, TimeProvider timeProvider)
    {
        var secreto = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(secreto))
        {
            secreto = configuration["INTERNAL_API_KEY"];
        }

        if (string.IsNullOrWhiteSpace(secreto))
        {
            throw new InvalidOperationException(
                "Se requiere Jwt:Key o INTERNAL_API_KEY para firmar la verificación del correo.");
        }

        _claveFirma = SHA256.HashData(
            Encoding.UTF8.GetBytes($"verificacion-correo|{secreto}"));
        _timeProvider = timeProvider;
    }

    public ComprobanteCorreo CrearComprobante(string correo, string codigo)
    {
        var correoNormalizado = NormalizarCorreo(correo);
        var vence = _timeProvider.GetUtcNow().Add(DuracionComprobante);
        var venceUnix = vence.ToUnixTimeSeconds();
        var firma = Firmar(correoNormalizado, codigo, venceUnix);
        var contenido = JsonSerializer.SerializeToUtf8Bytes(
            new DatosComprobante(correoNormalizado, venceUnix, WebEncoders.Base64UrlEncode(firma)));

        return new ComprobanteCorreo(WebEncoders.Base64UrlEncode(contenido), vence);
    }

    public ResultadoVerificacionCorreo Verificar(
        string correo,
        string comprobante,
        string codigo)
    {
        var codigoNormalizado = codigo.Trim();
        if (!System.Text.RegularExpressions.Regex.IsMatch(codigoNormalizado, @"^\d{6}$"))
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El código debe tener exactamente 6 dígitos.");
        }

        DatosComprobante? datos;
        try
        {
            if (string.IsNullOrWhiteSpace(comprobante) || comprobante.Length > 4096)
            {
                return ResultadoVerificacionCorreo.Invalido(
                    "El comprobante no es válido.");
            }

            datos = JsonSerializer.Deserialize<DatosComprobante>(
                WebEncoders.Base64UrlDecode(comprobante));
        }
        catch (Exception error) when (
            error is FormatException or JsonException or ArgumentException)
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El comprobante no es válido.");
        }

        if (datos is null ||
            string.IsNullOrWhiteSpace(datos.Correo) ||
            datos.Vence <= 0 ||
            string.IsNullOrWhiteSpace(datos.Firma))
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El comprobante no es válido.");
        }

        byte[] firmaRecibida;
        try
        {
            firmaRecibida = WebEncoders.Base64UrlDecode(datos.Firma);
        }
        catch (FormatException)
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El comprobante no es válido.");
        }

        var correoComprobante = NormalizarCorreo(datos.Correo);
        var firmaEsperada = Firmar(correoComprobante, codigoNormalizado, datos.Vence);
        if (!CryptographicOperations.FixedTimeEquals(firmaEsperada, firmaRecibida))
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El código es incorrecto o el comprobante no es válido.");
        }

        if (!string.Equals(datos.Correo, correoComprobante, StringComparison.Ordinal))
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El comprobante no es válido.");
        }

        if (!string.Equals(
                NormalizarCorreo(correo),
                correoComprobante,
                StringComparison.Ordinal))
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El código fue enviado a otro correo.");
        }

        if (_timeProvider.GetUtcNow().ToUnixTimeSeconds() >= datos.Vence)
        {
            return ResultadoVerificacionCorreo.Invalido(
                "El código venció. Solicita uno nuevo.");
        }

        return ResultadoVerificacionCorreo.Valido();
    }

    private byte[] Firmar(string correo, string codigo, long vence)
    {
        var mensaje = Encoding.UTF8.GetBytes(
            $"{correo}|{codigo}|{vence.ToString(System.Globalization.CultureInfo.InvariantCulture)}");
        return HMACSHA256.HashData(_claveFirma, mensaje);
    }

    private static string NormalizarCorreo(string correo) =>
        correo.Trim().ToLowerInvariant();

    private sealed record DatosComprobante(string Correo, long Vence, string Firma);
}
