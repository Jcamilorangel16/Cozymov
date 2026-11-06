using System.Net.Http.Json;

namespace Backend.Services
{
    public class ResendEmailService : IEmailService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public ResendEmailService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _httpClient.BaseAddress = new Uri("https://api.resend.com/");
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_configuration["Resend:ApiKey"]}");
        }

        public async Task SendConfirmationCodeAsync(string email, string code)
        {
            var apiKey = _configuration["Resend:ApiKey"];
            var fromEmail = _configuration["Resend:FromEmail"] ?? "onboarding@resend.dev";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Falta la clave de API de Resend en la configuración.");
            }

            var payload = new
            {
                from = fromEmail,
                to = new[] { email },
                subject = "Código de confirmación - Cozymov",
                html = $@"<h2>Código de confirmación</h2>
                        <p>Tu código es: <strong>{code}</strong></p>
                        <p>Este código expira en 10 minutos.</p>"
            };

            var response = await _httpClient.PostAsJsonAsync("emails", payload);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"No se pudo enviar el correo: {response.StatusCode}. Detalle: {errorContent}");
            }
        }
    }
}
