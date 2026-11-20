using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using Backend.Data;
using Backend.Models;
using Backend.TiempoReal;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Abstractions;

namespace Backend.Tests;

/// <summary>
/// La API completa sobre un servidor de pruebas, con base en memoria. Usa el entorno
/// "Testing": no aplica migraciones ni carga User Secrets, así que nunca toca la base
/// real. Las claves son valores de prueba.
/// </summary>
public sealed class FabricaTiempoReal : WebApplicationFactory<Program>
{
    public const string ClaveInterna = "clave-interna-solo-para-pruebas-0123456789";
    public const string OrigenApp = "https://app.prueba";

    private readonly string _baseDatos = Guid.NewGuid().ToString();

    public TimeSpan DuracionMaximaConexion { get; init; } = TimeSpan.FromHours(1);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Supabase", "Host=no-se-usa-en-pruebas");
        builder.UseSetting("INTERNAL_API_KEY", ClaveInterna);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options
                .UseInMemoryDatabase(_baseDatos)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

            services.RemoveAll<OpcionesTiempoReal>();
            services.AddSingleton(new OpcionesTiempoReal
            {
                OrigenesPermitidos = [OrigenApp],
                DuracionMaximaConexion = DuracionMaximaConexion
            });
        });
    }

    public async Task SembrarUsuarios(params int[] ids)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Usuarios.AddRange(ids.Select(id => new Usuarios
        {
            IdPersonas = id, Cedula = id.ToString(), PrimerNombre = $"Nombre{id}", SegundoNombre = "",
            PrimerApellido = $"Apellido{id}", SegundoApellido = "", Correo = $"{id}@x.co",
            Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
        }));
        await db.SaveChangesAsync();
    }

    /// <summary>Lo que hace el servidor de Next.js tras verificar la sesión.</summary>
    public async Task<HttpResponseMessage> PedirTicket(int idUsuario, bool conClave = true)
    {
        var solicitud = new HttpRequestMessage(HttpMethod.Post, "/api/tiempo-real/tickets")
        {
            Content = JsonContent.Create(new { idUsuario })
        };
        if (conClave)
        {
            solicitud.Headers.Add("X-Internal-Api-Key", ClaveInterna);
        }
        return await CreateClient().SendAsync(solicitud);
    }

    public async Task<string> Ticket(int idUsuario)
    {
        var respuesta = await PedirTicket(idUsuario);
        respuesta.EnsureSuccessStatusCode();
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        return cuerpo!["ticket"].ToString()!;
    }

    /// <summary>
    /// Conexión como la del navegador: solo WebSocket, sin negociación y con el ticket en
    /// <c>access_token</c>.
    /// </summary>
    public HubConnection Conexion(string? ticket, string? origen = OrigenApp)
    {
        var servidor = Server;
        var url = new Uri(servidor.BaseAddress,
            TiempoRealHub.Ruta.TrimStart('/') + (ticket is null ? "" : $"?access_token={ticket}"));
        return new HubConnectionBuilder()
            .WithUrl(url, options =>
            {
                options.Transports = HttpTransportType.WebSockets;
                options.SkipNegotiation = true;
                options.WebSocketFactory = async (contexto, cancelacion) =>
                {
                    var cliente = servidor.CreateWebSocketClient();
                    if (origen is not null)
                    {
                        cliente.ConfigureRequest = solicitud => solicitud.Headers.Origin = origen;
                    }
                    return await cliente.ConnectAsync(contexto.Uri, cancelacion);
                };
            })
            .Build();
    }

    public async Task<HubConnection> Conectado(int idUsuario)
    {
        var conexion = Conexion(await Ticket(idUsuario));
        await conexion.StartAsync();
        return conexion;
    }

    public HttpRequestMessage ConClave(HttpMethod metodo, string ruta, object? cuerpo = null)
    {
        var solicitud = new HttpRequestMessage(metodo, ruta);
        solicitud.Headers.Add("X-Internal-Api-Key", ClaveInterna);
        if (cuerpo is not null)
        {
            solicitud.Content = JsonContent.Create(cuerpo);
        }
        return solicitud;
    }

    public async Task<HttpResponseMessage> EnviarMensaje(int emisor, int receptor, string contenido) =>
        await CreateClient().SendAsync(ConClave(HttpMethod.Post, "/api/Mensajes",
            new { idEmisor = emisor, idReceptor = receptor, contenido }));

    public int ConexionesAbiertas(int idUsuario) =>
        Services.GetRequiredService<RegistroConexionesTiempoReal>().Abiertas(idUsuario.ToString());
}

