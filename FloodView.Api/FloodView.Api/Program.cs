using FloodView.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<DadosFloodView>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("FloodView")));

builder.Services.AddControllers();
builder.Services.AddScoped<FloodView.Api.Services.OcorrenciaEmail>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FloodViewFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

var frontendPath = Path.GetFullPath(Path.Combine(
    app.Environment.ContentRootPath, "..", "..", "FloodView-main"));
if (Directory.Exists(frontendPath))
{
    var frontendFiles = new PhysicalFileProvider(frontendPath);
    var defaultFiles = new DefaultFilesOptions { FileProvider = frontendFiles };
    defaultFiles.DefaultFileNames.Clear();
    defaultFiles.DefaultFileNames.Add("painelFloodView.html");
    app.UseDefaultFiles(defaultFiles);
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = frontendFiles,
        OnPrepareResponse = context =>
        {
            if (context.File.Name.EndsWith(".html") || context.File.Name.EndsWith(".js"))
                context.Context.Response.Headers.CacheControl = "no-cache";
        }
    });
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();
app.UseCors("FloodViewFrontend");
app.UseAuthorization();

app.MapControllers();
app.MapGet("/RUAN", () => Results.Redirect("/painelFloodView.html"));
app.MapGet("/RUAN/index.html", () => Results.Redirect("/painelFloodView.html"));
app.MapGet("/mapa.html", () => Results.Redirect("/painelFloodView.html"));
app.MapGet("/calibracao", () => Results.File(
    Path.Combine(app.Environment.WebRootPath, "index.html"), "text/html; charset=utf-8"));

app.Run();
