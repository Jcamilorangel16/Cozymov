using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

/// <summary>
/// Gestiona la confirmación del correo institucional antes de crear la cuenta.
/// El usuario no se guarda en la tabla Usuarios hasta que el código es válido.
/// </summary>
[Route("api/registro")]
[ApiController]
public class RegistroController(
    AppDbContext context,
    IEmailSender emailSender,
    IPasswordHasher<RegistroPendiente> codigoHasher,
    IHostEnvironment entorno,
    ILogger<RegistroController> logger) : ControllerBase
{
    private const int MinutosVigenciaCodigo = 10;
    private const int SegundosEntreEnvios = 60;
    private const int MaxEnviosPorHora = 5;
    private const int MaxIntentosCodigo = 5;
    private const int MinutosVigenciaToken = 30;

    private static readonly Regex FormatoCorreo = new(
        @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Genera un código de 6 dígitos y lo envía al correo institucional.
    /// </summary>
    [HttpPost("solicitar-codigo")]
    public async Task<IActionResult> SolicitarCodigo(
        SolicitarCodigoRegistroDTO solicitud,
        CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(solicitud.Correo);
        if (!EsCorreoPermitido(correo))
        {
            return BadRequest(new
            {
                error = "Ingresa un correo institucional válido que termine en .edu.co."
            });
        }

        if (await context.Usuarios.AnyAsync(
                usuario => usuario.Correo.ToLower() == correo,
                cancellationToken))
        {
            return Conflict(new
            {
                error = "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña."
            });
        }

        var ahora = DateTime.UtcNow;
        var pendiente = await context.RegistrosPendientes
            .FirstOrDefaultAsync(registro => registro.Correo == correo, cancellationToken);

        if (pendiente is not null)
        {
            var espera = SegundosEntreEnvios - (ahora - pendiente.UltimoEnvioEn).TotalSeconds;
            if (espera > 0)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    error = "Espera unos segundos antes de pedir otro código.",
                    reintentarEnSegundos = (int)Math.Ceiling(espera)
                });
            }

            if (pendiente.PrimerEnvioEn > ahora.AddHours(-1) &&
                pendiente.Envios >= MaxEnviosPorHora)
            {
                var esperaHora = Math.Max(
                    1,
                    Math.Ceiling((pendiente.PrimerEnvioEn.AddHours(1) - ahora).TotalSeconds));
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    error = "Has solicitado demasiados códigos. Intenta más tarde.",
                    reintentarEnSegundos = (int)esperaHora
                });
            }
        }

        var codigo = GenerarCodigo();
        var codigoHash = codigoHasher.HashPassword(
            pendiente ?? new RegistroPendiente(),
            codigo);

        if (pendiente is null)
        {
            pendiente = new RegistroPendiente
            {
                Correo = correo,
                CreadoEn = ahora,
                PrimerEnvioEn = ahora,
                Envios = 1
            };
            context.RegistrosPendientes.Add(pendiente);
        }
        else
        {
            if (pendiente.PrimerEnvioEn <= ahora.AddHours(-1))
            {
                pendiente.PrimerEnvioEn = ahora;
                pendiente.Envios = 1;
            }
            else
            {
                pendiente.Envios++;
            }
        }

        pendiente.CodigoHash = codigoHash;
        pendiente.CodigoExpiraEn = ahora.AddMinutes(MinutosVigenciaCodigo);
        pendiente.Intentos = 0;
        pendiente.UltimoEnvioEn = ahora;
        pendiente.VerificadoEn = null;
        pendiente.TokenHash = null;
        pendiente.TokenExpiraEn = null;

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (pendiente.IdRegistroPendiente == 0)
        {
            // Otra solicitud simultánea creó el registro primero.
            context.Entry(pendiente).State = EntityState.Detached;
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                error = "Ya se envió un código hace un momento. Espera antes de pedir otro.",
                reintentarEnSegundos = SegundosEntreEnvios
            });
        }

        try
        {
            await emailSender.EnviarCodigoVerificacionAsync(correo, codigo, cancellationToken);
        }
        catch (InvalidOperationException errorConfiguracion)
        {
            logger.LogError(errorConfiguracion, "SMTP no configurado al enviar el código de registro.");
            await InvalidarCodigoAsync(pendiente, cancellationToken);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "El envío de correos no está configurado. Contacta al administrador."
            });
        }
        catch (Exception errorEnvio) when (errorEnvio is not OperationCanceledException)
        {
            logger.LogError(errorEnvio, "No se pudo enviar el código de verificación a {Correo}.", correo);
            await InvalidarCodigoAsync(pendiente, cancellationToken);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "No se pudo enviar el correo. Verifica la configuración SMTP e inténtalo de nuevo."
            });
        }

        return Ok(new
        {
            mensaje = $"Enviamos un código de 6 dígitos a {correo}.",
            expiraEnSegundos = MinutosVigenciaCodigo * 60,
            reenviarEnSegundos = SegundosEntreEnvios
        });
    }

    /// <summary>
    /// Valida el código de 6 dígitos y devuelve el token que autoriza el registro.
    /// </summary>
    [HttpPost("verificar-codigo")]
    public async Task<IActionResult> VerificarCodigo(
        VerificarCodigoRegistroDTO solicitud,
        CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(solicitud.Correo);
        var codigo = solicitud.Codigo?.Trim() ?? string.Empty;

        if (!EsCorreoPermitido(correo))
        {
            return BadRequest(new { error = "El correo institucional no es válido." });
        }

        if (!Regex.IsMatch(codigo, @"^\d{6}$"))
        {
            return BadRequest(new { error = "El código debe tener exactamente 6 dígitos." });
        }

        var pendiente = await context.RegistrosPendientes
            .FirstOrDefaultAsync(registro => registro.Correo == correo, cancellationToken);

        if (pendiente is null)
        {
            return BadRequest(new
            {
                error = "No hay un código pendiente para ese correo. Solicita uno nuevo."
            });
        }

        var ahora = DateTime.UtcNow;
        if (pendiente.CodigoExpiraEn <= ahora)
        {
            return BadRequest(new
            {
                error = "El código expiró. Solicita uno nuevo."
            });
        }

        if (pendiente.Intentos >= MaxIntentosCodigo)
        {
            return BadRequest(new
            {
                error = "Demasiados intentos incorrectos. Solicita un código nuevo."
            });
        }

        var resultado = codigoHasher.VerifyHashedPassword(
            pendiente,
            pendiente.CodigoHash,
            codigo);

        if (resultado == PasswordVerificationResult.Failed)
        {
            pendiente.Intentos++;
            await context.SaveChangesAsync(cancellationToken);
            var restantes = Math.Max(0, MaxIntentosCodigo - pendiente.Intentos);
            return BadRequest(new
            {
                error = restantes > 0
                    ? $"Código incorrecto. Te quedan {restantes} intento(s)."
                    : "Código incorrecto. Solicita uno nuevo.",
                intentosRestantes = restantes
            });
        }

        var token = GenerarToken();
        pendiente.VerificadoEn = ahora;
        pendiente.TokenHash = HashToken(token);
        pendiente.TokenExpiraEn = ahora.AddMinutes(MinutosVigenciaToken);
        pendiente.Intentos = 0;
        await context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            token,
            expiraEnSegundos = MinutosVigenciaToken * 60
        });
    }

    private async Task InvalidarCodigoAsync(
        RegistroPendiente pendiente,
        CancellationToken cancellationToken)
    {
        // Permite reintentar de inmediato y deja el código anterior sin validez.
        pendiente.CodigoExpiraEn = DateTime.UtcNow.AddSeconds(-1);
        pendiente.UltimoEnvioEn = DateTime.UtcNow.AddSeconds(-SegundosEntreEnvios);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizarCorreo(string? correo)
    {
        return (correo ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static bool EsCorreoInstitucional(string correo)
    {
        return correo.Length <= 150 &&
               correo.EndsWith(".edu.co", StringComparison.OrdinalIgnoreCase) &&
               FormatoCorreo.IsMatch(correo);
    }

    /// <summary>
    /// En desarrollo acepta cualquier correo válido para poder probar el flujo
    /// sin depender de la entrega a un dominio institucional. En producción
    /// solo se permiten correos .edu.co.
    /// </summary>
    private bool EsCorreoPermitido(string correo)
    {
        if (EsCorreoInstitucional(correo))
        {
            return true;
        }

        return entorno.IsDevelopment() &&
               correo.Length <= 150 &&
               FormatoCorreo.IsMatch(correo);
    }

    private static string GenerarCodigo()
    {
        return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
    }

    private static string GenerarToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static string HashToken(string token)
    {
        return Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }
}
