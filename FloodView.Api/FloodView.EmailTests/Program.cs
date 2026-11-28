using System.Net;
using System.Text;
using FloodView.Api.Models;
using FloodView.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

var occurrence = new Ocorrencia
{
    Id = 42, Nome = "Teste", Email = "operador@example.test", Tipo = "support", Descricao = "Teste local"
};

OcorrenciaEmail Service(Dictionary<string, string?> settings, HttpMessageHandler? handler = null) => new(
    new ConfigurationBuilder().AddInMemoryCollection(settings).Build(),
    NullLogger<OcorrenciaEmail>.Instance,
    new HttpClient(handler ?? new StubHandler(HttpStatusCode.InternalServerError)));

void Check(bool condition, string label)
{
    if (!condition) throw new Exception(label);
    Console.WriteLine("PASS: " + label);
}

Check(!(await Service(new()).Enviar(occurrence)).Enviado, "Unconfigured email does not report success");

var settings = new Dictionary<string, string?> {
    ["Email:Habilitado"] = "true",
    ["Email:ApiKey"] = "test-key",
    ["Email:Remetente"] = "floodview@example.test",
    ["Email:Destinatario"] = "equipe@example.test"
};
string? capturedUrl = null;
string? capturedPayload = null;
var apiKeyHeaderPresent = false;
var accepted = Service(settings, new StubHandler(HttpStatusCode.Created, async request =>
{
    capturedUrl = request.RequestUri?.AbsoluteUri;
    apiKeyHeaderPresent = request.Headers.Contains("api-key");
    capturedPayload = await request.Content!.ReadAsStringAsync();
}));
Check((await accepted.Enviar(occurrence)).Enviado, "API accepts occurrence");
Check(capturedUrl == "https://api.brevo.com/v3/smtp/email", "Uses Brevo transactional endpoint");
Check(apiKeyHeaderPresent, "Sends API key in request header");
Check(capturedPayload!.Contains("equipe@example.test") && capturedPayload.Contains("operador@example.test"), "Uses configured recipient and reporter reply address");

var unauthorized = await Service(settings, new StubHandler(HttpStatusCode.Unauthorized)).Enviar(occurrence);
Check(!unauthorized.Enviado && unauthorized.Mensagem.Contains("Email:ApiKey"), "Invalid API key returns actionable message");

sealed class StubHandler(HttpStatusCode statusCode, Func<HttpRequestMessage, Task>? capture = null) : HttpMessageHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (capture is not null) await capture(request);
        return new HttpResponseMessage(statusCode)
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
    }
}
