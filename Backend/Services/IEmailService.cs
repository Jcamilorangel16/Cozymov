namespace Backend.Services
{
    public interface IEmailService
    {
        Task SendConfirmationCodeAsync(string email, string code);
    }
}
