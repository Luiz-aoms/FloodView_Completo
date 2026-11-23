# FloodView.Api

O projeto pode continuar no Visual Studio 2022 ou pelo terminal após mover a pasta.
A solução `FloodView.Api.sln` contém a API (.NET 8) e a ponte serial do Arduino.
A conexão padrão usa SQL Server LocalDB, banco `FloodViewDb`; ela não depende do caminho da pasta.

## Preparar e executar

1. Instale o SDK .NET 8 e SQL Server Express LocalDB.
2. Abra `FloodView.Api.sln` no Visual Studio 2022.
3. No Console do Gerenciador de Pacotes, selecione `FloodView.Api` como projeto padrão e execute `Update-Database`. As migrações criam áreas monitoradas, calibrações e ocorrências, preservando dispositivos e leituras existentes.
4. Execute o projeto `FloodView.Api` com o perfil **https**. A API fica em `https://localhost:7064` e o Swagger em `/swagger`.

Pelo terminal, dentro desta pasta:

```powershell
dotnet restore FloodView.Api.sln
# Se a ferramenta ainda não estiver instalada:
dotnet tool install --global dotnet-ef --version 8.0.34
dotnet ef database update --project FloodView.Api
dotnet run --project FloodView.Api --launch-profile https
```

Se o navegador indicar problema no certificado local, execute `dotnet dev-certs https --trust`.

## Usar o mapa

As duas interfaces são independentes:

- `FloodView.Api/wwwroot/index.html`: painel interno em `/calibracao`, de calibração e gráfico servido pela API.
- `../FloodView-main/index.html`: apresentação, servida como página inicial em `https://localhost:7064/`.
- `../FloodView-main/RUAN/index.html`: novo painel com mapa, cadastro de pontos e gráficos, em `https://localhost:7064/RUAN/`.

Não é necessário iniciar um servidor separado para o frontend: a API serve a pasta irmã `FloodView-main`. Como alternativa, use Live Server na porta 5500; essas origens já estão permitidas no CORS.

Cadastre primeiro um dispositivo em `POST /api/dispositivos` pelo Swagger e use o ID retornado no cadastro do ponto. No painel, clique no mapa ou em **Cadastrar Ponto** e informe a calibração e a cota máxima. O painel salva uma cobertura de 1 km em GeoJSON (longitude, latitude).

- `GET /api/areas-monitoradas`: lista as áreas persistidas.
- `POST /api/areas-monitoradas`: cria uma área vinculada a um dispositivo existente.
- `DELETE /api/areas-monitoradas/{id}`: remove o ponto, preservando o dispositivo e as leituras.
- `POST /api/ocorrencias`: registra chamado ou alerta no banco local, sem envio externo.

Exemplo de corpo do cadastro:

```json
{
  "nome": "Área da ponte",
  "dispositivoId": 1,
  "latitude": -23.5505,
  "longitude": -46.6333,
  "distanciaAtencaoCm": 30,
  "distanciaAlertaCm": 15,
  "geometriaGeoJson": {
    "type": "Polygon",
    "coordinates": [[[-46.634, -23.551], [-46.632, -23.551], [-46.632, -23.550], [-46.634, -23.551]]]
  }
}
```

A API recebe a geometria como objeto JSON e a devolve como texto JSON. Valida campos obrigatórios, coordenadas, anéis fechados com ao menos três vértices distintos e área não nula, além dos limites de distância. A validação não verifica toda a topologia do polígono. Os campos opcionais `descricao`, `distanciaVazioCm`, `cotaMaximaCm` e `distanciaCriticaCm` persistem a configuração do novo painel. O formulário configura os alertas em 50%, 75% e 90% da cota máxima.

Para sensores acima da água, distâncias menores representam água mais alta: o limite de alerta deve ser menor que o de atenção. Após 30 segundos sem leitura atual, o mapa mostra **Sem dados atuais**. A ponte serial usa `COM5`, dispositivo `1` e a API HTTPS; ajuste essas constantes em `FloodView.Ponte/Program.cs` conforme o hardware.

Autenticação não está implementada na API. Detalhes do frontend e dos testes estão em `../FloodView-main/README.md`.
