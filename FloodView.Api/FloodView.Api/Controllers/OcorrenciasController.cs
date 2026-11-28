using FloodView.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FloodView.Api.Controllers;

[ApiController]
[Route("api/ocorrencias")]
public class OcorrenciasController(DadosFloodView dados) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var ocorrencias = await dados.Ocorrencias.AsNoTracking()
            .OrderByDescending(o => o.RegistradaEmUtc)
            .Select(o => new
            {
                o.Id, o.Nome, o.Email, o.Departamento, o.Tipo, o.Descricao,
                o.RegistradaEmUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(ocorrencias);
    }

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
        return StatusCode(201, new { ocorrencia.Id, ocorrencia.RegistradaEmUtc });
    }
}

public record RegistrarOcorrenciaRequest(string Nome, string? Email, string? Departamento, string Tipo, string Descricao);
