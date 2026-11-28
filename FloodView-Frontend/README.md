# FloodView — documentação do projeto

Protótipo acadêmico de monitoramento do nível da água, com contexto de aplicação em Boa Vista, Roraima. O sistema recebe medições de um sensor conectado ao Arduino, persiste as leituras e apresenta mapa, histórico, altura da água e alertas.

## Arquitetura implementada

```text
Sensor → Arduino Nano → USB/COM5 → FloodView.Ponte
                                      ↓ HTTP
                              FloodView.Api → SQL Server LocalDB
                                      ↑ HTTP
                              FloodView-main → navegador
```

O fluxo atual usa Arduino Nano por USB, ponte em C#, ASP.NET Core 8 e SQL Server. ESP32, Wi-Fi, chuva, vazão e comunicação externa com a Defesa Civil são possibilidades futuras; alguns textos institucionais da apresentação ainda descrevem essa proposta mais ampla.

O sensor informa distância até a superfície da água. O frontend calcula a altura usando a distância de referência medida com o recipiente vazio. A API registra o horário de recebimento em UTC.

## Estrutura

```text
FloodView_ProjetoCompleto/
├── FloodView-main/
│   ├── index.html                 Apresentação e leitura resumida
│   ├── painelFloodView.html            Painel principal
│   ├── mapa.html                  Mapa simples
│   ├── js/api.js                  HTTP, UTC, estados e geometria
│   ├── js/home.js                 Dados da página inicial
│   ├── js/dashboard.js            Pontos, gráficos e chamados
│   ├── js/map.js                  Comportamento do mapa simples
│   ├── vendor/                    Bibliotecas locais e CSS gerado
│   ├── styles/tailwind.css         Entrada dos estilos
│   ├── tailwind.config.cjs         Configuração do Tailwind
│   └── tests/frontend.test.cjs     Testes automatizados
└── FloodView.Api/
    ├── FloodView.Api.sln           Solução do Visual Studio
    ├── FloodView.Api/
    │   ├── Controllers/           Rotas HTTP
    │   ├── Models/                Entidades e contexto do banco
    │   ├── Migrations/            Evolução do banco
    │   ├── wwwroot/index.html     Interface interna de calibração
    │   ├── Program.cs             Hospedagem e configuração
    │   └── appsettings.json       Conexão com SQL Server
    └── FloodView.Ponte/Program.cs  Leitura serial e envio à API
```

Mantenha `FloodView-main` e `FloodView.Api` lado a lado. A API localiza o frontend por caminho relativo. Mover o conjunto não exige recriar a solução do Visual Studio. O banco é identificado por instância e nome, não pelo caminho do código.

`FloodView.Frontend` foi aposentado; seus arquivos foram guardados em backup. Uma pasta vazia com esse nome não participa da execução.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Hardware | Arduino Nano, sensor de distância, USB serial |
| Ponte | .NET 8, System.IO.Ports, HttpClient |
| Backend | ASP.NET Core 8, Entity Framework Core 8, Swagger |
| Banco | SQL Server LocalDB, banco FloodViewDb |
| Apresentação | HTML, JavaScript, Bootstrap e Bootstrap Icons |
| Painel | HTML, JavaScript, Tailwind CSS, Leaflet e Chart.js |
| Testes | Node.js, test runner nativo e JSDOM |

### Vue.js apenas nos valores em tempo real

O frontend continua estruturado em HTML e CSS. O Vue.js 3.5.13 é carregado localmente de `vendor/vue/vue.global.prod.js`, sem exigir Vite, arquivos `.vue` ou compilação para abrir as páginas.

O arquivo `js/live-values.js` cria um estado com `Vue.reactive` e monta pequenas regiões identificadas por `data-live-values` no HTML. Cada região contém somente valores dinâmicos: distância, altura, percentual, situação, contadores, horários, conexão e avisos. A apresentação e o painel usam essa integração.

As consultas ficam em `dashboard.js` e `dashboard-filters.js`. Quando uma resposta chega da API, esses scripts alteram o estado reativo; o Vue atualiza automaticamente os elementos com `v-text`, `:style` e `:class`.

```javascript
// Após receber e interpretar uma leitura:
FloodViewLive.selected.level = '6,0 cm';
```

```html
<!-- O Vue renderiza o texto a partir do estado reativo. -->
<div data-live-values style="display: contents">
  <span v-text="live.selected.level"></span>
</div>
```

