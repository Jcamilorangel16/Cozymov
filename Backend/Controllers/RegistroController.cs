using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/registro")]
[ApiController]
[EnableRateLimiting("codigo-correo")]
public class RegistroController(
    AppDbContext context,
    IEnviadorCorreo enviadorCorreo,
    IVerificadorCorreo verificadorCorreo,
    IHostEnvironment entorno,
    ILogger<RegistroController> logger) : ControllerBase
{
    private static readonly Regex FormatoCorreo = new(
        @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    [HttpPost("codigo")]
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

        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        ComprobanteCorreo comprobante;
        try
        {
            comprobante = verificadorCorreo.CrearComprobante(correo, codigo);
        }
        catch (VerificacionCorreoNoConfiguradaException errorConfiguracion)
        {
            logger.LogError(errorConfiguracion, "La firma de verificación del correo no está configurada.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "La verificación del correo no está configurada."
            });
        }

        try
        {
            await enviadorCorreo.EnviarCodigoAsync(correo, codigo, cancellationToken);
        }
        catch (CorreoNoConfiguradoException errorConfiguracion)
        {
            logger.LogError(errorConfiguracion, "Brevo no está configurado.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "El envío de correos no está configurado."
            });
        }
        catch (Exception errorEnvio) when (errorEnvio is not OperationCanceledException)
        {
            logger.LogError(errorEnvio, "No se pudo enviar el código de verificación a {Correo}.", correo);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "No se pudo enviar el correo. Inténtalo de nuevo."
            });
        }

        return Ok(new
        {
            comprobante = comprobante.Valor,
            vence = comprobante.Vence
        });
    }

    [HttpPost("codigo/verificar")]
    public IActionResult VerificarCodigo(VerificarCodigoRegistroDTO solicitud)
    {
        var correo = NormalizarCorreo(solicitud.Correo);
        if (!EsCorreoPermitido(correo))
        {
            return BadRequest(new { error = "El correo institucional no es válido." });
        }

        ResultadoVerificacionCorreo resultado;
        try
        {
            resultado = verificadorCorreo.Verificar(
                correo,
                solicitud.Comprobante,
                solicitud.Codigo);
        }
        catch (VerificacionCorreoNoConfiguradaException errorConfiguracion)
        {
            logger.LogError(errorConfiguracion, "La firma de verificación del correo no está configurada.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "La verificación del correo no está configurada."
            });
        }
        if (!resultado.EsValido)
        {
            return BadRequest(new { error = resultado.Error });
        }

        return Ok(new { mensaje = "Correo verificado." });
    }

    private static string NormalizarCorreo(string? correo) =>
        string.Concat((correo ?? string.Empty).Where(caracter => !char.IsWhiteSpace(caracter)))
            .ToLowerInvariant();

    private static bool EsCorreoInstitucional(string correo) =>
        correo.Length <= 150 &&
        correo.EndsWith(".edu.co", StringComparison.OrdinalIgnoreCase) &&
        FormatoCorreo.IsMatch(correo);

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
}
