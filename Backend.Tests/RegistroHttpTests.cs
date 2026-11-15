using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Backend.Tests;

public sealed class RegistroHttpTests
{
    [Fact]
    public async Task RegistroSinComprobanteDevuelve400()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);

        var respuesta = await client.PostAsJsonAsync("/api/registro", CrearUsuario());

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task VerificacionConCodigoEquivocadoDevuelve400()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        var comprobante = await SolicitarCodigo(client, "persona@example.edu.co");
        var codigoIncorrecto = factory.CorreoFalso.UltimoCodigo == "000000"
            ? "000001"
            : "000000";

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo/verificar",
            new
            {
                correo = "persona@example.edu.co",
                comprobante,
                codigo = codigoIncorrecto
            });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task VerificacionConCodigoCorrectoDevuelve200()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        const string correo = "persona@example.edu.co";
        var comprobante = await SolicitarCodigo(client, correo);

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo/verificar",
            new
            {
                correo,
                comprobante,
                codigo = factory.CorreoFalso.UltimoCodigo
            });

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    [Fact]
    public async Task SolicitarCodigoNoDefineEntidadDePersistenciaDeVerificacion()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        await SolicitarCodigo(client, "persona@example.edu.co");

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.DoesNotContain(
            context.Model.GetEntityTypes(),
            entidad => entidad.ClrType.Name == "RegistroPendiente");
    }

    [Fact]
    public async Task VerificacionConComprobanteDeOtroCorreoDevuelve400()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        var comprobante = await SolicitarCodigo(client, "primero@example.edu.co");
        var codigo = factory.CorreoFalso.UltimoCodigo;

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo/verificar",
            new
            {
                correo = "segundo@example.edu.co",
                comprobante,
                codigo
            });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var error = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("otro correo", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerificacionConCodigoVencidoDevuelve400()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        const string correo = "persona@example.edu.co";
        var comprobante = await SolicitarCodigo(client, correo);
        factory.Reloj.Avanzar(TimeSpan.FromMinutes(10));

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo/verificar",
            new
            {
                correo,
                comprobante,
                codigo = factory.CorreoFalso.UltimoCodigo
            });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Contains(
            "venció",
            await respuesta.Content.ReadAsStringAsync(),
            StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SolicitarCodigoSinConfiguracionBrevoDevuelve503()
    {
        using var factory = new RegistroFactory(usarBrevoReal: true);
        using var client = CrearCliente(factory);

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo",
            new { correo = "persona@example.edu.co" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, respuesta.StatusCode);
    }

    [Fact]
    public async Task SolicitarCodigoSinClaveDeFirmaDevuelve503()
    {
        using var factory = new RegistroFactory(incluirClaveFirma: false);
        using var client = CrearCliente(factory);

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo",
            new { correo = "persona@example.edu.co" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, respuesta.StatusCode);
    }

    [Fact]
    public async Task FalloDeBrevoDevuelve502()
    {
        using var factory = new RegistroFactory(
            usarBrevoReal: true,
            respuestaBrevo: HttpStatusCode.BadRequest);
        using var client = CrearCliente(factory);

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo",
            new { correo = "persona@example.edu.co" });

        Assert.Equal(HttpStatusCode.BadGateway, respuesta.StatusCode);
    }

    [Fact]
    public async Task RegistroConCodigoEquivocadoDevuelve400()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        const string correo = "persona@example.edu.co";
        var comprobante = await SolicitarCodigo(client, correo);
        var codigoIncorrecto = factory.CorreoFalso.UltimoCodigo == "000000"
            ? "000001"
            : "000000";

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro",
            CrearUsuario(correo, new
            {
                comprobante,
                codigo = codigoIncorrecto
            }));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var error = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("correcto", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegistroConCodigoDeOtroCorreoDevuelve400()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        var comprobante = await SolicitarCodigo(client, "primero@example.edu.co");
        var codigo = factory.CorreoFalso.UltimoCodigo;

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro",
            CrearUsuario(
                "segundo@example.edu.co",
                new { comprobante, codigo }));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var error = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("otro correo", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegistroConCodigoVencidoNoCreaLaCuenta()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        const string correo = "persona@example.edu.co";
        var comprobante = await SolicitarCodigo(client, correo);
        var codigo = factory.CorreoFalso.UltimoCodigo;
        factory.Reloj.Avanzar(TimeSpan.FromMinutes(10));

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro",
            CrearUsuario(correo, new { comprobante, codigo }));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await context.Usuarios.AnyAsync(usuario => usuario.Correo == correo));
    }

    [Fact]
    public async Task RegistroCompletoUsaCodigoLeidoDelCorreoFalsoYDevuelve201()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        const string correo = "persona@example.edu.co";
        var comprobante = await SolicitarCodigo(client, correo);

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro",
            CrearUsuario(correo, new
            {
                comprobante,
                codigo = factory.CorreoFalso.UltimoCodigo
            }));

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await context.Usuarios.AnyAsync(usuario => usuario.Correo == correo));
    }

    [Fact]
    public async Task LimitaA5EnviosPorIpEn15Minutos()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);

        for (var intento = 0; intento < 5; intento++)
        {
            var respuesta = await client.PostAsJsonAsync(
                "/api/registro/codigo",
                new { correo = $"persona{intento}@example.edu.co" });
            Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        }

        var respuestaLimitada = await client.PostAsJsonAsync(
            "/api/registro/codigo",
            new { correo = "ultima@example.edu.co" });

        Assert.Equal(HttpStatusCode.TooManyRequests, respuestaLimitada.StatusCode);
    }

    [Fact]
    public async Task VerificarCodigoNoConsumeElCupoDeEnvios()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        string comprobante = "";
        for (var intento = 0; intento < 5; intento++)
        {
            comprobante = await SolicitarCodigo(client, $"persona{intento}@example.edu.co");
        }

        var respuesta = await client.PostAsJsonAsync(
            "/api/registro/codigo/verificar",
            new { correo = "persona4@example.edu.co", comprobante, codigo = "000000" });

        Assert.NotEqual(HttpStatusCode.TooManyRequests, respuesta.StatusCode);
    }

    [Fact]
    public async Task LimitaVerificacionA10IntentosPorIpEn15Minutos()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        var solicitud = new
        {
            correo = "persona@example.edu.co",
            comprobante = "no-valido",
            codigo = "000000"
        };

        for (var intento = 0; intento < 10; intento++)
        {
            var respuesta = await client.PostAsJsonAsync("/api/registro/codigo/verificar", solicitud);
            Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        }

        var limitada = await client.PostAsJsonAsync("/api/registro/codigo/verificar", solicitud);

        Assert.Equal(HttpStatusCode.TooManyRequests, limitada.StatusCode);
    }

    [Fact]
    public async Task PutNoPermiteCambiarElCorreoSinVerificarlo()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);
        int id;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var usuario = new Backend.Models.Usuarios
            {
                Cedula = "1", PrimerNombre = "A", SegundoNombre = "", PrimerApellido = "B",
                SegundoApellido = "", Correo = "persona@example.edu.co", Contrasena = "x",
                rol = "usuario", ocupacion = "estudiante", Edad = 20
            };
            context.Usuarios.Add(usuario);
            await context.SaveChangesAsync();
            id = usuario.IdPersonas;
        }

        object Datos(string correo) => new
        {
            Cedula = "1", PrimerNombre = "A", SegundoNombre = "", PrimerApellido = "B",
            SegundoApellido = "", Edad = 21, Correo = correo, ocupacion = "estudiante"
        };

        var cambio = await client.PutAsJsonAsync($"/api/Usuarios/{id}", Datos("otro@example.edu.co"));
        var mismo = await client.PutAsJsonAsync($"/api/Usuarios/{id}", Datos(" Persona@Example.edu.co "));

        Assert.Equal(HttpStatusCode.BadRequest, cambio.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, mismo.StatusCode);
    }

    [Fact]
    public async Task LimitaRegistroA5SolicitudesPorIpEnUnaHora()
    {
        using var factory = new RegistroFactory();
        using var client = CrearCliente(factory);

        for (var intento = 0; intento < 5; intento++)
        {
            var respuesta = await client.PostAsJsonAsync("/api/registro", CrearUsuario());
            Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        }

        var respuestaLimitada = await client.PostAsJsonAsync(
            "/api/registro",
            CrearUsuario());

        Assert.Equal(HttpStatusCode.TooManyRequests, respuestaLimitada.StatusCode);
    }

    private static HttpClient CrearCliente(RegistroFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Internal-Api-Key", RegistroFactory.ApiKey);
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "192.0.2.10");
        return client;
    }

    private static async Task<string> SolicitarCodigo(HttpClient client, string correo)
    {
        var respuesta = await client.PostAsJsonAsync("/api/registro/codigo", new { correo });
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var contenido = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
        return contenido.GetProperty("comprobante").GetString()!;
    }

    private static object CrearUsuario(
        string correo = "persona@example.edu.co",
        object? verificacion = null)
    {
        var usuario = new Dictionary<string, object?>
        {
            ["Cedula"] = Guid.NewGuid().ToString("N"),
            ["PrimerNombre"] = "Persona",
            ["SegundoNombre"] = "",
            ["PrimerApellido"] = "Prueba",
            ["SegundoApellido"] = "",
            ["Edad"] = 20,
            ["Correo"] = correo,
            ["Contrasena"] = "contraseña-segura",
            ["rol"] = "usuario",
            ["ocupacion"] = "estudiante"
        };
        if (verificacion is not null)
        {
            usuario["verificacion"] = verificacion;
        }

        return usuario;
    }

    private sealed class RegistroFactory : WebApplicationFactory<Program>
    {
        public const string ApiKey = "api-interna-pruebas";
        private readonly string _databaseName = $"registro-tests-{Guid.NewGuid():N}";
        private readonly bool _usarBrevoReal;
        private readonly bool _incluirClaveFirma;
        private readonly HttpStatusCode? _respuestaBrevo;
        private readonly RelojFalso _reloj = new(DateTimeOffset.UtcNow);

        public RegistroFactory(
            bool usarBrevoReal = false,
            HttpStatusCode? respuestaBrevo = null,
            bool incluirClaveFirma = true)
        {
            _usarBrevoReal = usarBrevoReal;
            _respuestaBrevo = respuestaBrevo;
            _incluirClaveFirma = incluirClaveFirma;
        }

        public FakeEnviadorCorreo CorreoFalso =>
            Services.GetRequiredService<FakeEnviadorCorreo>();
        public RelojFalso Reloj => _reloj;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Supabase"] =
                        "Host=localhost;Database=pruebas;Username=pruebas;Password=pruebas",
                    ["INTERNAL_API_KEY"] = ApiKey,
                    ["Jwt:Clave"] = _incluirClaveFirma ? "clave-jwt-pruebas" : null,
                    ["Correo:BrevoApiKey"] = _respuestaBrevo.HasValue ? "brevo-test" : "",
                    ["Correo:Remitente"] = _respuestaBrevo.HasValue
                        ? "remitente@example.com"
                        : ""
                });
            });
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
                services.RemoveAll<AppDbContext>();
                services.RemoveAll<IEnviadorCorreo>();
                services.RemoveAll<TimeProvider>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(_databaseName));
                services.AddSingleton<TimeProvider>(_reloj);
                if (_usarBrevoReal)
                {
                    services.AddHttpClient<IEnviadorCorreo, BrevoEnviadorCorreo>()
                        .ConfigurePrimaryHttpMessageHandler(() =>
                            new RespuestaBrevoHandler(
                                _respuestaBrevo ?? HttpStatusCode.BadRequest));
                }
                else
                {
                    services.AddSingleton<FakeEnviadorCorreo>();
                    services.AddSingleton<IEnviadorCorreo>(
                        provider => provider.GetRequiredService<FakeEnviadorCorreo>());
                }
            });
        }
    }

    private sealed class RelojFalso(DateTimeOffset ahora) : TimeProvider
    {
        private DateTimeOffset _ahora = ahora;

        public override DateTimeOffset GetUtcNow() => _ahora;

        public void Avanzar(TimeSpan duracion) => _ahora = _ahora.Add(duracion);
    }

    private sealed class RespuestaBrevoHandler(HttpStatusCode statusCode) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(statusCode));
    }

    private sealed class FakeEnviadorCorreo : IEnviadorCorreo
    {
        public string UltimoCodigo { get; private set; } = string.Empty;

        public Task EnviarCodigoAsync(
            string correo,
            string codigo,
            CancellationToken cancellationToken = default)
        {
            UltimoCodigo = codigo;
            return Task.CompletedTask;
        }
    }
}
