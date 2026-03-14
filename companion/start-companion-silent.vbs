' KanPrompt Companion — Silent Autostart
' Place a shortcut to this file in shell:startup to auto-start the companion
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "node kanprompt-companion.js", 0, False