Os contêineres usam `display: contents` para não adicionar caixas ao layout. `v-text` trata os dados como texto, inclusive nomes cadastrados, evitando interpretá-los como HTML.

O Vue não envolve a página inteira: navegação, formulários e cadastro continuam em JavaScript convencional; Leaflet mantém o mapa e Chart.js mantém os gráficos. O mapa simples também continua com sua implementação própria. O backend e a ponte serial não foram alterados por essa integração.

Para demonstrar ao professor, consulte `js/live-values.js`, os atributos Vue em `painelFloodView.html` e a função `updateSelectedPoint` em `js/dashboard.js`. Execute `npm test` para verificar atualização reativa, troca de leitura, falha de API e leitura vencida. Os testes usam Vue e Leaflet reais em JSDOM, com API e canvas simulados; não substituem inspeção visual no navegador.

As bibliotecas principais estão em `vendor`. As ruas do OpenStreetMap e imagens da apresentação ainda dependem de internet. Node.js só é necessário para testes e geração do CSS.

## Pré-requisitos

- Windows com SDK .NET 8 e SQL Server Express LocalDB, instância `MSSQLLocalDB`.
- Visual Studio 2022 com desenvolvimento ASP.NET, ou terminal com o SDK.
- Arduino com programa compatível, sensor montado e cabo USB de dados.
- Node.js/npm para desenvolvimento do frontend.

O firmware do Arduino e a pinagem do sensor não estão incluídos nesta pasta. Confira a montagem e o programa gravado na placa.

## Executar pelo Visual Studio 2022

1. Abra `FloodView.Api/FloodView.Api.sln`.
2. Confira `ConnectionStrings:FloodView` em `FloodView.Api/appsettings.json`.
3. No Console do Gerenciador de Pacotes, selecione `FloodView.Api` e execute `Update-Database`.
4. Execute o projeto `FloodView.Api` com o perfil **https**.
5. Cadastre o dispositivo pelo Swagger, caso ainda não exista.
6. Conecte o USB e execute também `FloodView.Ponte`. API e ponte precisam ficar ativas simultaneamente; é possível configurar os dois como projetos de inicialização.

## Executar pelo terminal

Na pasta `FloodView_ProjetoCompleto/FloodView.Api`:

```powershell
dotnet restore FloodView.Api.sln
dotnet build FloodView.Api.sln
# Instale somente se a ferramenta ainda não existir:
dotnet tool install --global dotnet-ef --version 8.0.34
dotnet ef database update --project FloodView.Api
dotnet dev-certs https --trust
dotnet run --project FloodView.Api --launch-profile https
```

Em outro terminal, na mesma pasta e com o Arduino conectado:

```powershell
dotnet run --project FloodView.Ponte
```

No Swagger, `POST /api/dispositivos` recebe:

```json
{ "nome": "Arduino Nano - protótipo" }
```

Use o ID retornado no cadastro do ponto e na constante `dispositivoId` da ponte. Um novo dispositivo não recebe necessariamente ID 1.

## Páginas e endereços

| URL | Função |
| --- | --- |
| https://localhost:7064/ | Apresentação e leitura resumida |
| https://localhost:7064/painelFloodView.html | Painel com mapa e gráficos |
| https://localhost:7064/mapa.html | Redirecionamento para o painel |
| https://localhost:7064/swagger | Rotas da API em ambiente Development |
| https://localhost:7064/calibracao | Interface interna de calibração do dispositivo 1 |

A API serve o frontend automaticamente. Live Server é opcional: se iniciado na pasta que contém os projetos, use `http://localhost:5500/FloodView-main/`. O CORS permite localhost e 127.0.0.1 na porta 5500.

O endereço padrão da API está em `js/api.js`: `https://localhost:7064`. A configuração atual usa o próprio computador. Acesso por outro computador requer ajustar endereço e hospedagem.

## Arduino e ponte serial

`FloodView.Ponte/Program.cs` configura COM5, 9600 baud, dispositivo 1 e API HTTPS na porta 7064. Ajuste essas constantes se a montagem mudar.

O Arduino deve enviar linhas terminadas por quebra de linha, com ponto decimal:

```text
Distancia: 20.5 cm
```

A ponte ignora linhas sem o prefixo `Distancia:` e envia o número à API. A API aceita distâncias de 2 a 400 cm e exige dispositivo cadastrado, ativo e não pausado.

