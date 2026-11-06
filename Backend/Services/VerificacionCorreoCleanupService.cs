using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public sealed class VerificacionCorreoCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<VerificacionCorreoCleanupService> _logger;

        public VerificacionCorreoCleanupService(
            IServiceScopeFactory scopeFactory,
            ILogger<VerificacionCorreoCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await using var scope = _scopeFactory.CreateAsyncScope();
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var eliminadas = await context.VerificacionesCorreo
                        .Where(v => v.ExpiraEn <= DateTime.UtcNow)
                        .ExecuteDeleteAsync(stoppingToken);

                    if (eliminadas > 0)
                    {
                        _logger.LogInformation(
                            "Se eliminaron {Count} verificaciones de correo caducadas.",
                            eliminadas);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "No se pudieron limpiar las verificaciones de correo caducadas.");
                }
            }
        }
    }
}
