Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Get directory where this VBS file is located
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

electronExe = currentDir & "\node_modules\electron\dist\electron.exe"

' Launch electron directly (1 = normal visible window for GUI app, False = don't block)
If fso.FileExists(electronExe) Then
    WshShell.Run """" & electronExe & """ """ & currentDir & """", 1, False
Else
    WshShell.Run "cmd.exe /c npm start", 0, False
End If
