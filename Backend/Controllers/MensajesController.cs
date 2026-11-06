using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MensajesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MensajesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Mensajes/chats?yo=1
        [HttpGet("chats")]
        public async Task<ActionResult<IEnumerable<MensajeListaDTO>>> GetChats([FromQuery] int yo)
        {
            // TEMPORAL: cuando exista login, "yo" saldrá del token
            if (yo <= 0)
                return BadRequest("Falta el parámetro yo.");

            return await _context.Mensajes
                .Where(m => m.IdEmisor == yo || m.IdReceptor == yo)
                .GroupBy(m => m.IdEmisor == yo ? m.IdReceptor : m.IdEmisor)
                .Select(g => new MensajeListaDTO
                {
                    Otro = g.Key,
                    UltimoMensaje = g.OrderByDescending(m => m.FechaHora).First().Contenido,
                    UltimaFecha = g.Max(m => m.FechaHora),
                    NoLeidos = g.Count(m => m.IdReceptor == yo && !m.Leido)
                })
                .OrderByDescending(c => c.UltimaFecha)
                .ToListAsync();
        }

        // GET: api/Mensajes/conversacion?yo=1&otro=2
        [HttpGet("conversacion")]
        public async Task<ActionResult<IEnumerable<MensajeDTO>>> GetConversacion(
            [FromQuery] int yo, [FromQuery] int otro)
        {
            // TEMPORAL: cuando exista login, "yo" saldrá del token
            if (yo <= 0 || otro <= 0)
                return BadRequest("Faltan los parámetros yo y otro.");

            var mensajes = await _context.Mensajes
                .Where(m => (m.IdEmisor == yo && m.IdReceptor == otro) ||
                            (m.IdEmisor == otro && m.IdReceptor == yo))
                .OrderBy(m => m.FechaHora)
                .ToListAsync();

            // Marcar como leídos solo los que me llegaron a mí
            var pendientes = mensajes.Where(m => m.IdReceptor == yo && !m.Leido).ToList();
            if (pendientes.Count > 0)
            {
                foreach (var m in pendientes)
                    m.Leido = true;
                await _context.SaveChangesAsync();
            }

            return mensajes.Select(m => new MensajeDTO
            {
                IdMensaje = m.IdMensaje,
                IdEmisor = m.IdEmisor,
                IdReceptor = m.IdReceptor,
                Contenido = m.Contenido,
                FechaHora = m.FechaHora,
                Leido = m.Leido
            }).ToList();
        }

        // GET: api/Mensajes/no-leidos?yo=1
        [HttpGet("no-leidos")]
        public async Task<IActionResult> GetNoLeidos([FromQuery] int yo)
        {
            // TEMPORAL: cuando exista login, "yo" saldrá del token
            var total = await _context.Mensajes
                .CountAsync(m => m.IdReceptor == yo && !m.Leido);

            return Ok(new { total });
        }

        // GET: api/Mensajes/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<MensajeDTO>> GetMensaje(int id)
        {
            // TEMPORAL: con login, verificar que el usuario del token sea emisor o receptor
            var mensaje = await _context.Mensajes
                .Where(m => m.IdMensaje == id)
                .Select(m => new MensajeDTO
                {
                    IdMensaje = m.IdMensaje,
                    IdEmisor = m.IdEmisor,
                    IdReceptor = m.IdReceptor,
                    Contenido = m.Contenido,
                    FechaHora = m.FechaHora,
                    Leido = m.Leido
                }).FirstOrDefaultAsync();

            if (mensaje == null)
                return NotFound();

            return mensaje;
        }

        // POST: api/Mensajes
        [HttpPost]
        public async Task<ActionResult<MensajeDTO>> PostMensaje(MensajeCreateDTO mensajeCreate)
        {
            if (string.IsNullOrWhiteSpace(mensajeCreate.Contenido) || mensajeCreate.Contenido.Length > 500)
                return BadRequest("El mensaje debe tener entre 1 y 500 caracteres.");

            // TEMPORAL: cuando exista login, el emisor saldrá del token
            var idEmisor = mensajeCreate.IdEmisor;

            if (idEmisor == mensajeCreate.IdReceptor)
                return BadRequest("No puedes enviarte un mensaje a ti mismo.");

            var existen = await _context.Usuarios
                .CountAsync(u => u.IdPersonas == idEmisor || u.IdPersonas == mensajeCreate.IdReceptor);
            if (existen < 2)
                return NotFound("El emisor o el destinatario no existe.");

            var mensaje = new Mensaje
            {
                IdEmisor = idEmisor,
                IdReceptor = mensajeCreate.IdReceptor,
                Contenido = mensajeCreate.Contenido.Trim()
            };

            _context.Mensajes.Add(mensaje);
            await _context.SaveChangesAsync();

            var respuesta = new MensajeDTO
            {
                IdMensaje = mensaje.IdMensaje,
                IdEmisor = mensaje.IdEmisor,
                IdReceptor = mensaje.IdReceptor,
                Contenido = mensaje.Contenido,
                FechaHora = mensaje.FechaHora,
                Leido = mensaje.Leido
            };

            return CreatedAtAction(nameof(GetMensaje), new { id = mensaje.IdMensaje }, respuesta);
        }
    }
}
