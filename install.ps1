param([string]$AfterEffectsPath)

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$extensionId = 'com.docato.motype'
$destination = Join-Path $env:APPDATA "Adobe\CEP\extensions\$extensionId"
$definition = Join-Path $source 'host\MOTypeControls.xml'

if (-not (Test-Path -LiteralPath $definition)) {
    throw "MO Type definition not found: $definition"
}

if (-not $AfterEffectsPath) {
    $adobeRoot = Join-Path $env:ProgramFiles 'Adobe'
    $candidates = Get-ChildItem -LiteralPath $adobeRoot -Directory -Filter 'Adobe After Effects *' -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending
    foreach ($candidate in $candidates) {
        $possible = Join-Path $candidate.FullName 'Support Files\PresetEffects.xml'
        if (Test-Path -LiteralPath $possible) {
            $AfterEffectsPath = $candidate.FullName
            break
        }
    }
}

if (-not $AfterEffectsPath) {
    throw 'Adobe After Effects was not found. Pass -AfterEffectsPath with the installation folder.'
}

$presetEffects = Join-Path $AfterEffectsPath 'Support Files\PresetEffects.xml'
if (-not (Test-Path -LiteralPath $presetEffects)) {
    throw "PresetEffects.xml not found: $presetEffects"
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-AfterEffectsPath', "`"$AfterEffectsPath`"")
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList ($arguments -join ' ') -Wait
    exit
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $destination -Recurse -Force

foreach ($version in 9..12) {
    $debugKey = "HKCU:\Software\Adobe\CSXS.$version"
    New-Item -Path $debugKey -Force | Out-Null
    New-ItemProperty -Path $debugKey -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$presetEffects.before-mo-type-$timestamp.bak"
Copy-Item -LiteralPath $presetEffects -Destination $backup -Force
$xml = Get-Content -LiteralPath $presetEffects -Raw
$fragment = Get-Content -LiteralPath $definition -Raw
if ($xml -match 'matchname="Pseudo/MO Type Controls"') {
    $xml = [regex]::Replace(
        $xml,
        '(?s)<Effect matchname="Pseudo/MO Type Controls".*?</Effect>',
        [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $fragment },
        1
    )
} else {
    $xml = $xml.Replace('</Effects>', "`r`n$fragment`r`n</Effects>")
}
[IO.File]::WriteAllText($presetEffects, $xml, [Text.UTF8Encoding]::new($false))

$verification = Get-Content -LiteralPath $presetEffects -Raw
if ($verification -notmatch 'matchname="Pseudo/MO Type Controls"') {
    throw 'MO Type Controls registration verification failed.'
}

Write-Host 'MO Type installed successfully.' -ForegroundColor Green
Write-Host "Extension: $destination"
Write-Host "After Effects backup: $backup"
Write-Host 'Restart After Effects, then open Window > Extensions > MO Type.'
