using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FloodView.Api.Models;

namespace FloodView.Api.Services;

public record ResultadoEmail(bool Enviado, string Mensagem);

public class OcorrenciaEmail(
    IConfiguration configuration,
    ILogger<OcorrenciaEmail> logger,
    HttpClient httpClient)
{
    private const string Endpoint = "https://api.brevo.com/v3/smtp/email";

    public async Task<ResultadoEmail> Enviar(Ocorrencia ocorrencia)
    {
        var config = configuration.GetSection("Email");
        var apiKey = config["ApiKey"];
        var remetente = config["Remetente"];
        var destinatario = config["Destinatario"];

        if (!config.GetValue<bool>("Habilitado") ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(remetente) ||
            string.IsNullOrWhiteSpace(destinatario))
            return new(false, "E-mail não enviado: configure a chave da API, o remetente verificado e o destinatário no backend.");

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            request.Headers.Add("api-key", apiKey);
            request.Content = JsonContent.Create(new
            {
                sender = new { name = "FloodView", email = remetente },
                to = new[] { new { email = destinatario } },
                replyTo = string.IsNullOrWhiteSpace(ocorrencia.Email) ? null : new { email = ocorrencia.Email },
                subject = $"FloodView — Ocorrência #{ocorrencia.Id} ({ocorrencia.Tipo})",
                textContent = $"Ocorrência #{ocorrencia.Id}\nData (UTC): {ocorrencia.RegistradaEmUtc:yyyy-MM-dd HH:mm:ss}\n" +
                    $"Nome: {ocorrencia.Nome}\nE-mail: {ocorrencia.Email}\nDepartamento: {ocorrencia.Departamento}\n" +
                    $"Tipo: {ocorrencia.Tipo}\n\n{ocorrencia.Descricao}"
            });

            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(12));
            using var response = await httpClient.SendAsync(request, timeout.Token);
            if (response.IsSuccessStatusCode)
                return new(true, "E-mail aceito pela API da Brevo para envio.");

            logger.LogWarning("API de e-mail recusou a ocorrência {Id} com HTTP {StatusCode}",
                ocorrencia.Id, (int)response.StatusCode);
            return new(false, MensagemDaFalha(response.StatusCode));
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("Tempo esgotado ao enviar e-mail da ocorrência {Id}", ocorrencia.Id);
            return new(false, "A API de e-mail não respondeu a tempo. A ocorrência continua salva; verifique a conexão e os logs do backend.");
        }
        catch (HttpRequestException error)
        {
            logger.LogWarning("Falha de conexão com a API de e-mail para a ocorrência {Id}: {Tipo}",
                ocorrencia.Id, error.GetType().Name);
            return new(false, "Não foi possível conectar à API de e-mail. A ocorrência continua salva; verifique a conexão do backend.");
        }
        catch (Exception error) when (error is FormatException or ArgumentException or JsonException)
        {
            logger.LogWarning("Configuração inválida no e-mail da ocorrência {Id}: {Tipo}",
                ocorrencia.Id, error.GetType().Name);
            return new(false, "A configuração do remetente ou destinatário é inválida. A ocorrência continua salva.");
        }
    }

    private static string MensagemDaFalha(HttpStatusCode statusCode) => statusCode switch
    {
        HttpStatusCode.Unauthorized => "A API de e-mail rejeitou a chave. Confira Email:ApiKey nos User Secrets.",
        HttpStatusCode.Forbidden => "A API de e-mail não autorizou o remetente ou a conta. Confira a verificação do remetente na Brevo.",
        HttpStatusCode.BadRequest => "A API de e-mail rejeitou os dados. Confira o formato do remetente e do destinatário.",
        HttpStatusCode.TooManyRequests => "A API de e-mail atingiu o limite de envios. Tente novamente mais tarde.",
        _ => $"A API de e-mail recusou o envio (HTTP {(int)statusCode}). Confira os logs da conta Brevo. A ocorrência já foi salva."
    };
}
