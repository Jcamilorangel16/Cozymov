namespace Backend.Services;

/// <summary>Decide qué mecanismo de envío de correo se usa según la configuración.</summary>
public static class ProveedorCorreo
{
    /// <summary>
    /// Correo:Proveedor = "smtp" o "brevo" fuerza el mecanismo. Sin él, se usa SMTP
    /// si existe Correo:Smtp:Host y Brevo en caso contrario (compatibilidad).
    /// </summary>
    public static bool UsaSmtp(IConfiguration configuracion)
    {
        var proveedor = configuracion["Correo:Proveedor"]?.Trim();
        if (string.Equals(proveedor, "smtp", StringComparison.OrdinalIgnoreCase)) return true;
        if (string.Equals(proveedor, "brevo", StringComparison.OrdinalIgnoreCase)) return false;
        return !string.IsNullOrWhiteSpace(configuracion["Correo:Smtp:Host"]) ||
               !string.IsNullOrWhiteSpace(configuracion["Smtp:Host"]);
    }
}
