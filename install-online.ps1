param([string]$AfterEffectsPath)

$ErrorActionPreference = 'Stop'
$repositoryZip = 'https://github.com/brunojorri/MO-Type/archive/refs/heads/main.zip'
$temporaryRoot = Join-Path $env:TEMP ('MO-Type-' + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $temporaryRoot 'MO-Type.zip'

try {
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    Write-Host 'Downloading MO Type...' -ForegroundColor Cyan
    Invoke-WebRequest -Uri $repositoryZip -OutFile $archivePath -UseBasicParsing
    Expand-Archive -LiteralPath $archivePath -DestinationPath $temporaryRoot -Force

    $installer = Get-ChildItem -LiteralPath $temporaryRoot -Filter 'install.ps1' -File -Recurse |
        Select-Object -First 1
    if ($null -eq $installer) {
        throw 'The downloaded MO Type installer was not found.'
    }

    # The bootstrap itself runs from memory, but the package installer is a
    # downloaded file. Launch it explicitly with Bypass so restrictive local
    # execution policies do not prevent a normal one-line installation.
    $installerArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $installer.FullName)
    if ($AfterEffectsPath) {
        $installerArguments += @('-AfterEffectsPath', $AfterEffectsPath)
    }
    & powershell.exe @installerArguments
    if ($LASTEXITCODE -ne 0) {
        throw "MO Type installer failed with exit code $LASTEXITCODE."
    }
}
finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
