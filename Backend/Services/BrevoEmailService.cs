using System.Net.Http.Json;

namespace Backend.Services
{
    public class BrevoEmailService : IEmailService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public BrevoEmailService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _httpClient.BaseAddress = new Uri("https://api.brevo.com/v3/");
        }

        public async Task SendConfirmationCodeAsync(string email, string code)
        {
            var apiKey = _configuration["Brevo:ApiKey"];
            var fromEmail = _configuration["Brevo:FromEmail"];
            var fromName = _configuration["Brevo:FromName"] ?? "Cozymov";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Falta la clave de API de Brevo en la configuración.");
            }

            if (string.IsNullOrWhiteSpace(fromEmail))
            {
                throw new InvalidOperationException("Falta configurar un remitente verificado en Brevo.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, "smtp/email");
            request.Headers.Add("api-key", apiKey);
            request.Content = JsonContent.Create(new
            {
                sender = new { name = fromName, email = fromEmail },
                to = new[] { new { email } },
                subject = "Código de confirmación - Cozymov",
                htmlContent = $@"<h2>Código de confirmación</h2>
                        <p>Tu código es: <strong>{System.Net.WebUtility.HtmlEncode(code)}</strong></p>
                        <p>Este código expira en 10 minutos.</p>"
            });

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"No se pudo enviar el correo con Brevo: {response.StatusCode}. Detalle: {errorContent}");
            }
        }
    }
}
