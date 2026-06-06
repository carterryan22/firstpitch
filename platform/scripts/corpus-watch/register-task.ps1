<#
.SYNOPSIS
  Register (or remove) a Windows Scheduled Task that runs the corpus content
  watcher every 3 days.

.DESCRIPTION
  Creates a task named "BaseballCorpusWatch" that runs `npm run watch` in this
  folder on a 3-day cycle. The watcher scans the creator/social sources in
  corpus/sources.seed.json and updates corpus/review-queue.md. It never edits
  the corpus itself.

.EXAMPLE
  ./register-task.ps1
  ./register-task.ps1 -At "07:30"
  ./register-task.ps1 -Unregister
#>
[CmdletBinding()]
param(
  [string]$TaskName = "BaseballCorpusWatch",
  [string]$At = "08:00",          # local time of day to run
  [int]$IntervalDays = 3,
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

if ($Unregister) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task '$TaskName'."
  } else {
    Write-Host "No scheduled task named '$TaskName' found."
  }
  return
}

# npm.cmd avoids the PowerShell execution-policy block on npm.ps1.
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npm = if ($npmCmd) { $npmCmd.Source } else { "npm.cmd" }

$action = New-ScheduledTaskAction `
  -Execute $npm `
  -Argument "run cycle" `
  -WorkingDirectory $scriptDir

$trigger = New-ScheduledTaskTrigger -Daily -DaysInterval $IntervalDays -At $At

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Scans youth-baseball creator sources every $IntervalDays days and auto-promotes new content into corpus/sources.seed.json." `
  -Force | Out-Null

Write-Host "Registered '$TaskName': runs 'npm run cycle' every $IntervalDays days at $At."
Write-Host "Working dir: $scriptDir"
Write-Host "Remove with: ./register-task.ps1 -Unregister"
