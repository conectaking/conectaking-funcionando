Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\playa\OneDrive\Documentos\conectaking-funcionando-1\monitorar_tunel.ps1""", 0, False
Set WshShell = Nothing
