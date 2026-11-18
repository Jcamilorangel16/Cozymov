using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class ViajeVehiculoRelationTests
{
    [Fact]
    public void ViajeNoGuardaConductorTextoNiVehiculo()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);
        var viaje = context.Model.FindEntityType(typeof(Viaje))!;

        // El conductor es IdUsuario; su vehículo se obtiene de la tabla vehiculo.
        Assert.Null(viaje.FindProperty("IdConductor"));
        Assert.Null(viaje.FindProperty("IdVehiculo"));
        Assert.Null(viaje.FindNavigation("Vehiculo"));
        Assert.DoesNotContain(viaje.GetForeignKeys(), fk => fk.PrincipalEntityType.ClrType == typeof(Vehiculo));
        Assert.NotNull(viaje.FindProperty(nameof(Viaje.IdUsuario)));
    }
}
