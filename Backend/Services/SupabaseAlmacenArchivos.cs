using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Backend.Services;

/// <summary>
/// Guarda archivos en Supabase Storage mediante su API REST.
/// Configuración: Supabase:Url, Supabase:ServiceKey y Supabase:Storage:Bucket
/// (variables de entorno Supabase__Url, Supabase__ServiceKey, Supabase__Storage__Bucket).
/// </summary>
public sealed class SupabaseAlmacenArchivos(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<SupabaseAlmacenArchivos> logger) : IAlmacenArchivos
{
    private (string Url, string Llave, string Bucket) Config()
    {
        var url = configuration["Supabase:Url"]?.TrimEnd('/');
        var llave = configuration["Supabase:ServiceKey"];
        var bucket = configuration["Supabase:Storage:Bucket"];
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(llave) || string.IsNullOrWhiteSpace(bucket))
        {
            throw new AlmacenNoConfiguradoException();
        }
        return (url, llave, bucket);
    }

    public async Task<string> SubirAsync(string ruta, Stream contenido, string contentType, CancellationToken cancellationToken)
    {
        var (url, llave, bucket) = Config();
        using var solicitud = new HttpRequestMessage(
            HttpMethod.Post,
            $"{url}/storage/v1/object/{Uri.EscapeDataString(bucket)}/{EscaparRuta(ruta)}");
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("Bearer", llave);
        solicitud.Headers.Add("apikey", llave);
        solicitud.Headers.Add("x-upsert", "false");
        solicitud.Content = new StreamContent(contenido);
        solicitud.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        using var respuesta = await httpClient.SendAsync(solicitud, cancellationToken);
        if (!respuesta.IsSuccessStatusCode)
        {
            var detalle = await respuesta.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError("Supabase Storage rechazó la subida ({Status}): {Detalle}", (int)respuesta.StatusCode, detalle);
            throw new HttpRequestException($"No se pudo subir el archivo (HTTP {(int)respuesta.StatusCode}).");
        }
        return ruta;
    }

    public async Task EliminarAsync(IReadOnlyCollection<string> rutas, CancellationToken cancellationToken)
    {
        if (rutas.Count == 0)
        {
            return;
        }

        var (url, llave, bucket) = Config();
        using var solicitud = new HttpRequestMessage(
            HttpMethod.Delete,
            $"{url}/storage/v1/object/{Uri.EscapeDataString(bucket)}");
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("Bearer", llave);
        solicitud.Headers.Add("apikey", llave);
        solicitud.Content = new StringContent(
            JsonSerializer.Serialize(new { prefixes = rutas }),
            Encoding.UTF8,
            "application/json");

        using var respuesta = await httpClient.SendAsync(solicitud, cancellationToken);
        if (!respuesta.IsSuccessStatusCode)
        {
            logger.LogError("No se pudieron eliminar {Cantidad} archivos de Supabase Storage ({Status}).", rutas.Count, (int)respuesta.StatusCode);
        }
    }

    private static string EscaparRuta(string ruta) =>
        string.Join('/', ruta.Split('/').Select(Uri.EscapeDataString));
}
