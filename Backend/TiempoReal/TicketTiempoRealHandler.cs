using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Backend.TiempoReal;

public static class TicketTiempoReal
{
    public const string Esquema = "TicketTiempoReal";

    /// <summary>
    /// Parámetro de la URL con el ticket. Los navegadores no permiten cabeceras propias en
    /// un WebSocket; el cliente de SignalR lo envía así. Por ser de un solo uso y durar
    /// 60 segundos, que quede en un registro de accesos no permite reutilizarlo.
    /// </summary>
    public const string ParametroTicket = "access_token";
}

/// <summary>
/// Autentica la conexión al Hub con un ticket de <see cref="AlmacenTicketsTiempoReal"/>.
/// El usuario sale del ticket, nunca de un parámetro que el navegador pueda elegir.
/// Fuera de la ruta del Hub no hace nada: el resto de la API sigue autorizándose con
/// X-Internal-Api-Key.
/// </summary>
public sealed class TicketTiempoRealHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AlmacenTicketsTiempoReal almacen,
    OpcionesTiempoReal opciones,
    TimeProvider reloj)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Path.StartsWithSegments(TiempoRealHub.Ruta, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var ticket = Request.Query[TicketTiempoReal.ParametroTicket].ToString();
        if (string.IsNullOrEmpty(ticket))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var idUsuario = almacen.Consumir(ticket);
        if (idUsuario is null)
        {
            return Task.FromResult(AuthenticateResult.Fail("El ticket no es válido, venció o ya se usó."));
        }

        var identidad = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, idUsuario.Value.ToString(CultureInfo.InvariantCulture))],
            Scheme.Name);
        var propiedades = new AuthenticationProperties
        {
            ExpiresUtc = reloj.GetUtcNow() + opciones.DuracionMaximaConexion
        };

        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identidad), propiedades, Scheme.Name)));
    }
}
