using System.Net;
using System.Net.Mail;
using FloodView.Api.Models;

namespace FloodView.Api.Services;

public record ResultadoEmail(bool Enviado, string Mensagem);

public class OcorrenciaEmail(IConfiguration configuration, ILogger<OcorrenciaEmail> logger)
{
    public async Task<ResultadoEmail> Enviar(Ocorrencia ocorrencia)
    {
        var config = configuration.GetSection("Email");
        if (!config.GetValue<bool>("Habilitado") ||
            new[] { "Host", "Remetente", "Destinatario" }.Any(key => string.IsNullOrWhiteSpace(config[key])))
            return new(false, "E-mail não enviado: configure o serviço de e-mail no backend.");

        try
        {
            using var message = new MailMessage();
            message.From = new MailAddress(config["Remetente"]!, "FloodView");
            message.To.Add(new MailAddress(config["Destinatario"]!));
            if (!string.IsNullOrWhiteSpace(ocorrencia.Email))
                message.ReplyToList.Add(new MailAddress(ocorrencia.Email));
            message.Subject = $"FloodView — Ocorrência #{ocorrencia.Id} ({ocorrencia.Tipo})";
            message.Body = $"Ocorrência #{ocorrencia.Id}\nData (UTC): {ocorrencia.RegistradaEmUtc:yyyy-MM-dd HH:mm:ss}\n" +
                $"Nome: {ocorrencia.Nome}\nE-mail: {ocorrencia.Email}\nDepartamento: {ocorrencia.Departamento}\n" +
                $"Tipo: {ocorrencia.Tipo}\n\n{ocorrencia.Descricao}";
            message.IsBodyHtml = false;
            using var client = new SmtpClient(config["Host"], config.GetValue("Porta", 587))
            {
                EnableSsl = config.GetValue("UsarTls", true),
                UseDefaultCredentials = false
            };
            if (!string.IsNullOrWhiteSpace(config["Usuario"]))
                client.Credentials = new NetworkCredential(config["Usuario"], config["Senha"]);
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(6));
            await client.SendMailAsync(message, timeout.Token);
            return new(true, "E-mail encaminhado ao servidor de envio para a equipe responsável.");
        }
        catch (Exception error) when (error is SmtpException or OperationCanceledException or FormatException or ArgumentException or InvalidOperationException)
        {
            logger.LogWarning("Falha no e-mail da ocorrência {Id}: {Tipo}", ocorrencia.Id, error.GetType().Name);
            return new(false, "E-mail não confirmado pelo servidor. Verifique a configuração e a conexão do serviço de e-mail; não reenvie o formulário, pois a ocorrência já foi salva.");
        }
    }
}
