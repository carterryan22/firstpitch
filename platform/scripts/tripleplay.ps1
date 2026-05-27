<#
.SYNOPSIS
  Manage the vendored Triple Play learning game.

.DESCRIPTION
  The TriplePlay game (https://github.com/rc22-dev/TriplePlay) is vendored into
  apps/web/public/triple-play/ so it ships as static assets alongside the
  Next.js app. This script keeps that copy in sync with upstream and (if a
  fork is configured) pushes local improvements back.

  All operations work against the repo root, using the `tripleplay` remote.
  Run from anywhere; the script normalises paths itself.

.PARAMETER Command
  pull   Fetch upstream and copy the latest index.html/styles.css/app.js into
         the vendored folder. Shows a diff first and prompts before writing.
  diff   Show the diff between the vendored copy and upstream/main.
  status Print remote + vendored file info.
  push   Push the vendored folder back to a fork as a clean subtree commit.
         Requires -ForkRemote naming a git remote you own.

.PARAMETER ForkRemote
  Name of a git remote pointing at your fork (only used by `push`).

.PARAMETER ForkBranch
  Branch on the fork to push to (default: main).

.PARAMETER Yes
  Skip confirmation prompts.

.EXAMPLE
  ./tripleplay.ps1 status
  ./tripleplay.ps1 diff
  ./tripleplay.ps1 pull
  ./tripleplay.ps1 push -ForkRemote tripleplay-fork -ForkBranch main
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet('pull','diff','status','push')]
  [string]$Command,

  [string]$ForkRemote,
  [string]$ForkBranch = 'main',
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'

$RepoRoot   = (git rev-parse --show-toplevel).Trim()
$Prefix     = 'platform/apps/web/public/triple-play'
$VendorDir  = Join-Path $RepoRoot $Prefix
$Remote     = 'tripleplay'
$Branch     = 'main'
$Files      = @('index.html','styles.css','app.js')

function Assert-Remote {
  $remotes = git remote
  if ($remotes -notcontains $Remote) {
    throw "Remote '$Remote' not configured. Run: git remote add $Remote https://github.com/rc22-dev/TriplePlay.git"
  }
}

function Get-UpstreamRef { "$Remote/$Branch" }

function Invoke-Pull {
  Assert-Remote
  Write-Host "Fetching $Remote..." -ForegroundColor Cyan
  git fetch $Remote --quiet
  $ref = Get-UpstreamRef

  Write-Host "`nDiff (vendored vs $ref):" -ForegroundColor Cyan
  foreach ($f in $Files) {
    Write-Host "`n--- $f ---" -ForegroundColor Yellow
    $tmp = New-TemporaryFile
    try {
      git show "${ref}:$f" | Set-Content -LiteralPath $tmp -NoNewline
      git --no-pager diff --no-index --color=always (Join-Path $VendorDir $f) $tmp
    } finally {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
  }

  if (-not $Yes) {
    $ans = Read-Host "`nOverwrite vendored files with $ref? [y/N]"
    if ($ans -notmatch '^(y|yes)$') { Write-Host "Aborted."; return }
  }

  foreach ($f in $Files) {
    $dest = Join-Path $VendorDir $f
    git show "${ref}:$f" | Set-Content -LiteralPath $dest -NoNewline
    Write-Host "  updated $Prefix/$f" -ForegroundColor Green
  }
  Write-Host "`nDone. Review with: git status -- $Prefix" -ForegroundColor Cyan
}

function Invoke-Diff {
  Assert-Remote
  git fetch $Remote --quiet
  $ref = Get-UpstreamRef
  foreach ($f in $Files) {
    Write-Host "`n--- $f (vendored vs $ref) ---" -ForegroundColor Yellow
    $tmp = New-TemporaryFile
    try {
      git show "${ref}:$f" | Set-Content -LiteralPath $tmp -NoNewline
      git --no-pager diff --no-index --color=always (Join-Path $VendorDir $f) $tmp
    } finally {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}

function Invoke-Status {
  Assert-Remote
  git fetch $Remote --quiet
  $ref = Get-UpstreamRef
  $upstreamSha = (git rev-parse "$ref").Trim()
  Write-Host "Remote      : $Remote ($(git remote get-url $Remote))"
  Write-Host "Upstream ref: $ref @ $upstreamSha"
  Write-Host "Vendor dir  : $Prefix"
  Write-Host ""
  foreach ($f in $Files) {
    $path = Join-Path $VendorDir $f
    if (-not (Test-Path $path)) {
      Write-Host ("  {0,-12} MISSING" -f $f) -ForegroundColor Red
      continue
    }
    $localHash = (git hash-object $path).Trim()
    $upstreamHash = (git rev-parse "${ref}:$f").Trim()
    $state = if ($localHash -eq $upstreamHash) { 'in-sync' } else { 'MODIFIED' }
    $color = if ($state -eq 'in-sync') { 'Green' } else { 'Yellow' }
    Write-Host ("  {0,-12} {1}  (local {2}  upstream {3})" -f $f, $state, $localHash.Substring(0,8), $upstreamHash.Substring(0,8)) -ForegroundColor $color
  }
}

function Invoke-Push {
  if (-not $ForkRemote) { throw "Specify -ForkRemote (a git remote you own, e.g. tripleplay-fork)." }
  $remotes = git remote
  if ($remotes -notcontains $ForkRemote) { throw "Fork remote '$ForkRemote' not configured." }

  # Build a synthetic subtree of just the vendored folder and push it.
  Write-Host "Splitting subtree $Prefix..." -ForegroundColor Cyan
  $splitSha = (git subtree split --prefix=$Prefix HEAD).Trim()
  if (-not $splitSha) { throw "git subtree split returned no SHA." }
  Write-Host "Subtree SHA: $splitSha"

  if (-not $Yes) {
    $ans = Read-Host "Force-push $splitSha to ${ForkRemote}/$ForkBranch ? [y/N]"
    if ($ans -notmatch '^(y|yes)$') { Write-Host "Aborted."; return }
  }

  git push $ForkRemote "${splitSha}:refs/heads/$ForkBranch" --force
  Write-Host "Pushed to ${ForkRemote}/$ForkBranch" -ForegroundColor Green
}

Push-Location $RepoRoot
try {
  switch ($Command) {
    'pull'   { Invoke-Pull }
    'diff'   { Invoke-Diff }
    'status' { Invoke-Status }
    'push'   { Invoke-Push }
  }
} finally {
  Pop-Location
}
