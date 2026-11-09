# MO Type

MO Type is a CEP panel for Adobe After Effects that creates modular text animations directly on a text layer. It supports independent IN and OUT animation, live controls, draggable timeline markers, and reusable presets.

## Features

- Animate by words, characters, or lines
- Independent IN and OUT animation
- Position, opacity, scale, and tracking modules
- Duration in frames, overlap, bipolar easing, and visibility cut
- `MO Type In` and `MO Type Out` timeline markers
- Automatic marker placement: IN at the layer start and OUT timed to finish at the layer end
- Controls stored on the text layer—no controller layer required
- Rich preset library captured from selected layers
- Release button detaches MO Type to a native After Effects controller for Collect Files / handoff

## Quick installation on Windows

Close After Effects, open **PowerShell**, paste this one line and press Enter:

```powershell
irm https://raw.githubusercontent.com/brunojorri/MO-Type/main/install-online.ps1 | iex
```

Approve the Windows administrator prompt. No download, unzip, or repository clone is required.

The command downloads the current MO Type package directly from this repository and runs its installer. It will:

- copy the CEP extension to the current user's Adobe extensions folder;
- enable CEP debug loading;
- detect the newest installed After Effects version;
- create a timestamped backup of `PresetEffects.xml`;
- register `MO Type Controls` as a pseudo effect.

Restart After Effects and open **Window > Extensions > MO Type**.

### Local/manual installation

If you prefer to install from a downloaded copy of the repository, open PowerShell in its folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

If automatic detection fails, specify the After Effects folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -AfterEffectsPath "C:\Program Files\Adobe\Adobe After Effects 2026"
```

## Quick installation on macOS

1. Download and unzip the release.
2. Close After Effects.
3. In **Terminal**, go to the unzipped `com.docato.motype` folder.
4. Run:

```zsh
chmod +x ./install-macos.command
./install-macos.command
```

Enter your macOS administrator password when requested. The installer will:

- copy the CEP extension to your user Adobe extensions folder;
- enable CEP debug loading for current CEP runtimes;
- find the newest installed After Effects application;
- create a timestamped backup of `PresetEffects.xml`;
- register `MO Type Controls` as a pseudo effect.

Restart After Effects and open **Window > Extensions > MO Type**.

If automatic detection does not find After Effects, pass the application path:

```zsh
./install-macos.command "/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app"
```

## Usage

1. Select one text layer.
2. Configure IN or OUT in the **Create** tab.
3. Place the timeline playhead where the animation should begin.
4. Click **Apply IN** or **Apply OUT**.
5. Fine-tune Position, Opacity, Scale, and Tracking in **Effect Controls > MO Type Controls**.
6. Use **Library > Save from Layer** to capture the complete setup as a preset.
7. Before sending a project, use **Release** on each finished MO Type layer. It creates a native Null controller with standard After Effects Slider and Checkbox controls, relinks the animation to it, and removes MO Type Controls. The animation stays editable without requiring MO Type.

## Compatibility

- Windows and macOS
- Adobe After Effects with CEP support
- Tested with Adobe After Effects 2026

## Author

[Bruno Jorri](https://www.instagram.com/brunojorri_work/)
