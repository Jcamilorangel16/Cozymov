using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("telefono_usuario")]
public class TelefonoUsuario
{
    [Key]
    [Column("id_telefono")]
    public long IdTelefono { get; set; }

    [Column("id_usuario")]
    public int IdUsuario { get; set; }
    public Usuarios Usuario { get; set; } = null!;

    [Required, StringLength(20)]
    [Column("telefono")]
    public string Telefono { get; set; } = string.Empty;
}
