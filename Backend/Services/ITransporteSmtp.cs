using MailKit;
using MailKit.Net.Smtp;
using MimeKit;

namespace Backend.Services;

/// <summary>Entrega un mensaje ya construido a un servidor SMTP.</summary>
public interface ITransporteSmtp
{
    Task EnviarAsync(OpcionesSmtp opciones, MimeMessage mensaje, CancellationToken cancellationToken);
}

/// <summary>Transporte real basado en MailKit.</summary>
public sealed class TransporteSmtpMailKit : ITransporteSmtp
{
    private static readonly TimeSpan Espera = TimeSpan.FromSeconds(15);

    public async Task EnviarAsync(OpcionesSmtp opciones, MimeMessage mensaje, CancellationToken cancellationToken)
    {
        using var cliente = new SmtpClient { Timeout = (int)Espera.TotalMilliseconds };
        try
        {
            await cliente.ConnectAsync(opciones.Host, opciones.Puerto, opciones.OpcionesSocket, cancellationToken);
            if (opciones.Usuario is not null && opciones.Password is not null)
            {
                await cliente.AuthenticateAsync(opciones.Usuario, opciones.Password, cancellationToken);
            }

            await cliente.SendAsync(new SendRequest(mensaje), cancellationToken);
        }
        finally
        {
            if (cliente.IsConnected)
            {
                await cliente.DisconnectAsync(quit: true, CancellationToken.None);
            }
        }
    }
}
