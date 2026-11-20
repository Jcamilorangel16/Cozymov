using System.Globalization;
using System.Text;

namespace Backend.Services;

/// <summary>
/// Valores canónicos de vehiculo.tipo. Son los únicos que el código escribe y los
/// que admite el CHECK ck_vehiculo_tipo.
/// </summary>
public static class TiposVehiculo
{
    public const string Automovil = "automovil";
    public const string Moto = "moto";
    public const string BicicletaElectrica = "bicicleta_electrica";

    /// <summary>Lista para el CHECK de la base de datos.</summary>
    public static readonly string[] Todos = [Automovil, Moto, BicicletaElectrica];

    public static string SqlCheck =>
        $"tipo IN ({string.Join(", ", Todos.Select(t => $"'{t}'"))})";

    /// <summary>
    /// Convierte variantes ("Automóvil", " MOTO ", "Bicicleta electrica") al valor canónico.
    /// </summary>
    /// <returns>El valor canónico, o null si no corresponde a ningún tipo.</returns>
    public static string? Normalizar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        var descompuesto = valor.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(descompuesto.Length);
        var separadorPendiente = false;
        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsWhiteSpace(c) || c is '_' or '-')
            {
                separadorPendiente = sb.Length > 0;
                continue;
            }

            if (separadorPendiente)
            {
                sb.Append('_');
                separadorPendiente = false;
            }
            sb.Append(char.ToLowerInvariant(c));
        }

        var resultado = sb.ToString();
        return Todos.Contains(resultado) ? resultado : null;
    }
}
