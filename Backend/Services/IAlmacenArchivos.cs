namespace Backend.Services;

/// <summary>
/// Almacén de archivos del vehículo. La base de datos guarda solo la ruta devuelta.
/// </summary>
public interface IAlmacenArchivos
{
    /// <summary>Sube el contenido y devuelve la ruta con la que quedó guardado.</summary>
    Task<string> SubirAsync(string ruta, Stream contenido, string contentType, CancellationToken cancellationToken);

    /// <summary>Elimina rutas ya subidas. No lanza si alguna no existe.</summary>
    Task EliminarAsync(IReadOnlyCollection<string> rutas, CancellationToken cancellationToken);
}

public sealed class AlmacenNoConfiguradoException : Exception
{
    public AlmacenNoConfiguradoException()
        : base("El almacenamiento de archivos no está configurado.")
    {
    }
}
