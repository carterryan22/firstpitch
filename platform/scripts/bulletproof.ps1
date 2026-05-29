# scripts/bulletproof.ps1
# Runs the full pipeline N times: clean → vitest → eval CLI → next build →
# next start (prod) → live-hit every endpoint → assert JSON shape → kill server.
# Exits non-zero on the first failure.

param([int]$Runs = 1, [int]$Port = 3030)

$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repo
$web  = Join-Path $repo 'apps\web'

function Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Pass($msg)    { Write-Host "  PASS $msg" -ForegroundColor Green }
function Fail($msg)    { Write-Host "  FAIL $msg" -ForegroundColor Red; exit 1 }

function Wait-Http($url, $timeoutSec = 30) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    try { $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { return $true } } catch {}
    Start-Sleep -Milliseconds 500
  }
  return $false
}

for ($i = 1; $i -le $Runs; $i++) {
  Section "Bulletproof run $i / $Runs"

  Section "1. Clean caches"
  if (Test-Path (Join-Path $web '.next')) { Remove-Item -Recurse -Force (Join-Path $web '.next') }
  Pass ".next removed"

  Section "2. vitest"
  $vt = cmd /c "npx vitest run 2>&1" | Out-String
  if ($LASTEXITCODE -ne 0) { Write-Host $vt; Fail "vitest exit $LASTEXITCODE" }
  if ($vt -notmatch 'passed') { Write-Host $vt; Fail "vitest output had no 'passed' marker" }
  Pass "vitest exit 0"

  Section "3. eval CLI"
  $ev = cmd /c "npm run eval --silent 2>&1" | Out-String
  if ($LASTEXITCODE -ne 0) { Write-Host $ev; Fail "eval exit $LASTEXITCODE" }
  if ($ev -notmatch 'passed') { Write-Host $ev; Fail "eval output had no 'passed' marker" }
  Pass "eval exit 0"

  Section "4. next build (prod)"
  Push-Location $web
  $bld = cmd /c "npx next build 2>&1" | Out-String
  Pop-Location
  if ($LASTEXITCODE -ne 0) { Write-Host $bld; Fail "next build exit $LASTEXITCODE" }
  if (-not ($bld -match 'Compiled successfully')) { Write-Host $bld; Fail "build did not compile" }
  Pass "next build compiled"

  Section "5. boot prod server"
  Push-Location $web
  $proc = Start-Process -PassThru -WindowStyle Hidden -FilePath cmd -ArgumentList "/c npx next start -p $Port"
  Pop-Location
  $base = "http://localhost:$Port"
  if (-not (Wait-Http "$base/" 45)) { Stop-Process -Id $proc.Id -Force; Fail "server did not become ready" }
  Pass "server up on $Port"

  try {
    Section "6. live endpoint asserts"
    $h = @{ 'Content-Type' = 'application/json' }

    # Pages
    foreach ($p in '/','/coach','/parent','/drills','/missions','/safety','/practice/new') {
      $s = (Invoke-WebRequest "$base$p" -UseBasicParsing).StatusCode
      if ($s -ne 200) { Fail "page $p status $s" }
    }
    Pass "all pages 200"

    # /api/eval
    $r = Invoke-RestMethod "$base/api/eval"
    if ($r.total -lt 100 -or $r.failed -ne 0) { Fail "eval API total=$($r.total) failed=$($r.failed)" }
    Pass "eval API total=$($r.total) failed=$($r.failed)"

    # /api/drills
    $r = Invoke-RestMethod "$base/api/drills"
    if ($r.count -lt 5) { Fail "drills count=$($r.count)" }
    Pass "drills count=$($r.count)"

    # /api/missions
    $r = Invoke-RestMethod "$base/api/missions?age=11"
    if ($r.count -lt 2) { Fail "missions count=$($r.count)" }
    Pass "missions(11) count=$($r.count)"

    # /api/retrieve
    $r = Invoke-RestMethod "$base/api/retrieve?q=pitch+smart&kinds=source"
    if ($r.count -lt 1) { Fail "retrieve count=$($r.count)" }
    Pass "retrieve top='$($r.results[0].title)' tier=$($r.results[0].citation.tier)"

    # /api/dont-do-today
    $body = @{ age=11; conditions=@{ lightning=$true } } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri "$base/api/dont-do-today" -Headers $h -Body $body
    if ($r.okToProceed -ne $false -or $r.blocks.Count -lt 1) { Fail "dont-do-today did not block lightning" }
    Pass "dont-do-today blocked lightning"

    # /api/escalate
    $body = @{ playerId='p1'; symptom='dizzy'; severity='mild'; reportedBy='coach' } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri "$base/api/escalate" -Headers $h -Body $body
    if (-not ($r.escalateTo -contains 'parent') -or -not ($r.escalateTo -contains 'coach')) { Fail "head injury not escalated to parent+coach" }
    Pass "escalate head: [$($r.escalateTo -join ',')] within $($r.withinMinutes)min"

    # /api/diagnose
    $body = @{
      outcomeMetric='EV_TEE'
      entries=@(@{ metricKey='BAT_SPEED'; value=50; recordedAt='2026-05-24T12:00:00Z'; verification='coach_verified' })
      expectedRanges=@(@{ metricKey='BAT_SPEED'; min=55; max=70 })
    } | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Method POST -Uri "$base/api/diagnose" -Headers $h -Body $body
    if ($r.diagnoses.Count -lt 1 -or $r.diagnoses[0].driver.key -ne 'BAT_SPEED_DEFICIT') {
      Fail "diagnose top=$($r.diagnoses[0].driver.key)"
    }
    Pass "diagnose top=BAT_SPEED_DEFICIT conf=$($r.diagnoses[0].confidence)"

    # /api/ingest
    $csv = "Player,#,PA,AB,H`nCole Carter,7,4,4,2`nMystery Kid,99,2,2,0"
    $body = @{ csv=$csv; roster=@(@{ playerId='p1'; displayName='Cole Carter'; jerseyNumber='7' }) } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri "$base/api/ingest" -Headers $h -Body $body
    if ($r.parsedRowCount -ne 2 -or ($r.unmatchedNames -notcontains 'Mystery Kid')) { Fail "ingest rows=$($r.parsedRowCount)" }
    Pass "ingest rows=$($r.parsedRowCount) unmatched=$($r.unmatchedNames -join ',')"

    # /api/compile
    $body = @{
      age=11; durationMin=60; environmentTier='T2_cage_gym'
      equipmentAvailable=@('mat','ball','cone','tee','bat')
      coaches=2; players=8; focus=@('throwing','hitting')
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri "$base/api/compile" -Headers $h -Body $body
    if (-not $r.blocks -or $r.blocks.Count -lt 1) { Fail "compile produced no blocks" }
    Pass "compile blocks=$($r.blocks.Count) quality=$($r.qualityScore)"

    # /api/safety/check
    $body = @{
      age=11; plannedPitches=100
      todayCount=0; soreToday=$false; todayCatchingInnings=0; continuousThrowingDays=0
      outingsByDate=@{}
    } | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Method POST -Uri "$base/api/safety/check" -Headers $h -Body $body
    if ($r.allowed -ne $false) { Fail "safety/check should block 100 pitches at age 11" }
    Pass "safety/check correctly blocked 100 pitches @ 11"

    Section "7. shutdown"
  } finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    # Kill any leftover node.exe holding the port
    Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object {
      try { Stop-Process -Id $_.OwningProcess -Force } catch {}
    }
    Pass "server killed"
  }
}

Write-Host "`nALL $Runs RUNS PASSED" -ForegroundColor Green
