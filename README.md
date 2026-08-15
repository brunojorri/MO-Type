# MO Type

MO Type is a CEP panel for Adobe After Effects that creates modular text animations directly on a text layer. It supports independent IN and OUT animation, live controls, draggable timeline markers, and reusable presets.

## Features

- Animate by words, characters, or lines
- Independent IN and OUT animation
- Position, opacity, scale, and tracking modules
- Duration in frames, overlap, bipolar easing, and visibility cut
- `MO Type In` and `MO Type Out` timeline markers
- Controls stored on the text layer—no controller layer required
- Rich preset library captured from selected layers

## Quick installation on Windows

1. Download or clone this repository.
2. Close After Effects.
3. Open PowerShell in the repository folder.
4. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Approve the Windows administrator prompt. The installer will:

- copy the CEP extension to the current user's Adobe extensions folder;
- enable CEP debug loading;
- detect the newest installed After Effects version;
- create a timestamped backup of `PresetEffects.xml`;
- register `MO Type Controls` as a pseudo effect.

Restart After Effects and open **Window > Extensions > MO Type**.

If automatic detection fails, specify the After Effects folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -AfterEffectsPath "C:\Program Files\Adobe\Adobe After Effects 2026"
```

## Usage

1. Select one text layer.
2. Configure IN or OUT in the **Create** tab.
3. Place the timeline playhead where the animation should begin.
4. Click **Apply IN** or **Apply OUT**.
5. Fine-tune Position, Opacity, Scale, and Tracking in **Effect Controls > MO Type Controls**.
6. Use **Library > Save from Layer** to capture the complete setup as a preset.

## Compatibility

- Windows
- Adobe After Effects with CEP support
- Tested with Adobe After Effects 2026

## Author

[Bruno Jorri](https://www.instagram.com/brunojorri_work/)
