using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class EsquemaPdfRelationTests
{
    private static AppDbContext NewContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Theory]
    [InlineData(typeof(TelefonoUsuario), typeof(Usuarios), DeleteBehavior.Cascade)]
    [InlineData(typeof(Preferencia), typeof(Usuarios), DeleteBehavior.Cascade)]
    [InlineData(typeof(Solicitud), typeof(Usuarios), DeleteBehavior.Restrict)]
    [InlineData(typeof(Solicitud), typeof(Ruta), DeleteBehavior.Restrict)]
    [InlineData(typeof(Calificacion), typeof(ReservaViaje), DeleteBehavior.Cascade)]
    public void ForeignKeysFollowPdfDeletePolicies(Type dependent, Type principal, DeleteBehavior expected)
    {
        using var context = NewContext();
        var fk = context.Model.FindEntityType(dependent)!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == principal);

        Assert.Equal(expected, fk.DeleteBehavior);
    }

    [Fact]
    public void CalificacionHasIndependentEvaluadorAndEvaluadoRestrictedToUsuarios()
    {
        using var context = NewContext();
        var fks = context.Model.FindEntityType(typeof(Calificacion))!
            .GetForeignKeys()
            .Where(f => f.PrincipalEntityType.ClrType == typeof(Usuarios))
            .ToList();

        Assert.Equal(2, fks.Count);
        Assert.All(fks, f => Assert.Equal(DeleteBehavior.Restrict, f.DeleteBehavior));
    }
}
