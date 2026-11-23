using System.Text.Json;
using System.Text.Json.Serialization;
using FloodView.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FloodView.Api.Controllers;

[ApiController]
[Route("api/areas-monitoradas")]
public class AreasMonitoradasController(DadosFloodView dados) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var areas = await dados.AreasMonitoradas.AsNoTracking()
            .OrderBy(a => a.Id)
            .Select(a => new
            {
                a.Id,
                a.Nome,
                a.DispositivoId,
                a.Latitude,
                a.Longitude,
                a.DistanciaAtencaoCm,
                a.DistanciaAlertaCm,
                a.GeometriaGeoJson,
                a.Descricao,
                a.DistanciaVazioCm,
                a.CotaMaximaCm,
                a.DistanciaCriticaCm
            })
            .ToListAsync(cancellationToken);

        return Ok(areas);
    }

    [HttpPost]
    public async Task<IActionResult> Cadastrar(
        CadastrarAreaRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || request.Nome.Trim().Length > 120)
            return BadRequest("Informe um nome de área com até 120 caracteres.");

        if (!double.IsFinite(request.Latitude) || Math.Abs(request.Latitude) > 90 ||
            !double.IsFinite(request.Longitude) || Math.Abs(request.Longitude) > 180)
            return BadRequest("Informe coordenadas válidas para o sensor.");

        if (!double.IsFinite(request.DistanciaAlertaCm) ||
            !double.IsFinite(request.DistanciaAtencaoCm) ||
            request.DistanciaAlertaCm < 0 ||
            request.DistanciaAtencaoCm <= request.DistanciaAlertaCm)
            return BadRequest("O limite de alerta deve ser não negativo e menor que o de atenção.");

        if (!PoligonoValido(request.GeometriaGeoJson))
            return BadRequest("Envie um Polygon GeoJSON com anéis fechados e coordenadas válidas.");

        if (request.Descricao?.Length > 300 ||
            (request.DistanciaVazioCm is double vazio && (!double.IsFinite(vazio) || vazio < 2 || vazio > 400)) ||
            (request.CotaMaximaCm is double cota && (!double.IsFinite(cota) || cota <= 0 ||
                request.DistanciaVazioCm is not double referencia || cota > referencia)) ||
            (request.DistanciaCriticaCm is double critica && (!double.IsFinite(critica) || critica < 0 || critica > request.DistanciaAlertaCm)))
            return BadRequest("Confira a descrição, a calibração, a cota máxima e o limite crítico.");

        if (request.DispositivoId < 1 || !await dados.Dispositivos
                .AnyAsync(d => d.Id == request.DispositivoId, cancellationToken))
            return BadRequest("O dispositivo informado não está cadastrado.");

        var area = new AreaMonitorada
        {
            Nome = request.Nome.Trim(),
            DispositivoId = request.DispositivoId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            DistanciaAtencaoCm = request.DistanciaAtencaoCm,
            DistanciaAlertaCm = request.DistanciaAlertaCm,
            GeometriaGeoJson = request.GeometriaGeoJson.GetRawText(),
            Descricao = request.Descricao?.Trim() ?? "",
            DistanciaVazioCm = request.DistanciaVazioCm,
            CotaMaximaCm = request.CotaMaximaCm,
            DistanciaCriticaCm = request.DistanciaCriticaCm
        };

        dados.AreasMonitoradas.Add(area);
        await dados.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            area.Id,
            area.Nome,
            area.DispositivoId,
            area.Latitude,
            area.Longitude,
            area.DistanciaAtencaoCm,
            area.DistanciaAlertaCm,
            area.GeometriaGeoJson,
            area.Descricao,
            area.DistanciaVazioCm,
            area.CotaMaximaCm,
            area.DistanciaCriticaCm
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id, CancellationToken cancellationToken)
    {
        var area = await dados.AreasMonitoradas.FindAsync([id], cancellationToken);
        if (area is null) return NotFound("Ponto não encontrado.");
        dados.AreasMonitoradas.Remove(area);
        await dados.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    internal static bool PoligonoValido(JsonElement geometria)
    {
        if (geometria.ValueKind != JsonValueKind.Object ||
            !geometria.TryGetProperty("type", out var tipo) ||
            tipo.ValueKind != JsonValueKind.String || tipo.GetString() != "Polygon" ||
            !geometria.TryGetProperty("coordinates", out var aneis) ||
            aneis.ValueKind != JsonValueKind.Array || aneis.GetArrayLength() == 0)
            return false;

        foreach (var anel in aneis.EnumerateArray())
        {
            if (anel.ValueKind != JsonValueKind.Array || anel.GetArrayLength() < 4)
                return false;

            var pontos = new List<(double Longitude, double Latitude)>();
            foreach (var ponto in anel.EnumerateArray())
            {
                if (ponto.ValueKind != JsonValueKind.Array || ponto.GetArrayLength() != 2 ||
                    ponto[0].ValueKind != JsonValueKind.Number ||
                    ponto[1].ValueKind != JsonValueKind.Number ||
                    !ponto[0].TryGetDouble(out var longitude) || !double.IsFinite(longitude) ||
                    !ponto[1].TryGetDouble(out var latitude) || !double.IsFinite(latitude) ||
                    Math.Abs(longitude) > 180 || Math.Abs(latitude) > 90)
                    return false;

                pontos.Add((longitude, latitude));
            }

            if (pontos[0] != pontos[^1] || pontos.Distinct().Count() < 3)
                return false;

            double areaDupla = 0;
            for (var i = 0; i < pontos.Count - 1; i++)
                areaDupla += pontos[i].Longitude * pontos[i + 1].Latitude -
                             pontos[i + 1].Longitude * pontos[i].Latitude;
            if (areaDupla == 0) return false;
        }

        return true;
    }
}

public record CadastrarAreaRequest(
    [property: JsonRequired] string Nome,
    [property: JsonRequired] int DispositivoId,
    [property: JsonRequired] double Latitude,
    [property: JsonRequired] double Longitude,
    [property: JsonRequired] double DistanciaAtencaoCm,
    [property: JsonRequired] double DistanciaAlertaCm,
    [property: JsonRequired] JsonElement GeometriaGeoJson,
    string? Descricao = null,
    double? DistanciaVazioCm = null,
    double? CotaMaximaCm = null,
    double? DistanciaCriticaCm = null);
