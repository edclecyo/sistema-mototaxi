Write-Host "🚀 Iniciando reparo completo do ambiente Node/NPM/NPX..." -ForegroundColor Cyan

# Ir para o diretório do script
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Definition)

# 1️⃣ Remover node_modules e arquivos de lock
if (Test-Path node_modules) {
    Write-Host "🧹 Removendo node_modules..."
    Remove-Item -Recurse -Force node_modules
}

if (Test-Path package-lock.json) {
    Write-Host "🧹 Removendo package-lock.json..."
    Remove-Item -Force package-lock.json
}

# 2️⃣ Limpar caches do npm
Write-Host "🧼 Limpando cache local e global do npm..."
npm cache clean --force | Out-Null

$npmCache = "$env:LOCALAPPDATA\npm-cache"
if (Test-Path $npmCache) {
    Remove-Item -Recurse -Force $npmCache
}

# 3️⃣ Verificar se o Node está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não encontrado. Instale o Node antes de continuar." -ForegroundColor Red
    exit
} else {
    Write-Host "✅ Node.js encontrado: $(node -v)" -ForegroundColor Green
}

# 4️⃣ Reinstalar npm e npx globais
Write-Host "🔁 Reinstalando npm e npx globais..."
try {
    npm install -g npm | Out-Null
    npm install -g npx | Out-Null
    Write-Host "✅ npm e npx reinstalados com sucesso." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Falha ao reinstalar npm/npx. Execute manualmente: npm install -g npm npx" -ForegroundColor Yellow
}

# 5️⃣ Reinstalar dependências do projeto
Write-Host "📦 Reinstalando dependências do projeto..."
try {
    npm install
    Write-Host "✅ Dependências reinstaladas com sucesso." -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao reinstalar dependências. Verifique o package.json." -ForegroundColor Red
}

# 6️⃣ Testar funcionamento do npx
Write-Host "🧪 Testando NPX..."
try {
    $npxVersion = npx -v
    Write-Host "✅ NPX funcional! Versão: $npxVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ NPX ainda apresenta falhas. Tente reinstalar o Node.js completamente." -ForegroundColor Red
}

# 7️⃣ Finalização
Write-Host ""
Write-Host "🎯 Reparo completo concluído!" -ForegroundColor Cyan
Write-Host "👉 Agora execute: npm run dev" -ForegroundColor Yellow
Write-Host ""
