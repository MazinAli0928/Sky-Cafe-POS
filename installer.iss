; Inno Setup Compiler Script for SKY CAFE POS v1.0.0
; Targets: Windows 10 (64-bit), Windows 11 (64-bit)

#define MyAppName "SKY CAFE POS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "SKY CAFE"
#define MyAppExeName "SKY Cafe POS.exe"

[Setup]
AppId={{D37F291A-483B-4C91-92E2-1A4C8039E111}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=.\installer_dist
OutputBaseFilename=SKY-Cafe-POS-v1.0.0-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "backend\dist\SKY Cafe POS\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{localappdata}\SKY Cafe POS\data"
Name: "{localappdata}\SKY Cafe POS\config"
Name: "{localappdata}\SKY Cafe POS\logs"
Name: "{localappdata}\SKY Cafe POS\backups"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Do NOT delete database or backups on uninstall automatically to ensure data safety
Type: filesandordirs; Name: "{localappdata}\SKY Cafe POS\logs\*"
