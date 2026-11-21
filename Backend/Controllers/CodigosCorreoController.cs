using System.Net;
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
/// Códigos enviados por correo (SMTP) para confirmar el correo antes del
/// registro con contraseña y para restablecer la contraseña olvidada.
/// Como todo /api, solo lo llama el servidor de Next.js con la clave interna.
/// </summary>
[Route("api/codigos-correo")]
[ApiController]
[EnableRateLimiting("codigos")]
public partial class CodigosCorreoController(
    AppDbContext context,
    CodigosVerificacion codigos,
    IEnviadorCorreo enviador,
    IPasswordHasher<Usuarios> passwordHasher,
    LimitadorIntentos limitadorIntentos,
    IHostEnvironment entorno,
    ILogger<CodigosCorreoController> logger) : ControllerBase
{
    private const string ErrorCodigo =
        "El código es incorrecto o venció. Revisa el correo o pide uno nuevo.";

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex FormatoCorreo();

    // POST: api/codigos-correo/enviar
    // Registro: exige un correo sin cuenta (y .edu.co fuera de Development).
    // Recuperación: responde igual exista o no la cuenta, para no revelar qué
    // correos están registrados; solo envía si existe.
    [HttpPost("enviar")]
    public async Task<IActionResult> Enviar(EnviarCodigoDTO datos, CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(datos.Correo);
        if (correo.Length is 0 or > 150 || !FormatoCorreo().IsMatch(correo))
        {
            return BadRequest(new { error = "Ingresa un correo electrónico válido." });
        }

        PropositoCodigo proposito;
        switch ((datos.Proposito ?? string.Empty).Trim().ToLowerInvariant())
        {
            case "registro":
                proposito = PropositoCodigo.Registro;
                if (!entorno.IsDevelopment() && !correo.EndsWith(".edu.co", StringComparison.Ordinal))
                {
                    return BadRequest(new { error = "El correo debe ser institucional y terminar en .edu.co." });
                }
                if (await ExisteCuenta(correo, cancellationToken))
                {
                    return Conflict(new { error = "Ese correo ya está registrado. Inicia sesión." });
                }
                break;
            case "recuperacion":
                proposito = PropositoCodigo.Recuperacion;
                if (!await ExisteCuenta(correo, cancellationToken))
                {
                    return Accepted(new { mensaje = MensajeEnviado(proposito) });
                }
                break;
            default:
                return BadRequest(new { error = "Propósito no válido." });
        }

        if (!enviador.Configurado)
        {
            logger.LogError("No se puede enviar el código: falta la configuración Smtp (Servidor, Usuario, Contrasena).");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "El envío de correos no está disponible.", motivo = "smtp_sin_configurar" });
        }

        var codigo = codigos.Generar(proposito, correo, out var esperar);
        if (codigo == null)
        {
            var segundos = Math.Max(1, (int)Math.Ceiling(esperar.TotalSeconds));
            Response.Headers.RetryAfter = segundos.ToString();
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { error = $"Espera {segundos} segundos antes de pedir otro código.", esperar = segundos });
        }

        try
        {
            var (asunto, texto, html) = ContenidoCorreo(proposito, codigo);
            await enviador.EnviarAsync(correo, asunto, texto, html, cancellationToken);
        }
        catch (Exception error) when (error is not OperationCanceledException)
        {
            codigos.Descartar(proposito, correo);
            // El mensaje del servidor SMTP (p. ej. "5.7.139 Authentication
            // unsuccessful") explica la causa y no contiene la contraseña.
            logger.LogError("No se pudo enviar el código por SMTP: {Tipo}: {Mensaje}",
                error.GetType().Name, error.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "No se pudo enviar el correo. Inténtalo más tarde.", motivo = "envio_fallido" });
        }

        return Accepted(new { mensaje = MensajeEnviado(proposito) });
    }

    // POST: api/codigos-correo/verificar
    // Confirma el código del registro. Next.js, al recibir 200, firma la cookie
    // correo_verificado que exige POST /api/registro.
    [HttpPost("verificar")]
    public IActionResult Verificar(VerificarCodigoDTO datos)
    {
        var correo = NormalizarCorreo(datos.Correo);
        return codigos.Verificar(PropositoCodigo.Registro, correo, datos.Codigo) == ResultadoCodigo.Correcto
            ? Ok(new { correo })
            : BadRequest(new { error = ErrorCodigo });
    }

    // POST: api/codigos-correo/restablecer-contrasena
    // Cambia la contraseña con el código de recuperación. No inicia sesión.
    [HttpPost("restablecer-contrasena")]
    public async Task<IActionResult> RestablecerContrasena(
        RestablecerContrasenaDTO datos,
        CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(datos.Correo);
        var nueva = datos.NuevaContrasena ?? string.Empty;
        // Se valida antes del código para no gastarlo con una contraseña inválida.
        if (nueva.Length < 8 || System.Text.Encoding.UTF8.GetByteCount(nueva) > 72)
        {
            return BadRequest(new { error = "La contraseña debe tener entre 8 y 72 bytes." });
        }

        if (codigos.Verificar(PropositoCodigo.Recuperacion, correo, datos.Codigo) != ResultadoCodigo.Correcto)
        {
            return BadRequest(new { error = ErrorCodigo });
        }

        var usuario = await context.Usuarios
            .FirstOrDefaultAsync(u => u.Correo.ToLower() == correo, cancellationToken);
        if (usuario == null)
        {
            return BadRequest(new { error = ErrorCodigo });
        }

        usuario.Contrasena = passwordHasher.HashPassword(usuario, nueva);
        await context.SaveChangesAsync(cancellationToken);
        // Quien recupera la cuenta no debe seguir bloqueado por intentos anteriores.
        limitadorIntentos.Reiniciar($"login|{correo}");
        limitadorIntentos.Reiniciar($"contrasena|{usuario.IdPersonas}");
        return NoContent();
    }

    private Task<bool> ExisteCuenta(string correo, CancellationToken cancellationToken) =>
        context.Usuarios.AnyAsync(u => u.Correo.ToLower() == correo, cancellationToken);

    private static string NormalizarCorreo(string? correo) =>
        string.Concat((correo ?? string.Empty).Where(c => !char.IsWhiteSpace(c))).ToLowerInvariant();

    private static string MensajeEnviado(PropositoCodigo proposito) => proposito == PropositoCodigo.Registro
        ? "Te enviamos un código de 6 dígitos. Revisa tu correo (también la carpeta de no deseado)."
        : "Si el correo tiene una cuenta, te enviamos un código de 6 dígitos. Revisa también la carpeta de no deseado.";

    private static (string Asunto, string Texto, string Html) ContenidoCorreo(PropositoCodigo proposito, string codigo)
    {
        var minutos = (int)CodigosVerificacion.Vigencia.TotalMinutes;
        var (asunto, motivo) = proposito == PropositoCodigo.Registro
            ? ("Confirma tu correo en Cozymov", "confirmar tu correo y crear tu cuenta")
            : ("Restablece tu contraseña de Cozymov", "restablecer tu contraseña");
        var texto =
            $"Tu código para {motivo} en Cozymov es: {codigo}\n\n" +
            $"Vence en {minutos} minutos y solo sirve una vez.\n" +
            "Si no lo pediste, ignora este correo; nadie podrá usarlo sin acceso a tu buzón.";
        var html =
            "<div style=\"font-family:Arial,sans-serif;max-width:480px\">" +
            $"<p>Tu código para {WebUtility.HtmlEncode(motivo)} en <strong>Cozymov</strong> es:</p>" +
            $"<p style=\"font-size:28px;font-weight:bold;letter-spacing:6px\">{codigo}</p>" +
            $"<p>Vence en {minutos} minutos y solo sirve una vez.</p>" +
            "<p style=\"color:#6b7280;font-size:12px\">Si no lo pediste, ignora este correo.</p>" +
            "</div>";
        return (asunto, texto, html);
    }
}