/// <summary>Recoge los eventos de un tipo que recibe una conexión.</summary>
internal sealed class Buzon<T>
{
    private readonly List<T> _recibidos = [];
    private TaskCompletionSource<T> _siguiente = NuevaEspera();

    public Buzon(HubConnection conexion, string evento)
    {
        conexion.On<T>(evento, recibido =>
        {
            lock (_recibidos)
            {
                _recibidos.Add(recibido);
                _siguiente.TrySetResult(recibido);
            }
        });
    }

    public int Cantidad
    {
        get { lock (_recibidos) return _recibidos.Count; }
    }

    /// <summary>Prepara la espera del próximo evento (llamar antes de provocarlo).</summary>
    public Task<T> Proximo()
    {
        lock (_recibidos)
        {
            _siguiente = NuevaEspera();
            return _siguiente.Task;
        }
    }

    private static TaskCompletionSource<T> NuevaEspera() =>
        new(TaskCreationOptions.RunContinuationsAsynchronously);
}

public sealed class TiempoRealHubTests(ITestOutputHelper salida) : IAsyncLifetime
{
    private const int Ana = 1;
    private const int Beto = 2;
    private const int Carla = 3;
    private static readonly TimeSpan Espera = TimeSpan.FromSeconds(5);

    private readonly FabricaTiempoReal _fabrica = new();
    private readonly List<HubConnection> _conexiones = [];

    public Task InitializeAsync() => _fabrica.SembrarUsuarios(Ana, Beto, Carla);

    public async Task DisposeAsync()
    {
        foreach (var conexion in _conexiones)
        {
            await conexion.DisposeAsync();
        }
        await _fabrica.DisposeAsync();
    }

    private async Task<HubConnection> Conectado(int idUsuario)
    {
        var conexion = await _fabrica.Conectado(idUsuario);
        _conexiones.Add(conexion);
        return conexion;
    }

    private HubConnection Conexion(string? ticket, string? origen = FabricaTiempoReal.OrigenApp)
    {
        var conexion = _fabrica.Conexion(ticket, origen);
        _conexiones.Add(conexion);
        return conexion;
    }

    private static async Task Hasta(Func<bool> condicion)
    {
        var limite = Stopwatch.StartNew();
        while (!condicion())
        {
            if (limite.Elapsed > Espera) throw new TimeoutException("La condición no se cumplió a tiempo.");
            await Task.Delay(20);
        }
    }

    // ---- Autenticación ----

