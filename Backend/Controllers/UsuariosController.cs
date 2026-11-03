using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Identity;

[Route("api/[controller]")]
[ApiController]
public class UsuariosController : ControllerBase

{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<Usuarios> _passwordHasher;

    public UsuariosController(AppDbContext context, IPasswordHasher<Usuarios> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
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
        var usuario = new Usuarios
        {
            Cedula = usuarios.Cedula,
            PrimerNombre = usuarios.PrimerNombre,
            SegundoNombre = usuarios.SegundoNombre,
            PrimerApellido = usuarios.PrimerApellido,
            SegundoApellido = usuarios.SegundoApellido,
            Edad = usuarios.Edad,
            Correo = usuarios.Correo,
            rol = usuarios.rol,
            ocupacion = usuarios.ocupacion
        };
        usuario.Contrasena = _passwordHasher.HashPassword(usuario, usuarios.Contrasena);

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

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
