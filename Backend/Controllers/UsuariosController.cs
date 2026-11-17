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
    private readonly LimitadorIntentos _limitadorIntentos;

    private const string ErrorDemasiadosIntentos =
        "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.";

    public UsuariosController(
        AppDbContext context,
        IPasswordHasher<Usuarios> passwordHasher,
        IVerificadorCorreo verificadorCorreo,
        LimitadorIntentos limitadorIntentos)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _verificadorCorreo = verificadorCorreo;
        _limitadorIntentos = limitadorIntentos;
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
    public async Task<ActionResult<UsuariosDTO>> GetUsuarios(
        [FromRoute(Name = "idpersonas")] int idPersonas)
    {
        var usuarios = await _context.Usuarios.Where(u => u.IdPersonas == idPersonas).Select(u => new UsuariosDTO
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
        // Cambiar el correo exigiría verificarlo de nuevo; mientras no exista ese
        // flujo, esta ruta no puede asignar una dirección sin confirmar.
        if (!string.Equals(
                NormalizarCorreo(datos.Correo),
                NormalizarCorreo(usuario.Correo),
                StringComparison.Ordinal))
        {
            return BadRequest("El correo no se puede cambiar sin verificarlo.");
        }

        usuario.ocupacion = datos.ocupacion;

       await _context.SaveChangesAsync();

       return NoContent();
    }

    // POST: api/Usuarios and api/registro
    // El comprobante se valida de nuevo en el servidor justo antes de crear la cuenta.
    [HttpPost]
    [HttpPost("/api/registro")]
    [EnableRateLimiting("registro")]
    public async Task<ActionResult<UsuariosDTO>> PostUsuarios(
        UsuariosCreateDTO usuarios,
        CancellationToken cancellationToken)
    {
        var correo = NormalizarCorreo(usuarios.Correo);

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

        ResultadoVerificacionCorreo resultadoVerificacion;
        try
        {
            resultadoVerificacion = _verificadorCorreo.Verificar(
                correo,
                usuarios.Verificacion.Comprobante,
                usuarios.Verificacion.Codigo);
        }
        catch (VerificacionCorreoNoConfiguradaException)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                "La verificación del correo no está configurada.");
        }
        if (!resultadoVerificacion.EsValido)
        {
            return BadRequest(resultadoVerificacion.Error);
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
    [EnableRateLimiting("login")]
    public async Task<ActionResult<UsuariosDTO>> Login(UsuariosLoginDTO datos)
    {
        var correo = (datos.Correo ?? string.Empty).Trim().ToLowerInvariant();
        var contrasena = datos.Contrasena ?? string.Empty;

        // El bloqueo va por correo, exista o no la cuenta: así la respuesta no
        // revela qué correos están registrados.
        var claveIntentos = $"login|{correo}";
        if (_limitadorIntentos.EstaBloqueado(claveIntentos))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, ErrorDemasiadosIntentos);
        }

        var usuario = await _context.Usuarios
           .FirstOrDefaultAsync(u => u.Correo.ToLower() == correo);
        if (usuario == null)
        {
            // Se calcula un hash igualmente: sin él, un correo inexistente
            // respondería mucho más rápido y delataría las cuentas reales.
            _passwordHasher.HashPassword(new Usuarios(), contrasena);
            _limitadorIntentos.RegistrarFallo(claveIntentos);
            return Unauthorized("Credenciales inválidas");
        }

        var resultado = string.IsNullOrEmpty(contrasena)
            ? PasswordVerificationResult.Failed
            : _passwordHasher.VerifyHashedPassword(usuario, usuario.Contrasena, contrasena);
        if (resultado == PasswordVerificationResult.Failed)
        {
            _limitadorIntentos.RegistrarFallo(claveIntentos);
            return Unauthorized("Credenciales inválidas");
        }

        _limitadorIntentos.Reiniciar(claveIntentos);

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

    // POST: api/Usuarios/{idpersonas}/contrasena
    // Cambia la contraseña verificando la actual. Solo lo invoca el proxy de
    // Next.js, que toma el id de la sesión.
    [HttpPost("{idpersonas:int}/contrasena")]
    public async Task<IActionResult> CambiarContrasena(int idpersonas, CambiarContrasenaDTO datos)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.IdPersonas == idpersonas);
        if (usuario == null)
        {
            return NotFound(new { error = "Usuario no encontrado." });
        }

        var actual = datos.ContrasenaActual ?? string.Empty;
        var nueva = datos.NuevaContrasena ?? string.Empty;

        // Misma política que el registro: entre 8 y 72 bytes (límite de bcrypt/Identity).
        if (nueva.Length < 8 || System.Text.Encoding.UTF8.GetByteCount(nueva) > 72)
        {
            return BadRequest(new { error = "La contraseña debe tener entre 8 y 72 bytes." });
        }

        // Una sesión robada no debe poder adivinar la contraseña actual a base de intentos.
        var claveIntentos = $"contrasena|{idpersonas}";
        if (_limitadorIntentos.EstaBloqueado(claveIntentos))
        {
            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new { error = ErrorDemasiadosIntentos });
        }

        var resultado = string.IsNullOrEmpty(actual)
            ? PasswordVerificationResult.Failed
            : _passwordHasher.VerifyHashedPassword(usuario, usuario.Contrasena, actual);
        if (resultado == PasswordVerificationResult.Failed)
        {
            _limitadorIntentos.RegistrarFallo(claveIntentos);
            return Unauthorized(new { error = "La contraseña actual es incorrecta." });
        }

        _limitadorIntentos.Reiniciar(claveIntentos);
        usuario.Contrasena = _passwordHasher.HashPassword(usuario, nueva);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    //POST: api/Usuarios/LoginGoogle
    // Solo lo invoca el servidor de Next.js (X-Internal-Api-Key) después de
    // validar el ID token de Google. No crea cuentas: únicamente identifica o
    // vincula una cuenta Cozymov existente y verificada.
    [HttpPost("LoginGoogle")]
    public async Task<ActionResult<UsuariosDTO>> LoginGoogle(
        UsuariosLoginGoogleDTO datos,
        CancellationToken cancellationToken)
    {
        const string Proveedor = "google";
        var sub = (datos.Sub ?? string.Empty).Trim();
        var correo = (datos.Correo ?? string.Empty).Trim().ToLowerInvariant();
        if (sub.Length is 0 or > 255 || correo.Length is 0 or > 150)
        {
            return BadRequest("La identidad de Google no es válida.");
        }

        if (!datos.EmailVerificado)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                "Google no confirmó el correo de esta cuenta.");
        }

        var identidad = await _context.IdentidadesExternas
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(
                i => i.Proveedor == Proveedor && i.Sub == sub,
                cancellationToken);

        var usuario = identidad?.Usuario;
        if (usuario == null)
        {
            var entorno = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
            if (!entorno.IsDevelopment() &&
                !correo.EndsWith(".edu.co", StringComparison.Ordinal))
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    "Usa una cuenta de Google con correo institucional que termine en .edu.co.");
            }

            usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Correo.ToLower() == correo, cancellationToken);
            if (usuario == null)
            {
                return NotFound("No existe una cuenta de Cozymov con ese correo. Regístrate primero.");
            }

            if (!usuario.EmailVerificado)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    "Debes confirmar tu correo electrónico antes de iniciar sesión.");
            }

            _context.IdentidadesExternas.Add(new IdentidadExterna
            {
                IdUsuario = usuario.IdPersonas,
                Proveedor = Proveedor,
                Sub = sub,
            });
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Otra solicitud vinculó el mismo sub al mismo tiempo: se reintenta como inicio normal.
                _context.ChangeTracker.Clear();
                var existente = await _context.IdentidadesExternas
                    .Include(i => i.Usuario)
                    .FirstOrDefaultAsync(
                        i => i.Proveedor == Proveedor && i.Sub == sub,
                        cancellationToken);
                if (existente == null || existente.Usuario.IdPersonas != usuario.IdPersonas)
                {
                    return Conflict("Esta cuenta de Google ya está vinculada a otro usuario.");
                }
            }
        }

        if (!usuario.EmailVerificado)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                "Debes confirmar tu correo electrónico antes de iniciar sesión.");
        }

        return Ok(new UsuariosDTO
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
        });
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

    private static string NormalizarCorreo(string? correo) =>
        string.Concat((correo ?? string.Empty).Where(caracter => !char.IsWhiteSpace(caracter)))
            .ToLowerInvariant();
}
