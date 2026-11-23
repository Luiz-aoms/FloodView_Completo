using System.ComponentModel.DataAnnotations;

namespace FloodView.Api.Models;

public class AreaMonitorada
{
    public int Id { get; set; }
    [MaxLength(120)]
    public string Nome { get; set; } = "";
    public int DispositivoId { get; set; }
    public Dispositivo? Dispositivo { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double DistanciaAtencaoCm { get; set; }
    public double DistanciaAlertaCm { get; set; }
    public string GeometriaGeoJson { get; set; } = "";
    [MaxLength(300)]
    public string Descricao { get; set; } = "";
    public double? DistanciaVazioCm { get; set; }
    public double? CotaMaximaCm { get; set; }
    public double? DistanciaCriticaCm { get; set; }
}