`Lendo o Nano pela COM5` confirma apenas a abertura da porta. `Enviado: ... cm` confirma que a API aceitou uma medição. Verifique também se o ID e o horário mudam em `GET /api/dispositivos/1/leituras?limite=1`.

Feche o Monitor Serial da IDE antes de iniciar a ponte. Se desconectar o USB, reconecte e reinicie a ponte: ela não possui reconexão automática. Não há fila para reenviar medições perdidas durante falhas da API.

## Cadastro de pontos

1. Abra o painel e clique no mapa ou em **Cadastrar Ponto**.
2. Informe nome, referência, coordenadas e ID de um dispositivo existente.
3. Informe a distância com recipiente vazio em centímetros.
4. Informe a cota máxima em metros.
5. Salve. O cadastro e a calibração ficam no banco.

O painel gera cobertura circular de 1 km de raio, persistida como Polygon GeoJSON de 64 segmentos. Essa cobertura é uma representação do protótipo, não a extensão medida de uma enchente. As coordenadas GeoJSON usam longitude, latitude.

Pontos podem compartilhar um dispositivo, usando as mesmas leituras com configurações próprias. Excluir um ponto preserva o dispositivo e seu histórico.

O mapa simples permite cadastrar limites de distância diretamente, sem calibração de altura. Para obter altura e percentual, use o painel completo.

## Calibração: distância, altura e cota máxima

**Distância vazia:** distância do sensor ao fundo, medida com o recipiente vazio e o sensor na posição de uso. É informada em centímetros; o sistema não descobre esse valor sozinho.

**Altura da água:** diferença entre distância vazia e distância atual, limitada a zero quando o resultado é negativo.

```text
altura (cm) = máximo(0, distância vazia − distância atual)
```

Exemplo: sensor a 26 cm do fundo e leitura de 20 cm até a água resultam em **6 cm de altura**.

**Cota máxima:** altura de água escolhida como referência de **100%** para o ponto. Neste software, ela é relativa ao fundo usado na calibração. Não é uma altitude em relação ao nível do mar nem a distância entre sensor e água.

O campo usa **metros** e o banco guarda o valor convertido em centímetros:

| Referência desejada | Cota Máxima (m) |
| --- | --- |
| 10 cm | 0.10 |
| 20 cm | 0.20 |
| 26 cm | 0.26 |
| 1 metro | 1.00 |

A cota pode ser uma marca escolhida para o ensaio. Não precisa coincidir com a distância vazia. Com sensor a 26 cm do fundo e cota de 20 cm, informe distância vazia `26` e cota `0.20`. Com 20 cm de água, o painel indica 100%, restando 6 cm entre sensor e superfície.

A cota deve ser positiva e não pode superar a distância vazia. O formulário aceita distância vazia de 2 a 400 cm. Considere a faixa do sensor: a API rejeita distâncias menores que 2 cm, portanto uma referência que exigisse água encostando no sensor não seria mensurável até 100% nesse fluxo.

```text
percentual = altura / cota máxima × 100
```

A barra fica entre 0% e 100%; a altura numérica pode superar a cota se a leitura continuar válida. A cota não impede a água de subir nem constitui garantia de segurança.

### Estados calculados pelo painel

| Estado | Altura em relação à cota |
| --- | --- |
| Normal | Abaixo de 50% |
| Atenção | De 50% até menos de 75% |
| Alagamento | De 75% até menos de 90% |
| Crítico | A partir de 90% |
| Sem dados atuais | Leitura ausente, antiga ou falha na consulta |

Com cota de **20 cm**, os limites são **10 cm**, **15 cm** e **18 cm**. Se a distância vazia é 26 cm, o cadastro salva limites de distância até a água de 16, 11 e 8 cm:

```text
distância de atenção = distância vazia − cota × 0,50
distância de alerta  = distância vazia − cota × 0,75
distância crítica    = distância vazia − cota × 0,90
```

São regras do protótipo, não limites oficiais de enchente. Pontos antigos ou cadastrados diretamente pela API podem ter outros limites e não possuir calibração ou limite crítico.

## Atualização e gráficos

O painel agenda nova consulta 3 segundos após terminar o ciclo anterior; atrasos de rede aumentam o intervalo efetivo. Cada requisição tem timeout de 10 segundos. Leituras com até 30 segundos são atuais; há tolerância de 5 segundos para horário futuro por diferença entre relógios.

