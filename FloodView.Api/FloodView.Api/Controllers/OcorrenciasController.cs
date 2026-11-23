using FloodView.Api.Models;
using FloodView.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FloodView.Api.Controllers;

[ApiController]
[Route("api/ocorrencias")]
public class OcorrenciasController(DadosFloodView dados, OcorrenciaEmail email) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Registrar(RegistrarOcorrenciaRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || string.IsNullOrWhiteSpace(request.Descricao) ||
            !new[] { "support", "new_sensor", "calibration", "bug", "alerta" }.Contains(request.Tipo))
            return BadRequest("Informe nome, descrição e tipo de ocorrência válidos.");

        var ocorrencia = new Ocorrencia
        {
            Nome = request.Nome.Trim(), Email = request.Email,
            Departamento = request.Departamento, Tipo = request.Tipo,
            Descricao = request.Descricao.Trim()
        };
        if (!TryValidateModel(ocorrencia)) return ValidationProblem(ModelState);
        dados.Ocorrencias.Add(ocorrencia);
        await dados.SaveChangesAsync(cancellationToken);
        var envio = await email.Enviar(ocorrencia);
        return StatusCode(201, new { ocorrencia.Id, ocorrencia.RegistradaEmUtc,
            EmailEnviado = envio.Enviado, MensagemEmail = envio.Mensagem });
    }
}

public record RegistrarOcorrenciaRequest(string Nome, string? Email, string? Departamento, string Tipo, string Descricao);
