using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

/// <summary>
/// Recuperación de contraseña con código de seis dígitos enviado por Brevo.
/// El código solo se guarda como HMAC, vence, es de un solo uso y tiene un
/// máximo de intentos. Las respuestas no revelan si el correo existe.
/// </summary>
[Route("api/recuperacion")]
[ApiController]
public class RecuperacionController(
    AppDbContext context,
    IEnviadorCorreo enviadorCorreo,
    IPasswordHasher<Usuarios> passwordHasher,
    IConfiguration configuration,
    TimeProvider timeProvider,
    ILogger<RecuperacionController> logger) : ControllerBase
{
    public static readonly TimeSpan Vigencia = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan EsperaEntreEnvios = TimeSpan.FromSeconds(60);
    public const int MaximoIntentos = 5;

    private const string MensajeGenerico =
        "Si el correo está registrado, enviaremos un código de recuperación.";
    private const string ErrorCodigo = "El código es inválido o ha vencido. Solicita uno nuevo.";

    private static readonly Regex FormatoCorreo = new(
        @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    [HttpPost("solicitar")]
    [EnableRateLimiting("codigo-correo")]
    public async Task<IActionResult> Solicitar(
        SolicitarRecuperacionDTO solicitud,
        CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(solicitud.Correo);
        if (correo.Length > 150 || !FormatoCorreo.IsMatch(correo))
        {
            return BadRequest(new { error = "Ingresa un correo válido." });
        }

        var clave = ObtenerClave();
        if (clave is null)
        {
            logger.LogError("Jwt:Clave no está configurada; no se puede firmar la recuperación.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "La recuperación de contraseña no está configurada."
            });
        }

        var usuario = await context.Usuarios.FirstOrDefaultAsync(
            u => u.Correo.ToLower() == correo,
            cancellationToken);
        if (usuario is null)
        {
            return Ok(new { mensaje = MensajeGenerico });
        }

        var ahora = timeProvider.GetUtcNow().UtcDateTime;
        if (usuario.CodigoRecuperacionEnviado is { } ultimo &&
            ahora - ultimo < EsperaEntreEnvios)
        {
            return Ok(new { mensaje = MensajeGenerico });
        }

        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        usuario.CodigoRecuperacionHash = CalcularHash(clave, correo, codigo);
        usuario.CodigoRecuperacionVence = ahora.Add(Vigencia);
        usuario.CodigoRecuperacionIntentos = 0;
        usuario.CodigoRecuperacionEnviado = ahora;
        await context.SaveChangesAsync(cancellationToken);

        try
        {
            await enviadorCorreo.EnviarCodigoRecuperacionAsync(correo, codigo, cancellationToken);
        }
        catch (Exception error) when (error is not OperationCanceledException)
        {
            // Sin revelar el fallo al cliente: de lo contrario distinguiría cuentas.
            logger.LogError(error, "No se pudo enviar el código de recuperación.");
        }

        return Ok(new { mensaje = MensajeGenerico });
    }

    [HttpPost("restablecer")]
    [EnableRateLimiting("verificar-codigo")]
    public async Task<IActionResult> Restablecer(
        RestablecerContrasenaDTO solicitud,
        CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(solicitud.Correo);
        if (correo.Length > 150 || !FormatoCorreo.IsMatch(correo))
        {
            return BadRequest(new { error = ErrorCodigo });
        }

        // Misma política que el registro: entre 8 y 72 bytes (límite de bcrypt/Identity).
        var bytes = Encoding.UTF8.GetByteCount(solicitud.NuevaContrasena);
        if (solicitud.NuevaContrasena.Length < 8 || bytes > 72)
        {
            return BadRequest(new { error = "La contraseña debe tener entre 8 y 72 bytes." });
        }

        var clave = ObtenerClave();
        if (clave is null)
        {
            logger.LogError("Jwt:Clave no está configurada; no se puede verificar la recuperación.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "La recuperación de contraseña no está configurada."
            });
        }

        var usuario = await context.Usuarios.FirstOrDefaultAsync(
            u => u.Correo.ToLower() == correo,
            cancellationToken);
        var ahora = timeProvider.GetUtcNow().UtcDateTime;
        if (usuario?.CodigoRecuperacionHash is null ||
            usuario.CodigoRecuperacionVence is not { } vence ||
            vence <= ahora ||
            usuario.CodigoRecuperacionIntentos >= MaximoIntentos)
        {
            return BadRequest(new { error = ErrorCodigo });
        }

        var esperado = Encoding.ASCII.GetBytes(usuario.CodigoRecuperacionHash);
        var recibido = Encoding.ASCII.GetBytes(CalcularHash(clave, correo, solicitud.Codigo));
        if (esperado.Length != recibido.Length ||
            !CryptographicOperations.FixedTimeEquals(esperado, recibido))
        {
            usuario.CodigoRecuperacionIntentos++;
            if (usuario.CodigoRecuperacionIntentos >= MaximoIntentos)
            {
                LimpiarCodigo(usuario);
            }
            await context.SaveChangesAsync(cancellationToken);
            return BadRequest(new { error = ErrorCodigo });
        }

        usuario.Contrasena = passwordHasher.HashPassword(usuario, solicitud.NuevaContrasena);
        LimpiarCodigo(usuario);
        await context.SaveChangesAsync(cancellationToken);

        return Ok(new { mensaje = "Contraseña actualizada correctamente." });
    }

    private static void LimpiarCodigo(Usuarios usuario)
    {
        usuario.CodigoRecuperacionHash = null;
        usuario.CodigoRecuperacionVence = null;
        usuario.CodigoRecuperacionIntentos = 0;
    }

    private byte[]? ObtenerClave()
    {
        var secreto = configuration["Jwt:Clave"];
        return string.IsNullOrWhiteSpace(secreto)
            ? null
            : SHA256.HashData(Encoding.UTF8.GetBytes($"cozymov-recuperacion|{secreto}"));
    }

    private static string CalcularHash(byte[] clave, string correo, string codigo) =>
        Convert.ToHexString(
            HMACSHA256.HashData(clave, Encoding.UTF8.GetBytes($"{correo}|{codigo}")));

    private static string NormalizarCorreo(string? correo) =>
        string.Concat((correo ?? string.Empty).Where(c => !char.IsWhiteSpace(c)))
            .ToLowerInvariant();
}
