using Microsoft.EntityFrameworkCore;

namespace FloodView.Api.Models;

public class DadosFloodView : DbContext
{
    public DadosFloodView(DbContextOptions<DadosFloodView> options)
        : base(options)
    {
    }

    public DbSet<Dispositivo> Dispositivos => Set<Dispositivo>();
    public DbSet<Leitura> Leituras => Set<Leitura>();
    public DbSet<AreaMonitorada> AreasMonitoradas => Set<AreaMonitorada>();
    public DbSet<Ocorrencia> Ocorrencias => Set<Ocorrencia>();
}
