#!/bin/zsh
# MO Type installer for macOS
# Run from Terminal: chmod +x install-macos.command && ./install-macos.command

set -euo pipefail

EXTENSION_ID="com.docato.motype"
SOURCE_DIR="${0:A:h}"
DESTINATION_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXTENSION_ID"
DEFINITION="$SOURCE_DIR/host/MOTypeControls.xml"
REQUESTED_PATH="${1:-}"

if [[ ! -f "$DEFINITION" ]]; then
  print -u2 "MO Type definition was not found: $DEFINITION"
  exit 1
fi

find_preset_effects() {
  local candidate
  candidate=$(find /Applications -type f -path '*Adobe After Effects*.app/Contents/Resources/PresetEffects.xml' 2>/dev/null | sort -r | head -n 1)
  print -r -- "$candidate"
}

if [[ -n "$REQUESTED_PATH" ]]; then
  if [[ -d "$REQUESTED_PATH" ]]; then
    PRESET_EFFECTS="$REQUESTED_PATH/Contents/Resources/PresetEffects.xml"
  else
    PRESET_EFFECTS="$REQUESTED_PATH"
  fi
else
  PRESET_EFFECTS="$(find_preset_effects)"
fi

if [[ -z "$PRESET_EFFECTS" || ! -f "$PRESET_EFFECTS" ]]; then
  print -u2 "Adobe After Effects was not found."
  print -u2 "Run again with the path to Adobe After Effects.app, for example:"
  print -u2 "  ./install-macos.command '/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app'"
  exit 1
fi

print "Installing MO Type for the current user..."
mkdir -p "${DESTINATION_DIR:h}"
rm -rf "$DESTINATION_DIR"
ditto "$SOURCE_DIR" "$DESTINATION_DIR"
xattr -dr com.apple.quarantine "$DESTINATION_DIR" 2>/dev/null || true

# Allow unsigned CEP panels for current versions of the CEP runtime.
for version in {9..12}; do
  defaults write "com.adobe.CSXS.$version" PlayerDebugMode -string "1"
done

timestamp=$(date +%Y%m%d-%H%M%S)
backup="$PRESET_EFFECTS.before-mo-type-$timestamp.bak"
temporary="$(mktemp -t mo-type-preseteffects)"

cp "$PRESET_EFFECTS" "$temporary.source"

# Remove a prior MO Type definition, then insert the current definition directly
# before the closing Effects node. The resulting temporary file is copied back
# with sudo because After Effects is installed inside /Applications.
awk -v definition="$DEFINITION" '
  /<Effect matchname="Pseudo\/MO Type Controls"/ { skipping = 1 }
  skipping && /<\/Effect>/ { skipping = 0; next }
  skipping { next }
  /<\/Effects>/ {
    while ((getline line < definition) > 0) print line
    close(definition)
  }
  { print }
' "$temporary.source" > "$temporary"

if ! grep -q 'matchname="Pseudo/MO Type Controls"' "$temporary"; then
  rm -f "$temporary" "$temporary.source"
  print -u2 "MO Type Controls registration could not be prepared."
  exit 1
fi

print "Administrator permission is required to register MO Type Controls in After Effects."
sudo cp "$PRESET_EFFECTS" "$backup"
sudo cp "$temporary" "$PRESET_EFFECTS"
rm -f "$temporary" "$temporary.source"

print ""
print "MO Type installed successfully."
print "Extension: $DESTINATION_DIR"
print "After Effects backup: $backup"
print "Restart After Effects, then open Window > Extensions > MO Type."
