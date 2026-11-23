using System.Net;
using System.Net.Sockets;
using FloodView.Api.Models;
using FloodView.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

var occurrence = new Ocorrencia { Id = 42, Nome = "Teste", Email = "operador@example.test", Tipo = "support", Descricao = "Teste local" };
OcorrenciaEmail Service(Dictionary<string, string?> settings) => new(
    new ConfigurationBuilder().AddInMemoryCollection(settings).Build(), NullLogger<OcorrenciaEmail>.Instance);
void Check(bool condition, string label)
{
    if (!condition) throw new Exception(label);
    Console.WriteLine("PASS: " + label);
}
Check(!(await Service(new()).Enviar(occurrence)).Enviado, "Unconfigured email does not report success");
using var listener = new TcpListener(IPAddress.Loopback, 0);
listener.Start();
var port = ((IPEndPoint)listener.LocalEndpoint).Port;
var settings = new Dictionary<string, string?> {
    ["Email:Habilitado"] = "true", ["Email:Host"] = "127.0.0.1", ["Email:Porta"] = port.ToString(),
    ["Email:UsarTls"] = "false", ["Email:Remetente"] = "floodview@example.test", ["Email:Destinatario"] = "equipe@example.test"
};
var captured = new List<string>();
var server = Task.Run(async () => {
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
    using var client = await listener.AcceptTcpClientAsync(timeout.Token);
    using var stream = client.GetStream();
    using var reader = new StreamReader(stream);
    using var writer = new StreamWriter(stream) { AutoFlush = true, NewLine = "\r\n" };
    await writer.WriteLineAsync("220 localhost test SMTP");
    bool body = false;
    while (await reader.ReadLineAsync(timeout.Token) is { } line) {
        captured.Add(line);
        if (body) {
            if (line == ".") { body = false; await writer.WriteLineAsync("250 accepted"); }
        } else if (line.StartsWith("DATA")) { body = true; await writer.WriteLineAsync("354 send body"); }
        else if (line.StartsWith("QUIT")) { await writer.WriteLineAsync("221 goodbye"); break; }
        else await writer.WriteLineAsync("250 OK");
    }
});
Check((await Service(settings).Enviar(occurrence)).Enviado, "Local SMTP accepts occurrence");
await server;
Check(captured.Any(line => line.Contains("RCPT TO:<equipe@example.test>", StringComparison.OrdinalIgnoreCase)), "Recipient comes from server configuration");
Check(captured.Any(line => line.Contains("operador@example.test")), "Reporter is included in message");
listener.Stop();
Check(!(await Service(settings).Enviar(occurrence)).Enviado, "Unavailable SMTP reports failure without throwing");