Em falha de consulta ou leitura vencida, o ponto fica cinza e a altura atual deixa de aparecer. O histórico previamente carregado permanece disponível. Mapa e cadastros continuam existindo com o USB desconectado.

O painel consulta até 60 leituras por dispositivo e mostra:

- Mini gráfico de distância do ponto selecionado.
- Histórico da altura em metros, quando há calibração.
- Altura atual por ponto em centímetros.
- Distribuição dos pontos por estado.
- Histórico da distância do sensor.

Não há medição de vazão nem precipitação no hardware atual. O painel consulta as leituras dos dispositivos cadastrados, inclusive os que ainda não têm ponto no mapa. Altura e classificação dependem do cadastro e da calibração de um ponto.

A página inicial usa o primeiro ponto retornado pela API ou o dispositivo 1. Sem calibração, identifica o valor como distância. A interface `/calibracao` é independente: seus parâmetros ficam no navegador e não atualizam a calibração dos pontos do painel.

## Banco de dados

| Tabela | Dados |
| --- | --- |
| Dispositivos | ID, nome, ativo/pausado e último contato |
| Leituras | Dispositivo, distância em cm e recebimento UTC |
| AreasMonitoradas | Nome, descrição, dispositivo, coordenadas, GeoJSON, limites e calibração |
| Ocorrencias | Nome, e-mail, departamento, tipo, descrição e data do registro |
| __EFMigrationsHistory | Controle das migrações aplicadas |

Migrações: `CriarBancoInicial`, `AdicionarAreasMonitoradas` e `IntegrarNovoPainel`. Aplique com `Update-Database` ou `dotnet ef database update --project FloodView.Api`. Elas não são executadas automaticamente na inicialização. Não existe limpeza automática do histórico; o banco cresce com as leituras.

## Rotas da API

| Método e rota | Função |
| --- | --- |
| POST /api/dispositivos | Cadastrar dispositivo pelo nome |
| GET /api/dispositivos | Listar todos os dispositivos, situação administrativa e último contato |
| POST /api/dispositivos/{id}/leituras | Receber JSON com distanciaCm |
| GET /api/dispositivos/{id}/leituras?limite=60 | Consultar leituras; limite de 1 a 200 |
| GET /api/areas-monitoradas | Listar pontos e configurações |
| POST /api/areas-monitoradas | Cadastrar ponto vinculado a dispositivo existente |
| DELETE /api/areas-monitoradas/{id} | Excluir ponto preservando leituras |
| GET /api/ocorrencias | Listar ocorrências por data, incluindo solicitante e descrição |
| POST /api/ocorrencias | Salvar ocorrência e retornar protocolo e data |

O cadastro de área exige nome, dispositivo, coordenadas, limites de atenção/alerta e geometria Polygon. Descrição, distância vazia, cota e distância crítica são adicionais. A API valida campos, coordenadas, limites e estrutura básica dos anéis; não valida toda a topologia geográfica.

Não há autenticação, edição de ponto ou tela de consulta de chamados implementadas. O conjunto está configurado para demonstração local.

## Dispositivos e filtros

A sidebar inclui **Dispositivos**, com todos os sensores cadastrados na API, inclusive os que não estão vinculados a pontos no mapa. A tabela mostra ID, nome, situação, pontos vinculados, última distância e último contato. Cadastro não significa conexão: “Recebendo leituras” exige uma leitura recebida nos últimos 30 segundos e dispositivo ativo, não pausado. Falhas de consulta são mostradas explicitamente.

Os filtros do painel combinam busca por nome/endereço (sem diferenciar acentos), dispositivo e situação. Eles afetam os marcadores e áreas do mapa, os indicadores, o ponto selecionado e os gráficos. A seleção é mantida durante as atualizações; quando nenhum ponto corresponde, o painel limpa os valores e gráficos anteriores. **Limpar filtros** restaura todos os pontos. A lista de dispositivos e o aviso geral de alertas continuam mostrando o sistema inteiro.

## Ocorrências por e-mail

A aba **Equipe e ocorrências** salva chamados na tabela Ocorrencias e exibe o protocolo após confirmação da API. Os tipos incluem suporte, novo sensor, calibração e falha do sistema. Após salvar, o front envia o e-mail pelo EmailJS. Configure o destinatário da equipe em **To Email** no template e `{{email}}` em **Reply-To**.

