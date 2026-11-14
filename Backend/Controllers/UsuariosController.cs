using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;

[Route("api/[controller]")]
[ApiController]
public class UsuariosController : ControllerBase

{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<Usuarios> _passwordHasher;
    private readonly IVerificadorCorreo _verificadorCorreo;

    public UsuariosController(
        AppDbContext context,
        IPasswordHasher<Usuarios> passwordHasher,
        IVerificadorCorreo verificadorCorreo)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _verificadorCorreo = verificadorCorreo;
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
    public async Task<ActionResult<UsuariosDTO>> GetUsuarios(int idpersonas)
    {
        var usuarios = await _context.Usuarios.Where(u => u.IdPersonas == idpersonas).Select(u => new UsuariosDTO
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
         int idpersonas,
         UsuariosUpdateDTO datos)
    {
        var usuario = await _context.Usuarios.FindAsync(idpersonas);

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

    // POST: api/Usuarios and api/registro
    // El comprobante se valida de nuevo en el servidor justo antes de crear la cuenta.
    [HttpPost]
    [HttpPost("/api/registro")]
    [EnableRateLimiting("verificacion-correo")]
    public async Task<ActionResult<UsuariosDTO>> PostUsuarios(
        UsuariosCreateDTO usuarios,
        CancellationToken cancellationToken)
    {
        var correo = (usuarios.Correo ?? string.Empty).Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(correo))
        {
            return BadRequest("El correo es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(usuarios.Contrasena))
        {
            return BadRequest("La contraseña es obligatoria.");
        }

        if (usuarios.Verificacion is null)
        {
            return BadRequest("Debes confirmar tu correo antes de crear la cuenta.");
        }

        var resultadoVerificacion = _verificadorCorreo.Verificar(
            correo,
            usuarios.Verificacion.Comprobante,
            usuarios.Verificacion.Codigo);
        if (!resultadoVerificacion.EsValido)
        {
            return BadRequest(resultadoVerificacion.Error);
        }

        if (await _context.Usuarios.AnyAsync(
                usuario => usuario.Correo.ToLower() == correo,
                cancellationToken))
        {
            return Conflict("Ese correo ya está registrado.");
        }

        if (!string.IsNullOrWhiteSpace(usuarios.Cedula) &&
            await _context.Usuarios.AnyAsync(
                usuario => usuario.Cedula == usuarios.Cedula,
                cancellationToken))
        {
            return Conflict("Esa cédula ya está registrada.");
        }

        var usuario = new Usuarios
        {
            Cedula = usuarios.Cedula,
            PrimerNombre = usuarios.PrimerNombre,
            SegundoNombre = usuarios.SegundoNombre,
            PrimerApellido = usuarios.PrimerApellido,
            SegundoApellido = usuarios.SegundoApellido,
            Edad = usuarios.Edad,
            Correo = correo,
            rol = usuarios.rol,
            ocupacion = usuarios.ocupacion,
            EmailVerificado = true
        };
        usuario.Contrasena = _passwordHasher.HashPassword(usuario, usuarios.Contrasena);

        _context.Usuarios.Add(usuario);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Conflict(
                "No se pudo crear la cuenta. Verifica que el correo y la cédula no estén registrados.");
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

        return CreatedAtAction(
            "GetUsuarios",
            new { idpersonas = usuario.IdPersonas },
            respuesta);
    }

    //POST: api/Usuarios/Login
    [HttpPost("Login")]
    public async Task<ActionResult<UsuariosDTO>> Login(UsuariosLoginDTO datos)
    {
        var correo = (datos.Correo ?? string.Empty).Trim().ToLowerInvariant();
        var usuario = await _context.Usuarios
           .FirstOrDefaultAsync(u => u.Correo.ToLower() == correo);
        if (usuario == null)
        {
            return Unauthorized("Credenciales inválidas");
        }

        var resultado = _passwordHasher.VerifyHashedPassword(usuario, usuario.Contrasena, datos.Contrasena);
        if (resultado == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Credenciales inválidas");
        }

        // Sin correo confirmado no se permite iniciar sesión.
        if (!usuario.EmailVerificado)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                "Debes confirmar tu correo electrónico antes de iniciar sesión.");
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
    [HttpDelete("{idpersonas}")]
    public async Task<IActionResult> DeleteUsuarios(int idpersonas)
    {
        var usuarios = await _context.Usuarios.FindAsync(idpersonas);
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
