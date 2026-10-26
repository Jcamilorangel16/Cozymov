using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.DTOs;

[Route("api/[controller]")]
[ApiController]
public class UsuariosController : ControllerBase
{
    private readonly AppDbContext _context;
    public UsuariosController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Usuarios
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListaUsuariosDTO>>> GetUsuarios()
    {
        return await _context.Usuarios.Select(u => new ListaUsuariosDTO
        {
            IdPersonas = u.IdPersonas,
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
    public async Task<IActionResult> PutUsuarios(int idpersonas, Usuarios usuarios)
    {
        if (idpersonas != usuarios.IdPersonas)
        {
            return BadRequest();
        }

        _context.Entry(usuarios).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!UsuariosExists(idpersonas))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    // POST: api/Usuarios
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPost]
    public async Task<ActionResult<UsuariosDTO>> PostUsuarios(UsuariosCreateDTO usuarios)
    {
        var usuario = new Usuarios
        {
            PrimerNombre = usuarios.PrimerNombre,
            SegundoNombre = usuarios.SegundoNombre,
            PrimerApellido = usuarios.PrimerApellido,
            SegundoApellido = usuarios.SegundoApellido,
            Edad = usuarios.Edad,
            Correo = usuarios.Correo,
            Contrasena = usuarios.Contrasena,
            rol = usuarios.rol,
            ocupacion = usuarios.ocupacion
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            "GetUsuarios",
            new { idpersonas = usuario.IdPersonas },
            usuario);
    }

    // DELETE: api/Usuarios/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUsuarios(int id)
    {
        var usuarios = await _context.Usuarios.FindAsync(id);
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