**Enviar alerta deste ponto** usa o mesmo fluxo para o ponto selecionado com leitura atual. O registro pelo botão é manual; mudanças de nível não disparam e-mails por conta própria. Não há envio de SMS ou integração com a Defesa Civil.

O resultado distingue registro salvo de solicitação de e-mail aceita pelo EmailJS. Isso não confirma entrega na caixa de entrada. Se o EmailJS falhar, a ocorrência continua salva e o painel mostra um aviso; não há fila persistente nem repetição automática do envio.

### Configurar o EmailJS

O front usa o Service ID, Template ID e Public Key definidos em `js/dashboard.js`. No template, configure os parâmetros `{{protocolo}}`, `{{data}}`, `{{nome}}`, `{{email}}`, `{{departamento}}`, `{{tipo}}` e `{{descricao}}`. Restrinja as origens permitidas às URLs usadas na apresentação. A Public Key é feita para uso no navegador; nunca coloque a Private Key no front.

### Verificações automatizadas

- Na pasta `FloodView-main`: `npm test` valida listagem, sensores sem vínculo, falhas de consulta, filtros combinados, valores Vue, menu móvel e resultado do e-mail.
- Na pasta `FloodView.Api`: `dotnet run --project FloodView.EmailTests/FloodView.EmailTests.csproj` testa o serviço de e-mail com respostas HTTP simuladas, sem mensagens externas.

## Teste completo da montagem

1. Inicie API e ponte com USB conectado e confira os logs Enviado.
2. Confirme que ID e horário da última leitura mudam na API.
3. Cadastre o ponto com o ID correto, distância vazia medida e cota escolhida.
4. Altere a distância até a superfície e observe distância, altura e gráficos.
5. Confira os estados ao cruzar 50%, 75% e 90% da cota.
6. Recarregue a página para confirmar a persistência do cadastro.
7. Pare a ponte e aguarde mais de 30 segundos para testar Sem dados atuais. Reinicie para retomar.

Não use valores de exemplo como substitutos da calibração da montagem real.

## Solução de problemas

| Sintoma | O que conferir |
| --- | --- |
| Site não abre | API ativa, perfil HTTPS e porta 7064 |
| Certificado não confiável | Configuração local com dotnet dev-certs https --trust |
| Tabela inexistente | Migrações no banco configurado |
| COM5 ausente | USB, cabo de dados, Gerenciador de Dispositivos e constante portaSerial |
| Porta ocupada | Monitor Serial aberto ou ponte duplicada |
| Porta abriu, mas não há Enviado | Firmware, 9600 baud, prefixo Distancia:, ponto decimal e final de linha |
| Zero bytes recebidos | Alimentação, cabo e firmware; RST/RESET reinicia a placa |
| HTTP 404 no envio | ID do dispositivo não cadastrado |
| HTTP 400 no envio | Distância fora de 2–400 cm ou formato inválido |
| HTTP 409 no envio | Dispositivo pausado ou desativado |
| Altura vazia | Calibração ausente ou leitura sem atualização |
| Percentual incoerente | Sensor fixo, distância vazia em cm e cota em metros |
| Mapa sem ruas | Conexão com o OpenStreetMap |
| Interface antiga | Ctrl+F5 e endereço /RUAN/ |

## Desenvolvimento e testes

Na pasta FloodView-main:

```powershell
npm ci
npm test
npm run build:css
```

Gere novamente o CSS ao alterar classes Tailwind. O resultado fica em `vendor/tailwind.css`.

Na pasta FloodView.Api:

```powershell
dotnet build FloodView.Api.sln
dotnet ef migrations has-pending-model-changes --project FloodView.Api
```

Os testes usam JSDOM e respostas simuladas da API para verificar inicialização, mapa, cadastro, exclusão, calibração e estados de falha. O canvas dos gráficos usa adaptador de teste. Eles não substituem inspeção visual nem validação com Arduino real. Para testar persistência, use banco separado e evite misturar registros de ensaio aos pontos reais.

## Equipe e licença

Projeto Integrador Interdisciplinar 2 — Análise e Desenvolvimento de Sistemas.

- Guilherme H. De Castro Bobato.
- Lucas Bernardes da Rocha.
- Luiz Augusto Okada Mioto da Silva.
- Ruan Marcelo Ramacioti Luz.

Licença MIT em `LICENSE`. Bibliotecas de terceiros possuem licenças próprias em `vendor`.
