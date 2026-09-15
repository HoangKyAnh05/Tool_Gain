$wshShell = New-Object -ComObject WScript.Shell

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) {
    $scriptDir = (Get-Location).Path
}

$electronExe = [System.IO.Path]::Combine($scriptDir, "node_modules", "electron", "dist", "electron.exe")
$iconPath = [System.IO.Path]::Combine($scriptDir, "assets", "icon.ico")

$vbsLauncher = [System.IO.Path]::Combine($scriptDir, "launch_hidden.vbs")
$wscriptExe = "C:\Windows\System32\wscript.exe"

$desktopPaths = @(
    [System.Environment]::GetFolderPath("Desktop"),
    "C:\Users\Admin\Desktop",
    "C:\Users\Admin\OneDrive\Desktop"
) | Select-Object -Unique

foreach ($dp in $desktopPaths) {
    if (Test-Path $dp) {
        $shortcutPath = [System.IO.Path]::Combine($dp, "AI Chat Assistant.lnk")
        $shortcut = $wshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $electronExe
        $shortcut.Arguments = "."
        $shortcut.WorkingDirectory = $scriptDir
        $shortcut.IconLocation = "$iconPath,0"
        $shortcut.Description = "AI Omnichannel Chat Assistant - Zalo, Messenger, Telegram Copilot & Auto-Reply"
        $shortcut.Save()
        Write-Host "Created Desktop Shortcut at: $shortcutPath"
    }
}
