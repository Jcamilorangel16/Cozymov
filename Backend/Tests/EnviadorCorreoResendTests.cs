using System.Net;
using System.Text.Json;
using Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class EnviadorCorreoResendTests
{
    private sealed class ManejadorFalso(HttpStatusCode estado, string cuerpo) : HttpMessageHandler
    {
        public HttpRequestMessage? Solicitud { get; private set; }
        public string? CuerpoEnviado { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Solicitud = request;
            CuerpoEnviado = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(estado) { Content = new StringContent(cuerpo) };
        }
    }

    private static readonly OpcionesResend Opciones = new()
    {
        ApiKey = "re_prueba_no_real",
        Remitente = "noreply@cozymov.com",
    };

    private static EnviadorCorreoResend Crear(ManejadorFalso manejador, OpcionesResend? opciones = null) =>
        new(new HttpClient(manejador), opciones ?? Opciones, NullLogger<EnviadorCorreoResend>.Instance);

    [Fact]
    public async Task EnviaPorLaApiHttpsConClaveYRemitente()
    {
        var manejador = new ManejadorFalso(HttpStatusCode.OK, """{"id":"abc"}""");

        await Crear(manejador).EnviarAsync("ana@unicesar.edu.co", "Asunto", "Texto", "<p>Html</p>", CancellationToken.None);

        Assert.Equal(HttpMethod.Post, manejador.Solicitud!.Method);
        Assert.Equal(EnviadorCorreoResend.UrlEnvio, manejador.Solicitud.RequestUri!.ToString());
        Assert.Equal("Bearer", manejador.Solicitud.Headers.Authorization!.Scheme);
        Assert.Equal("re_prueba_no_real", manejador.Solicitud.Headers.Authorization.Parameter);

        using var json = JsonDocument.Parse(manejador.CuerpoEnviado!);
        var raiz = json.RootElement;
        Assert.Equal("Cozymov <noreply@cozymov.com>", raiz.GetProperty("from").GetString());
        Assert.Equal("ana@unicesar.edu.co", raiz.GetProperty("to")[0].GetString());
        Assert.Equal("Asunto", raiz.GetProperty("subject").GetString());
        Assert.Equal("Texto", raiz.GetProperty("text").GetString());
        Assert.Equal("<p>Html</p>", raiz.GetProperty("html").GetString());
    }

    [Fact]
    public async Task UnErrorDeResendIncluyeSuMensajeSinLaClave()
    {
        var manejador = new ManejadorFalso(
            HttpStatusCode.Forbidden,
            """{"statusCode":403,"name":"validation_error","message":"The cozymov.com domain is not verified."}""");

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Crear(manejador).EnviarAsync("ana@unicesar.edu.co", "A", "T", "H", CancellationToken.None));

        Assert.Contains("403", error.Message);
        Assert.Contains("domain is not verified", error.Message);
        Assert.DoesNotContain("re_prueba_no_real", error.Message);
    }

    [Fact]
    public void SinClaveORemitenteNoEstaConfigurado()
    {
        Assert.False(new OpcionesResend().Completa);
        Assert.False(new OpcionesResend { ApiKey = "re_x" }.Completa);
        Assert.False(new OpcionesResend { ApiKey = "re_x", Remitente = "sin-arroba" }.Completa);
        Assert.True(Opciones.Completa);

        var enviador = Crear(new ManejadorFalso(HttpStatusCode.OK, "{}"), new OpcionesResend());
        Assert.False(enviador.Configurado);
    }
}
