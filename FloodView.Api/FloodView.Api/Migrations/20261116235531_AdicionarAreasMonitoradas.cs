using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FloodView.Api.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarAreasMonitoradas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AreasMonitoradas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nome = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    DispositivoId = table.Column<int>(type: "int", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    DistanciaAtencaoCm = table.Column<double>(type: "float", nullable: false),
                    DistanciaAlertaCm = table.Column<double>(type: "float", nullable: false),
                    GeometriaGeoJson = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AreasMonitoradas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AreasMonitoradas_Dispositivos_DispositivoId",
                        column: x => x.DispositivoId,
                        principalTable: "Dispositivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AreasMonitoradas_DispositivoId",
                table: "AreasMonitoradas",
                column: "DispositivoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AreasMonitoradas");
        }
    }
}
