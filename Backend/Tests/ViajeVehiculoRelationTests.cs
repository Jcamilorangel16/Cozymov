using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class ViajeVehiculoRelationTests
{
    [Fact]
    public void ViajeReferencesOptionalVehiculoAndClearsReferenceWhenDeleted()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);
        var navigation = context.Model
            .FindEntityType(typeof(Viaje))!
            .FindNavigation(nameof(Viaje.Vehiculo))!;

        Assert.False(navigation.ForeignKey.IsRequired);
        Assert.Equal(DeleteBehavior.SetNull, navigation.ForeignKey.DeleteBehavior);
        Assert.Equal(nameof(Viaje.IdVehiculo), navigation.ForeignKey.Properties.Single().Name);
        Assert.Equal(typeof(Vehiculo), navigation.ForeignKey.PrincipalEntityType.ClrType);
    }
}
