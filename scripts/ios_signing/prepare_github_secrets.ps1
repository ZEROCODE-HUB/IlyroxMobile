<#
.SYNOPSIS
    Prepara y sube los secretos de iOS signing a GitHub Actions para el proyecto ilyrox.

.DESCRIPTION
    Convierte los archivos de firma a Base64 y los sube como secrets al repositorio de GitHub.
    Requiere GitHub CLI (gh) instalado y autenticado.

.EXAMPLE
    .\prepare_github_secrets.ps1 `
        -P12Path "c:\ily\ios_distribution.p12" `
        -P12Password "mi_contraseña_segura" `
        -ProfilePath "$env:USERPROFILE\Downloads\ilyrox_AppStore.mobileprovision" `
        -ApiKeyP8Path "c:\ily\AuthKey_7TB389LN84.p8" `
        -SetGhSecrets
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$P12Path,

    [Parameter(Mandatory=$true)]
    [string]$P12Password,

    [Parameter(Mandatory=$true)]
    [string]$ProfilePath,

    [Parameter(Mandatory=$false)]
    [string]$ExtensionProfilePath,

    [Parameter(Mandatory=$true)]
    [string]$ApiKeyP8Path,

    [switch]$SetGhSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-FilePath {
    param([string]$Path, [string]$Name)
    if (-not (Test-Path $Path)) {
        Write-Error "❌ No se encontró $Name en: $Path"
        exit 1
    }
    Write-Host "✅ $Name encontrado: $Path" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔐 ilyrox - Preparación de secretos iOS para GitHub Actions" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Validar que los archivos existen
Test-FilePath $P12Path          "Certificado .p12"
Test-FilePath $ProfilePath      "Perfil de provisión .mobileprovision"
if ($ExtensionProfilePath) {
    Test-FilePath $ExtensionProfilePath "Perfil de provisión de extensión .mobileprovision"
}
Test-FilePath $ApiKeyP8Path     "API Key .p8"

# Convertir a Base64
Write-Host ""
Write-Host "📦 Convirtiendo archivos a Base64..." -ForegroundColor Yellow

$certBase64    = [Convert]::ToBase64String([IO.File]::ReadAllBytes($P12Path))
$profileBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ProfilePath))
$extProfileBase64 = $null
if ($ExtensionProfilePath) {
    $extProfileBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ExtensionProfilePath))
}
$apiKeyContent = Get-Content $ApiKeyP8Path -Raw

# Generar contraseña de keychain aleatoria
$keychainPassword = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes(
    [System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()
)).Substring(0, 44)

Write-Host ""
Write-Host "🔑 Secretos generados:" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "IOS_DISTRIBUTION_CERT_PASSWORD  = $P12Password"
Write-Host "IOS_KEYCHAIN_PASSWORD           = $keychainPassword"
Write-Host ""
Write-Host "⚠️  GUARDA estos valores en un lugar seguro (gestor de contraseñas)." -ForegroundColor Red
Write-Host ""

if ($SetGhSecrets) {
    # Verificar que gh CLI está disponible
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Error "❌ GitHub CLI (gh) no está instalado. Instálalo con: winget install --id GitHub.cli"
        exit 1
    }

    # Verificar autenticación
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ No estás autenticado en GitHub CLI. Ejecuta: gh auth login"
        exit 1
    }

    Write-Host "🚀 Subiendo secretos a GitHub..." -ForegroundColor Cyan
    Write-Host ""

    $secrets = @{
        "IOS_DISTRIBUTION_CERT_BASE64"   = $certBase64
        "IOS_DISTRIBUTION_CERT_PASSWORD" = $P12Password
        "IOS_PROVISIONING_PROFILE_BASE64"= $profileBase64
        "IOS_KEYCHAIN_PASSWORD"          = $keychainPassword
        "APPSTORE_API_PRIVATE_KEY"       = $apiKeyContent
    }

    if ($extProfileBase64) {
        $secrets["IOS_EXTENSION_PROVISIONING_PROFILE_BASE64"] = $extProfileBase64
    }

    foreach ($secret in $secrets.GetEnumerator()) {
        Write-Host "  → Subiendo $($secret.Key)..." -NoNewline
        $secret.Value | gh secret set $secret.Key --repo NoCodeHero83/i360Mobile
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌ ERROR" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "✅ Proceso completado. Verifica en:" -ForegroundColor Green
    Write-Host "   https://github.com/NoCodeHero83/i360Mobile/settings/secrets/actions" -ForegroundColor Blue
    Write-Host ""
    Write-Host "⚠️  Recuerda también agregar manualmente estos secretos con las env vars de la app:" -ForegroundColor Yellow
    Write-Host "   EXPO_PUBLIC_SUPABASE_URL" 
    Write-Host "   EXPO_PUBLIC_SUPABASE_ANON_KEY"
    Write-Host "   EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY"
} else {
    Write-Host "ℹ️  Modo dry-run (sin -SetGhSecrets). Copia los valores manualmente en GitHub:" -ForegroundColor Yellow
    Write-Host "   https://github.com/NoCodeHero83/i360Mobile/settings/secrets/actions" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Secreto: IOS_DISTRIBUTION_CERT_BASE64"
    Write-Host $certBase64
    Write-Host ""
    Write-Host "Secreto: IOS_PROVISIONING_PROFILE_BASE64"
    Write-Host $profileBase64
    Write-Host ""
    Write-Host "Secreto: APPSTORE_API_PRIVATE_KEY"
    Write-Host $apiKeyContent
}
