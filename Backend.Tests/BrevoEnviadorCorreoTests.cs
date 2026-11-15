using Backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public sealed class BrevoEnviadorCorreoTests
{
    [Fact]
    public async Task EnDevelopmentSinCredencialesNoLlamaABrevo()
    {
        var handler = new ContadorSolicitudesHandler();
        using var httpClient = new HttpClient(handler);
        var enviador = new BrevoEnviadorCorreo(
            httpClient,
            new ConfigurationBuilder().Build(),
            new EntornoDevelopment(),
            NullLogger<BrevoEnviadorCorreo>.Instance);

        await enviador.EnviarCodigoAsync("persona@example.edu.co", "001234");

        Assert.Equal(0, handler.Solicitudes);
    }

    private sealed class ContadorSolicitudesHandler : HttpMessageHandler
    {
        public int Solicitudes { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Solicitudes++;
            throw new InvalidOperationException("No se esperaba una solicitud HTTP.");
        }
    }

    private sealed class EntornoDevelopment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Backend.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
