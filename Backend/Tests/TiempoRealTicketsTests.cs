using Backend.TiempoReal;

namespace Backend.Tests;

/// <summary>Reloj controlable para probar vencimientos sin esperar.</summary>
internal sealed class RelojDePrueba(DateTimeOffset inicio) : TimeProvider
{
    private DateTimeOffset _ahora = inicio;

    public override DateTimeOffset GetUtcNow() => _ahora;

    public void Avanzar(TimeSpan tiempo) => _ahora += tiempo;
}

public sealed class TiempoRealTicketsTests
{
    private static (AlmacenTicketsTiempoReal Almacen, RelojDePrueba Reloj) NuevoAlmacen()
    {
        var reloj = new RelojDePrueba(new DateTimeOffset(2026, 11, 19, 12, 0, 0, TimeSpan.Zero));
        return (new AlmacenTicketsTiempoReal(reloj), reloj);
    }

    [Fact]
    public void UnTicketIdentificaAlUsuarioParaElQueSeEmitio()
    {
        var (almacen, _) = NuevoAlmacen();

        var emitido = almacen.Emitir(7);

        Assert.NotNull(emitido);
        Assert.Equal(AlmacenTicketsTiempoReal.Vigencia, emitido.Vigencia);
        Assert.Equal(7, almacen.Consumir(emitido.Ticket));
    }

    [Fact]
    public void UnTicketSoloSirveUnaVez()
    {
        var (almacen, _) = NuevoAlmacen();
        var emitido = almacen.Emitir(7)!;

        Assert.Equal(7, almacen.Consumir(emitido.Ticket));
        Assert.Null(almacen.Consumir(emitido.Ticket));
    }

    [Fact]
    public void UnTicketVencidoNoSirveYDejaDeExistir()
    {
        var (almacen, reloj) = NuevoAlmacen();
        var emitido = almacen.Emitir(7)!;

        reloj.Avanzar(AlmacenTicketsTiempoReal.Vigencia);

        Assert.Null(almacen.Consumir(emitido.Ticket));
        reloj.Avanzar(-AlmacenTicketsTiempoReal.Vigencia);
        Assert.Null(almacen.Consumir(emitido.Ticket));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("no-es-un-ticket")]
    [InlineData("7")]
    public void UnValorInventadoNoAutentica(string? ticket)
    {
        var (almacen, _) = NuevoAlmacen();
        almacen.Emitir(7);

        Assert.Null(almacen.Consumir(ticket));
    }

    [Fact]
    public void UnValorDemasiadoLargoSeRechazaSinProcesarlo()
    {
        var (almacen, _) = NuevoAlmacen();

        Assert.Null(almacen.Consumir(new string('a', 10_000)));
    }

    [Fact]
    public void LosTicketsSonAleatoriosDe256Bits()
    {
        var (almacen, _) = NuevoAlmacen();

        var tickets = Enumerable.Range(0, 20).Select(_ => almacen.Emitir(7)!.Ticket).ToList();

        Assert.All(tickets, t => Assert.Matches("^[0-9a-f]{64}$", t));
        Assert.Equal(tickets.Count, tickets.Distinct().Count());
    }

    [Fact]
    public void ElTicketDeUnUsuarioNoSirveParaOtro()
    {
        var (almacen, _) = NuevoAlmacen();
        var deA = almacen.Emitir(1)!;
        var deB = almacen.Emitir(2)!;

        Assert.Equal(1, almacen.Consumir(deA.Ticket));
        Assert.Equal(2, almacen.Consumir(deB.Ticket));
    }

    [Fact]
    public void LimitaLosTicketsPorUsuarioYMinuto()
    {
        var (almacen, reloj) = NuevoAlmacen();

        for (var i = 0; i < AlmacenTicketsTiempoReal.MaxTicketsPorMinuto; i++)
        {
            Assert.NotNull(almacen.Emitir(7));
        }

        Assert.Null(almacen.Emitir(7));
        // El límite es por usuario: otro sigue pudiendo conectar.
        Assert.NotNull(almacen.Emitir(8));

        reloj.Avanzar(TimeSpan.FromMinutes(1));
        Assert.NotNull(almacen.Emitir(7));
    }

    [Fact]
    public void RechazaUsuariosInvalidos()
    {
        var (almacen, _) = NuevoAlmacen();

        Assert.Throws<ArgumentOutOfRangeException>(() => almacen.Emitir(0));
    }
}
