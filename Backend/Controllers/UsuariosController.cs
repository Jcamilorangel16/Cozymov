using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Identity;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;

[Route("api/[controller]")]
[ApiController]
public class UsuariosController : ControllerBase

{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<Usuarios> _passwordHasher;
    private readonly IEmailService _emailService;

    public UsuariosController(AppDbContext context, IPasswordHasher<Usuarios> passwordHasher, IEmailService emailService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
    }

    // GET: api/Usuarios
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListaUsuariosDTO>>> GetUsuarios()
    {
        return await _context.Usuarios.Select(u => new ListaUsuariosDTO
        {
            IdPersonas = u.IdPersonas,
            Cedula = u.Cedula,
            PrimerNombre = u.PrimerNombre,
            SegundoNombre = u.SegundoNombre,
            PrimerApellido = u.PrimerApellido,
            SegundoApellido = u.SegundoApellido,
            Edad = u.Edad,
            ocupacion = u.ocupacion,
            rol = u.rol,
            fechaderegistro = u.fechaderegistro
        }).ToListAsync();
    }

    // GET: api/Usuarios/5
    [HttpGet("{idpersonas}")]
    public async Task<ActionResult<UsuariosDTO>> GetUsuarios(int Id)
    {
        var usuarios = await _context.Usuarios.Where(u => u.IdPersonas == Id).Select(u => new UsuariosDTO
        {
            IdPersonas = u.IdPersonas,
            Cedula = u.Cedula,
            PrimerNombre = u.PrimerNombre,
            SegundoNombre = u.SegundoNombre,
            PrimerApellido = u.PrimerApellido,
            SegundoApellido = u.SegundoApellido,
            Edad = u.Edad,
            ocupacion = u.ocupacion,
            rol = u.rol,
            fechaderegistro = u.fechaderegistro
        }).FirstOrDefaultAsync();

        if (usuarios == null)
        {
            return NotFound();
        }

        return usuarios;
    }

