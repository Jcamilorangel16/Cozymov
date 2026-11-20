using System.Net;

namespace Backend.Tests;

/// <summary>
/// Fija las respuestas del backend que el proxy de Next.js usa para explicar el 503 de
/// /api/tiempo-real/ticket (motivo en Frontend/app/api/tiempo-real/ticket/route.ts).
/// </summary>
public sealed class TiempoRealDiagnosticoTests : IClassFixture<FabricaTiempoReal>
{
    private readonly FabricaTiempoReal _fabrica;

    public TiempoRealDiagnosticoTests(FabricaTiempoReal fabrica) => _fabrica = fabrica;

    [Fact]
    public async Task UsuarioInexistenteDevuelve404ConElTextoQueReconoceElProxy()
    {
        var respuesta = await _fabrica.PedirTicket(987654);

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        Assert.Contains("El usuario no existe", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task RutaInexistenteDevuelve404SinEseTexto()
    {
        // Así responde una API desplegada sin el tiempo real: el proxy lo distingue por el cuerpo.
        var respuesta = await _fabrica.CreateClient().SendAsync(
            _fabrica.ConClave(HttpMethod.Post, "/api/tiempo-real/ruta-que-no-existe", new { idUsuario = 1 }));

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        Assert.DoesNotContain("El usuario no existe", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ClaveInternaIncorrectaDevuelve401()
    {
        var respuesta = await _fabrica.PedirTicket(1, conClave: false);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task UsuarioExistenteRecibeTicket()
    {
        await _fabrica.SembrarUsuarios(4242);

        var respuesta = await _fabrica.PedirTicket(4242);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }
}
