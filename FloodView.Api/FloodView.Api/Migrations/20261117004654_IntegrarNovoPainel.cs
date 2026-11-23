using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FloodView.Api.Migrations
{
    /// <inheritdoc />
    public partial class IntegrarNovoPainel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CotaMaximaCm",
                table: "AreasMonitoradas",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Descricao",
                table: "AreasMonitoradas",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "DistanciaCriticaCm",
                table: "AreasMonitoradas",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DistanciaVazioCm",
                table: "AreasMonitoradas",
                type: "float",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Ocorrencias",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nome = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    Departamento = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Tipo = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Descricao = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    RegistradaEmUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ocorrencias", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Ocorrencias");

            migrationBuilder.DropColumn(
                name: "CotaMaximaCm",
                table: "AreasMonitoradas");

            migrationBuilder.DropColumn(
                name: "Descricao",
                table: "AreasMonitoradas");

            migrationBuilder.DropColumn(
                name: "DistanciaCriticaCm",
                table: "AreasMonitoradas");

            migrationBuilder.DropColumn(
                name: "DistanciaVazioCm",
                table: "AreasMonitoradas");
        }
    }
}
