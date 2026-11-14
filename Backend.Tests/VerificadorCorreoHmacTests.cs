using Backend.Services;
using Microsoft.Extensions.Configuration;

namespace Backend.Tests;

public sealed class VerificadorCorreoHmacTests
{
    private static readonly DateTimeOffset Ahora =
        new(2026, 11, 13, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void VerificaCodigoCorrectoYCorreoNormalizado()
    {
        var reloj = new RelojFalso(Ahora);
        var verificador = CrearVerificador("secreto-prueba", reloj);
        var comprobante = verificador.CrearComprobante(" Usuario@Example.edu.co ", "001234");

        var resultado = verificador.Verificar(
            "usuario@example.edu.co",
            comprobante.Valor,
            "001234");

        Assert.True(resultado.EsValido);
        Assert.Equal(Ahora.AddMinutes(10), comprobante.Vence);
    }

    [Fact]
    public void RechazaCodigoIncorrecto()
    {
        var verificador = CrearVerificador("secreto-prueba", new RelojFalso(Ahora));
        var comprobante = verificador.CrearComprobante("usuario@example.edu.co", "001234");

        var resultado = verificador.Verificar(
            "usuario@example.edu.co",
            comprobante.Valor,
            "001235");

        Assert.False(resultado.EsValido);
        Assert.Contains("código", resultado.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RechazaComprobanteEmitidoParaOtroCorreo()
    {
        var verificador = CrearVerificador("secreto-prueba", new RelojFalso(Ahora));
        var comprobante = verificador.CrearComprobante("primero@example.edu.co", "001234");

        var resultado = verificador.Verificar(
            "segundo@example.edu.co",
            comprobante.Valor,
            "001234");

        Assert.False(resultado.EsValido);
        Assert.Contains("otro correo", resultado.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RechazaComprobanteVencido()
    {
        var reloj = new RelojFalso(Ahora);
        var verificador = CrearVerificador("secreto-prueba", reloj);
        var comprobante = verificador.CrearComprobante("usuario@example.edu.co", "001234");
        reloj.Avanzar(TimeSpan.FromMinutes(10));

        var resultado = verificador.Verificar(
            "usuario@example.edu.co",
            comprobante.Valor,
            "001234");

        Assert.False(resultado.EsValido);
        Assert.Contains("venció", resultado.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RechazaComprobanteFalso()
    {
        var verificador = CrearVerificador("secreto-prueba", new RelojFalso(Ahora));

        var resultado = verificador.Verificar(
            "usuario@example.edu.co",
            "esto-no-es-un-comprobante",
            "001234");

        Assert.False(resultado.EsValido);
        Assert.Contains("comprobante", resultado.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RechazaComprobanteFirmadoConOtraClave()
    {
        var reloj = new RelojFalso(Ahora);
        var emisor = CrearVerificador("secreto-emisor", reloj);
        var verificador = CrearVerificador("secreto-distinto", reloj);
        var comprobante = emisor.CrearComprobante("usuario@example.edu.co", "001234");

        var resultado = verificador.Verificar(
            "usuario@example.edu.co",
            comprobante.Valor,
            "001234");

        Assert.False(resultado.EsValido);
    }

    private static VerificadorCorreoHmac CrearVerificador(
        string secreto,
        TimeProvider reloj)
    {
        var configuracion = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["INTERNAL_API_KEY"] = secreto
            })
            .Build();

        return new VerificadorCorreoHmac(configuracion, reloj);
    }

    private sealed class RelojFalso(DateTimeOffset ahora) : TimeProvider
    {
        private DateTimeOffset _ahora = ahora;

        public override DateTimeOffset GetUtcNow() => _ahora;

        public void Avanzar(TimeSpan duracion) => _ahora = _ahora.Add(duracion);
    }
}
