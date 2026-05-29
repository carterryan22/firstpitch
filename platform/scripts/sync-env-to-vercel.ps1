<#
.SYNOPSIS
  Sync a local .env file to Vercel project environment variables.

.DESCRIPTION
  Reads KEY=VALUE pairs from an env file and pushes each one to the
  specified Vercel environments (production, preview, development).
  Existing values are removed first so `vercel env add` does not prompt.

.PARAMETER EnvFile
  Path to the local env file. Defaults to apps/web/.env.local.

.PARAMETER Environments
  Vercel environments to target. Defaults to all three.

.PARAMETER Skip
  Variable names to skip (e.g. local-only paths). Defaults to CORPUS_DIR.

.PARAMETER WhatIf
  Show what would be pushed without changing anything.

.EXAMPLE
  ./scripts/sync-env-to-vercel.ps1
  ./scripts/sync-env-to-vercel.ps1 -Environments production -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]   $EnvFile      = (Join-Path $PSScriptRoot '..\apps\web\.env.local'),
  [string[]] $Environments = @('production', 'preview', 'development'),
  [string[]] $Skip         = @('CORPUS_DIR')
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "vercel CLI not found. Install with: npm i -g vercel"
  exit 1
}

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file not found: $EnvFile"
  exit 1
}

$workDir = Split-Path (Resolve-Path $EnvFile) -Parent
Push-Location $workDir
try {
  if (-not (Test-Path (Join-Path $workDir '.vercel\project.json'))) {
    Write-Host "No .vercel/project.json found in $workDir." -ForegroundColor Yellow
    Write-Host "Run 'vercel link' here first, then re-run this script." -ForegroundColor Yellow
    exit 1
  }

  $lines = Get-Content $EnvFile
  $count = 0

  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -match '^\s*#') { continue }
    if ($line -notmatch '=') { continue }

    $name, $value = $line -split '=', 2
    $name  = $name.Trim()
    $value = $value.Trim().Trim('"').Trim("'")

    if (-not $name)  { continue }
    if (-not $value) { Write-Host "skip (empty)  $name" -ForegroundColor DarkGray; continue }
    if ($Skip -contains $name) { Write-Host "skip (rule)   $name" -ForegroundColor DarkGray; continue }

    foreach ($env in $Environments) {
      $target = "$name -> $env"
      if ($PSCmdlet.ShouldProcess($target, 'vercel env set')) {
        & vercel env rm $name $env --yes 2>$null | Out-Null
        $value | & vercel env add $name $env | Out-Null
        if ($LASTEXITCODE -eq 0) {
          Write-Host "set           $target" -ForegroundColor Green
          $count++
        } else {
          Write-Host "FAILED        $target" -ForegroundColor Red
        }
      } else {
        Write-Host "would set     $target" -ForegroundColor Cyan
      }
    }
  }

  Write-Host ""
  Write-Host "Done. $count assignment(s) written." -ForegroundColor Green
  Write-Host "Trigger a redeploy with: vercel --prod" -ForegroundColor Yellow
}
finally {
  Pop-Location
}