    // PUT: api/Usuarios/5
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPut("{idpersonas}")]
    public async Task<IActionResult> PutUsuarios(
         int ID,
         UsuariosUpdateDTO datos)
    {
        var usuario = await _context.Usuarios.FindAsync(ID);

        if (usuario == null)
        {
            return NotFound();
        }

        usuario.Cedula = datos.Cedula;
        usuario.PrimerNombre = datos.PrimerNombre;
        usuario.SegundoNombre = datos.SegundoNombre;
        usuario.PrimerApellido = datos.PrimerApellido;
        usuario.SegundoApellido = datos.SegundoApellido;
        usuario.Edad = datos.Edad;
        usuario.Correo = datos.Correo;
        usuario.ocupacion = datos.ocupacion;

       await _context.SaveChangesAsync();

       return NoContent();
    }

    // POST: api/Usuarios
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPost]
    public async Task<ActionResult<UsuariosDTO>> PostUsuarios(UsuariosCreateDTO usuarios)
    {
        var correo = usuarios.Correo?.Trim();
        if (!EsCorreoInstitucional(correo))
        {
            return BadRequest("Usa un correo institucional válido terminado en .edu.co.");
        }

        var correoNormalizado = correo!.ToLowerInvariant();
        var verificacion = await _context.VerificacionesCorreo
            .FirstOrDefaultAsync(v => v.Correo == correoNormalizado);

        if (verificacion?.VerificadoEn is null || verificacion.ExpiraEn <= DateTime.UtcNow)
        {
            return BadRequest("Correo no verificado. Verifica tu correo antes de crear la cuenta.");
        }

        if (await _context.Usuarios.AnyAsync(u => u.Correo.ToLower() == correoNormalizado))
        {
            return Conflict("Ya existe una cuenta con ese correo.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var usuario = new Usuarios
        {
            Cedula = usuarios.Cedula,
            PrimerNombre = usuarios.PrimerNombre,
            SegundoNombre = usuarios.SegundoNombre,
            PrimerApellido = usuarios.PrimerApellido,
            SegundoApellido = usuarios.SegundoApellido,
            Edad = usuarios.Edad,
            Correo = correoNormalizado,
            rol = usuarios.rol,
            ocupacion = usuarios.ocupacion,
            EmailConfirmed = true
        };
        usuario.Contrasena = _passwordHasher.HashPassword(usuario, usuarios.Contrasena);

        _context.Usuarios.Add(usuario);
        _context.VerificacionesCorreo.Remove(verificacion);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var respuesta = new UsuariosDTO
        {
            IdPersonas = usuario.IdPersonas,
            Cedula = usuario.Cedula,
            PrimerNombre = usuario.PrimerNombre,
            SegundoNombre = usuario.SegundoNombre,
            PrimerApellido = usuario.PrimerApellido,
            SegundoApellido = usuario.SegundoApellido,
            Edad = usuario.Edad,
            rol = usuario.rol,
            ocupacion = usuario.ocupacion,
            fechaderegistro = usuario.fechaderegistro
        };

        return CreatedAtAction(
            "GetUsuarios",
            new { idpersonas = usuario.IdPersonas },
            respuesta);
    }

    [HttpPost("EnviarCodigoConfirmacion")]
    public async Task<IActionResult> EnviarCodigoConfirmacion([FromBody] EnviarCodigoConfirmacionDTO datos)
    {
        var correo = datos.Correo?.Trim();
        if (!EsCorreoInstitucional(correo))
        {
            return BadRequest("Usa un correo institucional válido terminado en .edu.co.");
        }

        var correoNormalizado = correo!.ToLowerInvariant();
        var usuarioExistente = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Correo.ToLower() == correoNormalizado);
        if (usuarioExistente?.EmailConfirmed == true)
        {
            return Conflict("Ya existe una cuenta con ese correo.");
        }

        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var verificacion = await _context.VerificacionesCorreo
            .FirstOrDefaultAsync(v => v.Correo == correoNormalizado);
        if (verificacion is null)
        {
            verificacion = new VerificacionCorreo { Correo = correoNormalizado };
            _context.VerificacionesCorreo.Add(verificacion);
        }
        verificacion.CodigoHash = HashCodigo(codigo);
        verificacion.ExpiraEn = DateTime.UtcNow.AddMinutes(10);
        verificacion.VerificadoEn = null;
        verificacion.IntentosFallidos = 0;
        await _context.SaveChangesAsync();

        try
        {
            await _emailService.SendConfirmationCodeAsync(correoNormalizado, codigo);
            return Ok(new { mensaje = "Código enviado correctamente al correo." });
        }
        catch (Exception ex)
        {
            _context.VerificacionesCorreo.Remove(verificacion);
            await _context.SaveChangesAsync();
            return StatusCode(500, new { mensaje = "No se pudo enviar el código.", detalle = ex.Message });
        }
    }

    [HttpPost("ConfirmarCodigo")]
    public async Task<IActionResult> ConfirmarCodigo([FromBody] ConfirmarCodigoDTO datos)
    {
        if (string.IsNullOrWhiteSpace(datos.Correo) || string.IsNullOrWhiteSpace(datos.Codigo))
        {
            return BadRequest("Correo y código son obligatorios.");
        }

        var correo = datos.Correo.Trim().ToLowerInvariant();
        var verificacion = await _context.VerificacionesCorreo
            .FirstOrDefaultAsync(v => v.Correo == correo);
        if (verificacion is null || verificacion.CodigoHash is null)
        {
            return BadRequest("Solicita un código de verificación antes de continuar.");
        }

        if (verificacion.ExpiraEn <= DateTime.UtcNow)
        {
            return BadRequest("El código ha expirado. Solicita uno nuevo.");
        }

        if (verificacion.IntentosFallidos >= 5)
        {
            return BadRequest("Se agotaron los intentos. Solicita un código nuevo.");
        }

        var codigoHash = HashCodigo(datos.Codigo.Trim());
        if (!CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(verificacion.CodigoHash),
                Convert.FromHexString(codigoHash)))
        {
            verificacion.IntentosFallidos++;
            await _context.SaveChangesAsync();
            return BadRequest("El código ingresado es incorrecto.");
        }

        verificacion.CodigoHash = null;
        verificacion.VerificadoEn = DateTime.UtcNow;
        var usuarioExistente = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Correo.ToLower() == correo);
        if (usuarioExistente is not null)
        {
            usuarioExistente.EmailConfirmed = true;
            _context.VerificacionesCorreo.Remove(verificacion);
        }
        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Correo confirmado correctamente." });
    }

    private static bool EsCorreoInstitucional(string? correo)
    {
        return !string.IsNullOrWhiteSpace(correo)
            && MailAddress.TryCreate(correo, out var direccion)
            && string.Equals(direccion.Address, correo, StringComparison.OrdinalIgnoreCase)
            && direccion.Host.EndsWith(".edu.co", StringComparison.OrdinalIgnoreCase);
    }

    private static string HashCodigo(string codigo)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(codigo)));
    }

    //POST: api/Usuarios/Login
    [HttpPost("Login")]
    public async Task<ActionResult<UsuariosDTO>> Login(UsuariosLoginDTO datos)
    {
        var usuario = await _context.Usuarios
           .FirstOrDefaultAsync(u => u.Correo == datos.Correo);
        if (usuario == null)
        {
            return Unauthorized("Credenciales inválidas");
        }

        if (!usuario.EmailConfirmed)
        {
            return Unauthorized("Debes confirmar tu correo antes de iniciar sesión.");
        }

        var resultado = _passwordHasher.VerifyHashedPassword(usuario, usuario.Contrasena, datos.Contrasena);
        if (resultado == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Credenciales inválidas");
        }

        var respuesta = new UsuariosDTO
        {
            IdPersonas = usuario.IdPersonas,
            Cedula = usuario.Cedula,
            PrimerNombre = usuario.PrimerNombre,
            SegundoNombre = usuario.SegundoNombre,
            PrimerApellido = usuario.PrimerApellido,
            SegundoApellido = usuario.SegundoApellido,
            Edad = usuario.Edad,
            Correo = usuario.Correo,
            rol = usuario.rol,
            ocupacion = usuario.ocupacion,
            fechaderegistro = usuario.fechaderegistro
        };

        return Ok(respuesta);

    }

    // DELETE: api/Usuarios/5
    [HttpDelete("{Id}")]
    public async Task<IActionResult> DeleteUsuarios(int IdPersonas)
    {
        var usuarios = await _context.Usuarios.FindAsync(IdPersonas);
        if (usuarios == null)
        {
            return NotFound();
        }

        _context.Usuarios.Remove(usuarios);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool UsuariosExists(int id)
    {
        return _context.Usuarios.Any(e => e.IdPersonas == id);
    }
}
