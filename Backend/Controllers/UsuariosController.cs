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
    private readonly LimitadorIntentos _limitadorIntentos;

    private const string ErrorDemasiadosIntentos =
        "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.";

    private const string ProveedorGoogle = "google";
    private const string ProveedorMicrosoft = "microsoft";

    /// <summary>Dominio que la universidad administra en su tenant de Microsoft.</summary>
    private const string DominioInstitucionalMicrosoft = "unicesar.edu.co";

    /// <summary>Único dominio con el que se puede crear una cuenta usando Google.</summary>
    private const string DominioRegistroGoogle = "unicesar.edu.co";

    private static readonly System.Text.RegularExpressions.Regex FormatoCorreo = new(
        @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    /// <summary>
    /// Celular colombiano: 10 dígitos que empiezan por 3, con o sin el indicativo 57.
    /// Se usa [0-9] y no \d para no aceptar dígitos Unicode de otros sistemas.
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex FormatoCelular = new(
        @"^(?:\+?57)?(3[0-9]{9})$",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    private const string ErrorCelular =
        "Ingresa un celular colombiano válido: 10 dígitos que empiezan por 3.";

    public UsuariosController(
        AppDbContext context,
        IPasswordHasher<Usuarios> passwordHasher,
        LimitadorIntentos limitadorIntentos)
    {
        _context = context;
        _passwordHasher = passwordHasher;
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
        // El correo identifica la cuenta y no se puede cambiar desde el perfil.
        if (!string.Equals(
                NormalizarCorreo(datos.Correo),
                NormalizarCorreo(usuario.Correo),
                StringComparison.Ordinal))
        {
            return BadRequest("El correo no se puede cambiar.");
        }

        usuario.ocupacion = datos.ocupacion;

       await _context.SaveChangesAsync();

       return NoContent();
    }

    // POST: api/Usuarios and api/registro
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

        // Fuera de Development solo se admiten correos institucionales .edu.co.
        var entorno = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        if (correo.Length > 150 ||
            !FormatoCorreo.IsMatch(correo) ||
            (!entorno.IsDevelopment() && !correo.EndsWith(".edu.co", StringComparison.Ordinal)))
        {
            return BadRequest("Ingresa un correo institucional válido que termine en .edu.co.");
        }

        if (string.IsNullOrWhiteSpace(usuarios.Contrasena))
        {
            return BadRequest("La contraseña es obligatoria.");
        }

        var telefono = NormalizarCelular(usuarios.Telefono);
        if (telefono == null)
        {
            return BadRequest(ErrorCelular);
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
            ocupacion = usuarios.ocupacion
        };
        usuario.Contrasena = _passwordHasher.HashPassword(usuario, usuarios.Contrasena);
        // Se inserta con la cuenta en el mismo SaveChanges: no queda una cuenta sin celular.
        usuario.Telefonos.Add(new TelefonoUsuario { Telefono = telefono });

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
    // vincula una cuenta Cozymov existente.
    [HttpPost("LoginGoogle")]
    public Task<ActionResult<UsuariosDTO>> LoginGoogle(
        UsuariosLoginGoogleDTO datos,
        CancellationToken cancellationToken) =>
        IniciarConIdentidadExterna(
            ProveedorGoogle,
            "Google",
            datos.Sub,
            datos.Correo,
            datos.EmailVerificado,
            correo => correo.EndsWith(".edu.co", StringComparison.Ordinal),
            "Usa una cuenta de Google con correo institucional que termine en .edu.co.",
            cancellationToken);

    //POST: api/Usuarios/LoginMicrosoft
    // Solo lo invoca el servidor de Next.js (X-Internal-Api-Key) después de
    // validar el ID token de Microsoft: firma, emisor, tenant de la universidad
    // y que la cuenta sea miembro, no invitada. Ese tenant administra el
    // correo, así que se considera confirmado. Sub es "tid:oid". No crea
    // cuentas: únicamente identifica o vincula una cuenta Cozymov existente.
    [HttpPost("LoginMicrosoft")]
    public Task<ActionResult<UsuariosDTO>> LoginMicrosoft(
        UsuariosLoginMicrosoftDTO datos,
        CancellationToken cancellationToken) =>
        IniciarConIdentidadExterna(
            ProveedorMicrosoft,
            "Microsoft",
            datos.Sub,
            datos.Correo,
            correoConfirmado: true,
            // Dominio exacto: se rechazan subdominios y sufijos parecidos.
            correo => correo.EndsWith("@" + DominioInstitucionalMicrosoft, StringComparison.Ordinal),
            $"Usa tu cuenta institucional de Microsoft (@{DominioInstitucionalMicrosoft}).",
            cancellationToken);

    /// <summary>
    /// Identifica la cuenta vinculada a una identidad externa ya validada por
    /// Next.js. Si no hay vínculo, la vincula con la cuenta del mismo correo
    /// (fuera de Development, solo si <paramref name="correoAdmitido"/> lo acepta).
    /// </summary>
    private async Task<ActionResult<UsuariosDTO>> IniciarConIdentidadExterna(
        string proveedor,
        string nombreProveedor,
        string? subRecibido,
        string? correoRecibido,
        bool correoConfirmado,
        Func<string, bool> correoAdmitido,
        string errorCorreo,
        CancellationToken cancellationToken)
    {
        var sub = (subRecibido ?? string.Empty).Trim();
        var correo = (correoRecibido ?? string.Empty).Trim().ToLowerInvariant();
        if (sub.Length is 0 or > 255 || correo.Length is 0 or > 150)
        {
            return BadRequest($"La identidad de {nombreProveedor} no es válida.");
        }

        if (!correoConfirmado)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                $"{nombreProveedor} no confirmó el correo de esta cuenta.");
        }

        var identidad = await _context.IdentidadesExternas
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(
                i => i.Proveedor == proveedor && i.Sub == sub,
                cancellationToken);

        var usuario = identidad?.Usuario;
        if (usuario == null)
        {
            var entorno = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
            if (!entorno.IsDevelopment() && !correoAdmitido(correo))
            {
                return StatusCode(StatusCodes.Status403Forbidden, errorCorreo);
            }

            usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Correo.ToLower() == correo, cancellationToken);
            if (usuario == null)
            {
                return NotFound("No existe una cuenta de Cozymov con ese correo. Regístrate primero.");
            }

            _context.IdentidadesExternas.Add(new IdentidadExterna
            {
                IdUsuario = usuario.IdPersonas,
                Proveedor = proveedor,
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
                        i => i.Proveedor == proveedor && i.Sub == sub,
                        cancellationToken);
                if (existente == null || existente.Usuario.IdPersonas != usuario.IdPersonas)
                {
                    return Conflict($"Esta cuenta de {nombreProveedor} ya está vinculada a otro usuario.");
                }
            }
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

    //POST: api/Usuarios/RegistroGoogle
    // Solo lo invoca el servidor de Next.js (X-Internal-Api-Key) con la identidad
    // de Google que validó en el callback y la contraseña que creó el usuario.
    // Crea la cuenta y la vincula a Google en la misma transacción. Solo admite
    // correos verificados @unicesar.edu.co, también en Development.
    [HttpPost("RegistroGoogle")]
    [EnableRateLimiting("registro")]
    public Task<ActionResult<UsuariosDTO>> RegistroGoogle(
        UsuariosRegistroGoogleDTO datos,
        CancellationToken cancellationToken) =>
        RegistrarConIdentidadExterna(
            ProveedorGoogle, "Google", datos, datos.EmailVerificado, cancellationToken);

    //POST: api/Usuarios/RegistroMicrosoft
    // Igual que RegistroGoogle, con la identidad de Microsoft ("tid:oid") que
    // Next.js validó contra el tenant de la universidad (solo cuentas miembro;
    // ese tenant administra el correo). Solo admite @unicesar.edu.co, también
    // en Development.
    [HttpPost("RegistroMicrosoft")]
    [EnableRateLimiting("registro")]
    public Task<ActionResult<UsuariosDTO>> RegistroMicrosoft(
        UsuariosRegistroMicrosoftDTO datos,
        CancellationToken cancellationToken) =>
        RegistrarConIdentidadExterna(
            ProveedorMicrosoft, "Microsoft", datos, correoConfirmado: true, cancellationToken);

    /// <summary>
    /// Crea una cuenta y la vincula a la identidad externa en un solo
    /// SaveChanges. Exige el dominio @unicesar.edu.co en cualquier entorno.
    /// </summary>
    private async Task<ActionResult<UsuariosDTO>> RegistrarConIdentidadExterna(
        string proveedor,
        string nombreProveedor,
        UsuariosRegistroExternoDTO datos,
        bool correoConfirmado,
        CancellationToken cancellationToken)
    {
        var sub = (datos.Sub ?? string.Empty).Trim();
        var correo = NormalizarCorreo(datos.Correo);
        if (sub.Length is 0 or > 255 ||
            correo.Length is 0 or > 150 ||
            !FormatoCorreo.IsMatch(correo))
        {
            return BadRequest($"La identidad de {nombreProveedor} no es válida.");
        }

        if (!correoConfirmado)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                $"{nombreProveedor} no confirmó el correo de esta cuenta.");
        }

        // Coincidencia exacta del dominio: se rechazan subdominios y sufijos
        // como "unicesar.edu.co.otro.com".
        if (!correo.EndsWith("@" + DominioRegistroGoogle, StringComparison.Ordinal))
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                $"Solo puedes registrarte con {nombreProveedor} usando tu correo @{DominioRegistroGoogle}.");
        }

        var cedula = (datos.Cedula ?? string.Empty).Trim();
        var primerNombre = (datos.PrimerNombre ?? string.Empty).Trim();
        var primerApellido = (datos.PrimerApellido ?? string.Empty).Trim();
        var ocupacion = (datos.Ocupacion ?? string.Empty).Trim();
        if (cedula.Length == 0 || primerNombre.Length == 0 ||
            primerApellido.Length == 0 || ocupacion.Length == 0)
        {
            return BadRequest("Completa todos los campos.");
        }

        var telefono = NormalizarCelular(datos.Telefono);
        if (telefono == null)
        {
            return BadRequest(ErrorCelular);
        }

        // Misma política que el registro normal: entre 8 y 72 bytes (límite de bcrypt/Identity).
        var contrasena = datos.Contrasena ?? string.Empty;
        if (contrasena.Length < 8 || System.Text.Encoding.UTF8.GetByteCount(contrasena) > 72)
        {
            return BadRequest("La contraseña debe tener entre 8 y 72 bytes.");
        }

        if (await _context.IdentidadesExternas.AnyAsync(
                i => i.Proveedor == proveedor && i.Sub == sub,
                cancellationToken))
        {
            return Conflict(
                $"Esta cuenta de {nombreProveedor} ya está registrada. Inicia sesión con {nombreProveedor}.");
        }

        if (await _context.Usuarios.AnyAsync(
                usuario => usuario.Correo.ToLower() == correo,
                cancellationToken))
        {
            return Conflict($"Ese correo ya está registrado. Inicia sesión con {nombreProveedor}.");
        }

        if (await _context.Usuarios.AnyAsync(
                usuario => usuario.Cedula == cedula,
                cancellationToken))
        {
            return Conflict("Esa cédula ya está registrada.");
        }

        var usuario = new Usuarios
        {
            Cedula = cedula,
            PrimerNombre = primerNombre,
            SegundoNombre = (datos.SegundoNombre ?? string.Empty).Trim(),
            PrimerApellido = primerApellido,
            SegundoApellido = (datos.SegundoApellido ?? string.Empty).Trim(),
            Edad = datos.Edad,
            Correo = correo,
            rol = "usuario",
            ocupacion = ocupacion
        };
        // Con esta contraseña la cuenta también puede entrar sin el proveedor.
        usuario.Contrasena = _passwordHasher.HashPassword(usuario, contrasena);
        usuario.Telefonos.Add(new TelefonoUsuario { Telefono = telefono });

        _context.Usuarios.Add(usuario);
        _context.IdentidadesExternas.Add(new IdentidadExterna
        {
            Usuario = usuario,
            Proveedor = proveedor,
            Sub = sub,
        });

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Otra solicitud registró el mismo correo, cédula o identidad externa a la vez.
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

    /// <summary>
    /// Normaliza un celular colombiano al formato E.164 (+573001234567), ignorando
    /// espacios, guiones, puntos y paréntesis.
    /// </summary>
    /// <returns>El número normalizado, o null si no es un celular válido.</returns>
    private static string? NormalizarCelular(string? telefono)
    {
        var limpio = string.Concat((telefono ?? string.Empty)
            .Where(caracter => !char.IsWhiteSpace(caracter) && caracter is not ('-' or '.' or '(' or ')')));
        var coincidencia = FormatoCelular.Match(limpio);
        return coincidencia.Success ? "+57" + coincidencia.Groups[1].Value : null;
    }
}
