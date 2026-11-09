param([string]$AfterEffectsPath)

$ErrorActionPreference = 'Stop'
$repositoryZip = 'https://github.com/brunojorri/MO-Type/archive/refs/heads/main.zip'
$bootstrapUrl = 'https://raw.githubusercontent.com/brunojorri/MO-Type/main/install-online.ps1?v=3'
$temporaryRoot = Join-Path $env:TEMP ('MO-Type-' + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $temporaryRoot 'MO-Type.zip'

try {
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    Write-Host 'Downloading MO Type...' -ForegroundColor Cyan
    Invoke-WebRequest -Uri $repositoryZip -OutFile $archivePath -UseBasicParsing
    Expand-Archive -LiteralPath $archivePath -DestinationPath $temporaryRoot -Force

    $installer = Get-ChildItem -LiteralPath $temporaryRoot -Filter 'install.ps1' -File -Recurse |
        Select-Object -First 1
    if ($null -eq $installer) { throw 'The downloaded MO Type package was not found.' }

    $source = $installer.Directory.FullName
    $extensionId = 'com.docato.motype'
    $destination = Join-Path $env:APPDATA "Adobe\CEP\extensions\$extensionId"
    $definition = Join-Path $source 'host\MOTypeControls.xml'
    if (-not (Test-Path -LiteralPath $definition)) { throw "MO Type definition not found: $definition" }

    if (-not $AfterEffectsPath) { $AfterEffectsPath = $env:MO_TYPE_AFTER_EFFECTS_PATH }
    if (-not $AfterEffectsPath) {
        $adobeRoot = Join-Path $env:ProgramFiles 'Adobe'
        $candidates = Get-ChildItem -LiteralPath $adobeRoot -Directory -Filter 'Adobe After Effects *' -ErrorAction SilentlyContinue | Sort-Object Name -Descending
        foreach ($candidate in $candidates) {
            $possible = Join-Path $candidate.FullName 'Support Files\PresetEffects.xml'
            if (Test-Path -LiteralPath $possible) { $AfterEffectsPath = $candidate.FullName; break }
        }
    }
    if (-not $AfterEffectsPath) { throw 'Adobe After Effects was not found. Install After Effects first, then run this command again.' }

    $presetEffects = Join-Path $AfterEffectsPath 'Support Files\PresetEffects.xml'
    if (-not (Test-Path -LiteralPath $presetEffects)) { throw "PresetEffects.xml not found: $presetEffects" }

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        $command = "irm '$bootstrapUrl' | iex"
        if ($AfterEffectsPath) {
            $escapedPath = $AfterEffectsPath.Replace("'", "''")
            $command = "`$env:MO_TYPE_AFTER_EFFECTS_PATH='$escapedPath'; $command"
        }
        $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command)
        if ($process.ExitCode -ne 0) { throw "MO Type installer failed with exit code $($process.ExitCode)." }
        return
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
    $startTag = '<Effect matchname="Pseudo/MO Type Controls"'
    $startIndex = $xml.IndexOf($startTag, [StringComparison]::Ordinal)
    if ($startIndex -ge 0) {
        $endIndex = $xml.IndexOf('</Effect>', $startIndex, [StringComparison]::Ordinal)
        if ($endIndex -lt 0) { throw 'Existing MO Type Controls definition is malformed.' }
        $endIndex += '</Effect>'.Length
        $xml = $xml.Remove($startIndex, $endIndex - $startIndex)
    }
    $rootEnd = $xml.LastIndexOf('</Effects>', [StringComparison]::Ordinal)
    if ($rootEnd -lt 0) { throw 'PresetEffects.xml has no closing Effects tag.' }
    $xml = $xml.Insert($rootEnd, "`r`n$fragment`r`n")
    [IO.File]::WriteAllText($presetEffects, $xml, [Text.UTF8Encoding]::new($false))
    $verification = Get-Content -LiteralPath $presetEffects -Raw
    if ($verification -notmatch 'matchname="Pseudo/MO Type Controls"') { throw 'MO Type Controls registration verification failed.' }

    Write-Host ''
    Write-Host 'MO Type installed successfully.' -ForegroundColor Green
    Write-Host "Extension: $destination"
    Write-Host "After Effects backup: $backup"
    Write-Host 'Restart After Effects, then open Window > Extensions > MO Type.'
}
finally {
    if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
