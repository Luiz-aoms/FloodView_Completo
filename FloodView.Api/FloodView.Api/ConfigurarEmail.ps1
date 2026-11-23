$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'FloodView.Api.csproj'
Write-Host 'Conta remetente: floodview.ocorrencias@gmail.com'
Write-Host 'Use a senha de app do Google, nao a senha normal da conta.'
$secret = Read-Host 'Cole a senha de app (entrada oculta)' -AsSecureString
try {
    $credential = [System.Net.NetworkCredential]::new('', $secret)
    $appPassword = $credential.Password -replace '\s', ''
    if ($appPassword.Length -ne 16) {
        throw 'A senha de app deve ter 16 caracteres. Nada foi alterado.'
    }
    @{
        Email = @{
            Habilitado = 'true'
            Host = 'smtp.gmail.com'
            Porta = '587'
            UsarTls = 'true'
            Remetente = 'floodview.ocorrencias@gmail.com'
            Usuario = 'floodview.ocorrencias@gmail.com'
            Destinatario = 'luiz.a.silva56@aluno.senai.br'
            Senha = $appPassword
        }
    } | ConvertTo-Json | dotnet user-secrets set --project $project
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel salvar a configuracao local.' }
    Write-Host 'Configuracao salva. Reinicie a API em Development e registre uma ocorrencia para testar o envio.'
    Write-Host 'Nenhum e-mail foi enviado por este script.'
} finally {
    $secret.Dispose()
    Remove-Variable appPassword, credential, secret -ErrorAction SilentlyContinue
}
