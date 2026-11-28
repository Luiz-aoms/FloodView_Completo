$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'FloodView.Api.csproj'

Write-Host 'Crie uma chave de API na sua conta Brevo e verifique o endereço remetente.'
$secret = Read-Host 'Cole a chave de API da Brevo (entrada oculta)' -AsSecureString
$sender = Read-Host 'E-mail remetente verificado na Brevo'
if ([string]::IsNullOrWhiteSpace($sender) -or $sender -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    $secret.Dispose()
    throw 'Informe um endereço de e-mail remetente válido.'
}

try {
    $apiKey = [System.Net.NetworkCredential]::new('', $secret).Password
    dotnet user-secrets set --project $project 'Email:ApiKey' $apiKey
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel salvar a chave local.' }
    dotnet user-secrets set --project $project 'Email:Remetente' $sender
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel salvar o remetente.' }
    dotnet user-secrets set --project $project 'Email:Destinatario' 'luiz.a.silva56@aluno.senai.br'
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel salvar o destinatario.' }
    dotnet user-secrets set --project $project 'Email:Habilitado' 'true'
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel habilitar o envio.' }
    Write-Host 'Configuracao salva nos User Secrets. Reinicie a API; este script nao envia e-mail.'
}
finally {
    $secret.Dispose()
    Remove-Variable apiKey, secret -ErrorAction SilentlyContinue
}
