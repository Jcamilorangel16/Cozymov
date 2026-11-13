using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

/// <summary>
/// Registro temporal creado mientras un usuario confirma su correo.
/// No contiene datos personales ni contraseña: solo el correo, el hash del
/// código enviado y el token que autoriza la creación de la cuenta.
/// </summary>
[Table("registro_pendiente")]
public class RegistroPendiente
{
    [Key]
    [Column("id_registro_pendiente")]
    public long IdRegistroPendiente { get; set; }

    [Column("correo")]
    [StringLength(150)]
    public string Correo { get; set; } = string.Empty;

    [Column("codigo_hash")]
    [StringLength(256)]
    public string CodigoHash { get; set; } = string.Empty;

    [Column("codigo_expira_en", TypeName = "timestamp with time zone")]
    public DateTime CodigoExpiraEn { get; set; }

    [Column("intentos")]
    public int Intentos { get; set; }

    [Column("envios")]
    public int Envios { get; set; }

    [Column("primer_envio_en", TypeName = "timestamp with time zone")]
    public DateTime PrimerEnvioEn { get; set; }

    [Column("ultimo_envio_en", TypeName = "timestamp with time zone")]
    public DateTime UltimoEnvioEn { get; set; }

    [Column("verificado_en", TypeName = "timestamp with time zone")]
    public DateTime? VerificadoEn { get; set; }

    [Column("token_hash")]
    [StringLength(128)]
    public string? TokenHash { get; set; }

    [Column("token_expira_en", TypeName = "timestamp with time zone")]
    public DateTime? TokenExpiraEn { get; set; }

    [Column("creado_en", TypeName = "timestamp with time zone")]
    public DateTime CreadoEn { get; set; }
}
