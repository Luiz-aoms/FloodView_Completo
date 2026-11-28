# FloodView — projeto completo

Arduino Nano por USB, ponte serial em C#, API ASP.NET Core 8, SQL Server LocalDB e frontend FloodView-main.

A documentação completa está em [FloodView-main/README.md](FloodView-main/README.md): arquitetura, pastas, banco, rotas, execução, Arduino, cadastro, calibração, cota máxima, alertas, testes e solução de problemas.

- [Documentação completa](FloodView-main/README.md)
- [Documentação da API](FloodView.Api/README.md)

Com a API em execução no perfil HTTPS, abra o [painel](https://localhost:7064/painelFloodView.html). A ponte também precisa estar ativa para receber novas leituras.

Mantenha FloodView-main e FloodView.Api lado a lado. FloodView.Frontend não é mais utilizado.

## Executar após clonar

1. Instale o SDK .NET 8 e o SQL Server LocalDB no Windows.
2. Na pasta `FloodView.Api/FloodView.Api`, restaure as dependências com `dotnet restore` e aplique as migrations com `dotnet ef database update` (requer a ferramenta `dotnet-ef` compatível com EF Core 8).
3. Inicie a API com `dotnet watch --launch-profile https`. Ela também serve o frontend, sem necessidade de Live Server.
4. Para receber medições reais, conecte o Arduino e execute `dotnet run` na pasta `FloodView.Api/FloodView.Ponte`. Confira a porta COM e o ID do dispositivo em `Program.cs`.
5. O envio das ocorrências usa o EmailJS no navegador; confira `FloodView-Frontend/README.md` para a configuração do template e restrição de origem.

## Testes

- Frontend: em `FloodView-main`, execute `npm ci` e `npm test` (requer Node.js e npm).
- E-mail: em `FloodView.Api`, execute `dotnet run --project FloodView.EmailTests/FloodView.EmailTests.csproj`. O teste usa respostas HTTP simuladas.

O repositório contém o código-fonte, as migrations e as bibliotecas locais necessárias ao painel. Dados do banco, User Secrets, dependências instaladas e arquivos gerados ficam fora do Git. Publicar o código no GitHub não hospeda a API nem o banco.