    [Fact]
    public async Task ElTicketSoloSeEmiteConLaClaveInterna()
    {
        var respuesta = await _fabrica.PedirTicket(Ana, conClave: false);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task NoSeEmiteTicketParaUnUsuarioQueNoExiste()
    {
        var respuesta = await _fabrica.PedirTicket(404);

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task LaRespuestaDelTicketNoSeGuardaEnCache()
    {
        var respuesta = await _fabrica.PedirTicket(Ana);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.True(respuesta.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task SinTicketNoSePuedeConectar()
    {
        var excepcion = await Assert.ThrowsAnyAsync<Exception>(() => Conexion(null).StartAsync());

        Assert.Contains("401", excepcion.ToString());
    }

    [Theory]
    [InlineData("inventado")]
    [InlineData("0000000000000000000000000000000000000000000000000000000000000000")]
    public async Task UnTicketInventadoNoConecta(string ticket)
    {
        var excepcion = await Assert.ThrowsAnyAsync<Exception>(() => Conexion(ticket).StartAsync());

        Assert.Contains("401", excepcion.ToString());
    }

    [Fact]
    public async Task UnTicketYaUsadoNoSirveParaUnaSegundaConexion()
    {
        var ticket = await _fabrica.Ticket(Ana);
        await Conexion(ticket).StartAsync();

        var excepcion = await Assert.ThrowsAnyAsync<Exception>(() => Conexion(ticket).StartAsync());

        Assert.Contains("401", excepcion.ToString());
    }

    [Fact]
    public async Task UnaPaginaDeOtroOrigenNoPuedeConectarAunqueTengaTicket()
    {
        var ticket = await _fabrica.Ticket(Ana);

        var excepcion = await Assert.ThrowsAnyAsync<Exception>(
            () => Conexion(ticket, origen: "https://sitio-ajeno.example").StartAsync());

        Assert.Contains("403", excepcion.ToString());
        // El rechazo por origen ocurre antes de consumir el ticket, pero el ticket no se
        // entregó a esa página: en el navegador solo lo recibe la propia aplicación.
    }

    [Fact]
    public async Task LaAplicacionConectaDesdeSuOrigen()
    {
        var conexion = await Conectado(Ana);

        Assert.Equal(HubConnectionState.Connected, conexion.State);
        Assert.Equal(1, _fabrica.ConexionesAbiertas(Ana));
    }

    // ---- Aislamiento entre usuarios ----

    [Fact]
    public async Task UnMensajeSoloLlegaASusParticipantes()
    {
        var ana = await Conectado(Ana);
        var beto = await Conectado(Beto);
        var carla = await Conectado(Carla);
        var buzonAna = new Buzon<MensajeNuevoEvento>(ana, "MensajeNuevo");
        var buzonBeto = new Buzon<MensajeNuevoEvento>(beto, "MensajeNuevo");
        var buzonCarla = new Buzon<MensajeNuevoEvento>(carla, "MensajeNuevo");
        var paraBeto = buzonBeto.Proximo();
        var paraAna = buzonAna.Proximo();

        var respuesta = await _fabrica.EnviarMensaje(Ana, Beto, "Salgo en 5 minutos");

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        var recibido = await paraBeto.WaitAsync(Espera);
        Assert.Equal(VersionEventos.Actual, recibido.Version);
        Assert.Equal(Ana, recibido.IdEmisor);
        Assert.Equal(Beto, recibido.IdReceptor);
        Assert.Equal("Nombre1 Apellido1", recibido.NombreEmisor);
        Assert.Equal("Salgo en 5 minutos", recibido.Contenido);
        Assert.True(recibido.IdMensaje > 0);
        // La emisora también lo recibe (sus otras pestañas se actualizan).
        await paraAna.WaitAsync(Espera);

        await Task.Delay(300);
        Assert.Equal(0, buzonCarla.Cantidad);
    }

    [Fact]
    public async Task ElEmisorSeEnteraCuandoLeenSusMensajes()
    {
        var ana = await Conectado(Ana);
        var carla = await Conectado(Carla);
        var leidosAna = new Buzon<MensajesLeidosEvento>(ana, "MensajesLeidos");
        var leidosCarla = new Buzon<MensajesLeidosEvento>(carla, "MensajesLeidos");
        await _fabrica.EnviarMensaje(Ana, Beto, "uno");
        var ultimo = await (await _fabrica.EnviarMensaje(Ana, Beto, "dos"))
            .Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var proximo = leidosAna.Proximo();

        // Beto abre la conversación (la ruta proxy usa su id de sesión como «yo»).
        var lectura = await _fabrica.CreateClient().SendAsync(
            _fabrica.ConClave(HttpMethod.Get, $"/api/Mensajes/conversacion?yo={Beto}&otro={Ana}"));

        Assert.Equal(HttpStatusCode.OK, lectura.StatusCode);
        var evento = await proximo.WaitAsync(Espera);
        Assert.Equal(Beto, evento.IdLector);
        Assert.Equal(Ana, evento.IdEmisor);
        Assert.Equal(int.Parse(ultimo!["idMensaje"].ToString()!), evento.HastaIdMensaje);
        await Task.Delay(300);
        Assert.Equal(0, leidosCarla.Cantidad);
    }

    [Fact]
    public async Task ElNavegadorNoPuedeUnirseAGruposNiInvocarMetodos()
    {
        var carla = await Conectado(Carla);
        var buzonCarla = new Buzon<MensajeNuevoEvento>(carla, "MensajeNuevo");
        var beto = await Conectado(Beto);
        var buzonBeto = new Buzon<MensajeNuevoEvento>(beto, "MensajeNuevo");

        // Intentos de suscribirse a la conversación de Ana y Beto cambiando ids o nombres de grupo.
        foreach (var metodo in new[] { "UnirseAGrupo", "AddToGroupAsync", "Suscribir", "OnConnectedAsync" })
        {
            await Assert.ThrowsAsync<HubException>(() => carla.InvokeAsync(metodo, "conversacion-1-2"));
        }

        var paraBeto = buzonBeto.Proximo();
        await _fabrica.EnviarMensaje(Ana, Beto, "privado");
        await paraBeto.WaitAsync(Espera);
        await Task.Delay(300);
        Assert.Equal(0, buzonCarla.Cantidad);
        Assert.Equal(HubConnectionState.Connected, carla.State);
    }

    [Fact]
    public async Task UnaCuentaNoPuedeAbrirConexionesSinLimite()
    {
        for (var i = 0; i < RegistroConexionesTiempoReal.MaxConexionesPorUsuario; i++)
        {
            await Conectado(Ana);
        }

        var sobrante = Conexion(await _fabrica.Ticket(Ana));
        var cerrada = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        sobrante.Closed += _ => { cerrada.TrySetResult(); return Task.CompletedTask; };
        try
        {
            await sobrante.StartAsync();
        }
        catch (Exception)
        {
            cerrada.TrySetResult();
        }

        await cerrada.Task.WaitAsync(Espera);
        Assert.Equal(RegistroConexionesTiempoReal.MaxConexionesPorUsuario, _fabrica.ConexionesAbiertas(Ana));

        // Al cerrar una pestaña se libera su lugar.
        await _conexiones[0].StopAsync();
        await Hasta(() => _fabrica.ConexionesAbiertas(Ana) == RegistroConexionesTiempoReal.MaxConexionesPorUsuario - 1);
        var nueva = await Conectado(Ana);
        Assert.Equal(HubConnectionState.Connected, nueva.State);
    }

    // ---- Desconexiones ----

    [Fact]
    public async Task UnMensajeEnviadoDuranteLaDesconexionSeGuardaYSeRecuperaPorHttp()
    {
        var beto = await Conectado(Beto);
        var buzon = new Buzon<MensajeNuevoEvento>(beto, "MensajeNuevo");
        await beto.StopAsync();
        await Hasta(() => _fabrica.ConexionesAbiertas(Beto) == 0);

        var enviado = await _fabrica.EnviarMensaje(Ana, Beto, "¿Sigues ahí?");

        // La operación no depende de que el receptor esté conectado.
        Assert.Equal(HttpStatusCode.Created, enviado.StatusCode);
        Assert.Equal(0, buzon.Cantidad);

        // Al reconectar (ticket nuevo), el cliente se resincroniza por HTTP.
        var reconectado = await Conectado(Beto);
        var buzonNuevo = new Buzon<MensajeNuevoEvento>(reconectado, "MensajeNuevo");
        var conversacion = await _fabrica.CreateClient().SendAsync(
            _fabrica.ConClave(HttpMethod.Get, $"/api/Mensajes/conversacion?yo={Beto}&otro={Ana}"));
        var mensajes = await conversacion.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        Assert.Contains(mensajes!, m => m["contenido"].ToString() == "¿Sigues ahí?");

        // Y los eventos siguientes llegan por la conexión nueva.
        var proximo = buzonNuevo.Proximo();
        await _fabrica.EnviarMensaje(Ana, Beto, "Ya llegué");
        Assert.Equal("Ya llegué", (await proximo.WaitAsync(Espera)).Contenido);
    }

    [Fact]
    public async Task DesconectarseLiberaLaConexionDelRegistro()
    {
        var ana = await Conectado(Ana);
        Assert.Equal(1, _fabrica.ConexionesAbiertas(Ana));

        await ana.DisposeAsync();

        await Hasta(() => _fabrica.ConexionesAbiertas(Ana) == 0);
    }

    // ---- Medición ----

    [Fact]
    public async Task MideLaLatenciaDeUnMensajeHastaElReceptor()
    {
        const int muestras = 50;
        var beto = await Conectado(Beto);
        var buzon = new Buzon<MensajeNuevoEvento>(beto, "MensajeNuevo");
        var http = _fabrica.CreateClient();
        // Calentamiento: la primera solicitud compila rutas y consultas.
        var calentamiento = buzon.Proximo();
        await _fabrica.EnviarMensaje(Ana, Beto, "calentamiento");
        await calentamiento.WaitAsync(Espera);

        var latencias = new List<double>();
        for (var i = 0; i < muestras; i++)
        {
            var proximo = buzon.Proximo();
            var reloj = Stopwatch.StartNew();
            await _fabrica.EnviarMensaje(Ana, Beto, $"mensaje {i}");
            await proximo.WaitAsync(Espera);
            latencias.Add(reloj.Elapsed.TotalMilliseconds);
        }

        // Coste de una consulta del polling actual (GET de la conversación), en el mismo entorno.
        var consultas = new List<double>();
        for (var i = 0; i < muestras; i++)
        {
            var reloj = Stopwatch.StartNew();
            var respuesta = await http.SendAsync(
                _fabrica.ConClave(HttpMethod.Get, $"/api/Mensajes/conversacion?yo={Beto}&otro={Ana}"));
            respuesta.EnsureSuccessStatusCode();
            consultas.Add(reloj.Elapsed.TotalMilliseconds);
        }

        static double Percentil(List<double> valores, double p)
        {
            var ordenados = valores.Order().ToList();
            return ordenados[(int)Math.Ceiling(p * ordenados.Count) - 1];
        }

        salida.WriteLine(
            $"Envío→evento en el receptor ({muestras} mensajes): p50 {Percentil(latencias, .5):F1} ms, " +
            $"p95 {Percentil(latencias, .95):F1} ms, máx {latencias.Max():F1} ms");
        salida.WriteLine(
            $"Una consulta GET de la conversación ({muestras}): p50 {Percentil(consultas, .5):F1} ms, " +
            $"p95 {Percentil(consultas, .95):F1} ms");
        Assert.True(Percentil(latencias, .95) < 1000, "La entrega por SignalR tardó más de 1 s.");
    }
}

public sealed class TiempoRealExpiracionTests : IAsyncLifetime
{
    private readonly FabricaTiempoReal _fabrica = new() { DuracionMaximaConexion = TimeSpan.FromSeconds(2) };

    public Task InitializeAsync() => _fabrica.SembrarUsuarios(1);

    public async Task DisposeAsync() => await _fabrica.DisposeAsync();

    [Fact]
    public async Task LaConexionSeCierraCuandoVenceSuAutenticacion()
    {
        await using var conexion = await _fabrica.Conectado(1);
        var cerrada = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        conexion.Closed += _ => { cerrada.TrySetResult(); return Task.CompletedTask; };

        // El navegador entonces pide un ticket nuevo: Next.js vuelve a verificar la sesión.
        await cerrada.Task.WaitAsync(TimeSpan.FromSeconds(15));
        Assert.Equal(HubConnectionState.Disconnected, conexion.State);
    }
}
