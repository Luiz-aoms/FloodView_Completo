using System.ComponentModel.DataAnnotations;

namespace FloodView.Api.Models;

public class Ocorrencia
{
    public int Id { get; set; }
    [Required, MaxLength(120)] public string Nome { get; set; } = "";
    [MaxLength(254), EmailAddress] public string? Email { get; set; }
    [MaxLength(120)] public string? Departamento { get; set; }
    [Required, MaxLength(40)] public string Tipo { get; set; } = "";
    [Required, MaxLength(3000)] public string Descricao { get; set; } = "";
    public DateTime RegistradaEmUtc { get; set; } = DateTime.UtcNow;
}
