function MOTypeBasedOn(unit) {
    if (unit == "words") { return 3; }
    if (unit == "lines") { return 4; }
    return 1;
}
function MOTypeBool(value) { return value == true || value == "true"; }
function MOTypeGetFrameRate() {
    var comp = app.project.activeItem;
    return comp != null && comp instanceof CompItem ? comp.frameRate : 30;
}
function MOTypeDirection(preset) {
    if (preset == "none") { return 6; }
    if (preset == "down") { return 2; }
    if (preset == "left") { return 3; }
    if (preset == "right") { return 4; }
    if (preset == "fade") { return 5; }
    return 1;
}
function MOTypeRemoveAnimators(layer) {
    var text = layer.property("ADBE Text Properties");
    if (text == null) { return 0; }
    var animators = text.property("ADBE Text Animators"), removed = 0;
    for (var i = animators.numProperties; i >= 1; i--) {
        if (animators.property(i).name.indexOf("MO Type") == 0) { animators.property(i).remove(); removed++; }
    }
    return removed;
}
function MOTypeRemovePhaseAnimators(layer, isOut) {
    var text = layer.property("ADBE Text Properties");
    if (text == null) { return 0; }
    var animators = text.property("ADBE Text Animators"), removed = 0;
    for (var i = animators.numProperties; i >= 1; i--) {
        var name = animators.property(i).name;
        var belongsToOut = name.indexOf("MO Type Out ") == 0;
        var belongsToIn = name.indexOf("MO Type ") == 0 && !belongsToOut;
        if ((isOut && belongsToOut) || (!isOut && belongsToIn)) { animators.property(i).remove(); removed++; }
    }
    return removed;
}
function MOTypeFindControl(group, name) {
    var direct = group.property(name);
    if (direct != null) { return direct; }
    for (var i = 1; i <= group.numProperties; i++) {
        var child = group.property(i);
        if (child != null && child.numProperties > 0) {
            var found = MOTypeFindControl(child, name);
            if (found != null) { return found; }
        }
    }
    return null;
}
function MOTypeSetControl(control, name, value) {
    var property = MOTypeFindControl(control, name);
    if (property == null) { throw new Error("Missing MO Type control: " + name + ". Restart After Effects after installing the update."); }
    property.setValue(value);
}
function MOTypeRemoveMarker(layer, comment) {
    var markers = layer.property("ADBE Marker"), removed = 0;
    if (markers == null) { return 0; }
    for (var i = markers.numKeys; i >= 1; i--) {
        if (markers.keyValue(i).comment == comment) { markers.removeKey(i); removed++; }
    }
    return removed;
}
function MOTypeSetMarker(layer, comment, markerTime) {
    MOTypeRemoveMarker(layer, comment);
    layer.property("ADBE Marker").setValueAtTime(markerTime, new MarkerValue(comment));
}
function MOTypeVectorExpression(prefix) {
    if (prefix == "Out ") {
        return 'var c=effect("MO Type Controls");var d=Math.round(c("Out Direction"));var n=c("Out Distance");d==1?[0,-n,0]:d==2?[0,n,0]:d==3?[-n,0,0]:d==4?[n,0,0]:[0,0,0];';
    }
    return 'var c=effect("MO Type Controls");var d=Math.round(c("Direction"));var n=c("Distance");d==1?[0,n,0]:d==2?[0,-n,0]:d==3?[n,0,0]:d==4?[-n,0,0]:[0,0,0];';
}
function MOTypeVectorValue(preset, distance) {
    var n = Number(distance);
    if (preset == "up") { return [0, n, 0]; }
    if (preset == "down") { return [0, -n, 0]; }
    if (preset == "left") { return [n, 0, 0]; }
    if (preset == "right") { return [-n, 0, 0]; }
    return [0, 0, 0];
}
function MOTypeSelector(animator, unit, isOut, visibility) {
    var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    selector.property("ADBE Text Range Type2").setValue(MOTypeBasedOn(unit));
    var amount = selector.property("ADBE Text Expressible Amount"), e = "";
    var prefix = isOut ? "Out " : "";
    var markerName = isOut ? "MO Type Out" : "MO Type In";
    e += 'var c=effect("MO Type Controls");\n';
    e += 'var enabled=c("' + (isOut ? "Out Enabled" : "In Enabled") + '")>0?1:0;\n';
    if (!visibility) { e += 'enabled*=c("' + prefix + 'Position Enabled")>0?1:0;\n'; }
    e += 'var d=Math.max(1,c("' + prefix + 'Duration Frames"))*thisComp.frameDuration;\n';
    e += 'var overlap=Math.max(0,Math.min(.99,c("' + prefix + 'Overlap")/100));\n';
    e += 'var step=d*(1-overlap);\n';
    e += 'var start=c("' + prefix + 'Start Time");\n';
    e += 'try{start+=marker.key("' + markerName + '").time;}catch(err){}\n';
    e += 'var local=time-start-(textIndex-1)*step;\n';
    e += 'var p=Math.max(0,Math.min(1,local/d));\n';
    e += 'var curve=Math.max(-1,Math.min(1,c("' + prefix + 'Ease")/100));\n';
    e += 'var easedOut=1-Math.pow(1-p,3);\n';
    e += 'var easedIn=Math.pow(p,3);\n';
    e += 'var eased=curve<0?p*(1+curve)+easedIn*(-curve):p*(1-curve)+easedOut*curve;\n';
    if (visibility) {
        e += 'var fadeOn=c("' + prefix + 'Opacity Enabled")>0;\n';
        e += 'var cut=Math.max(0,Math.min(1,c("' + prefix + 'Visibility Cut")/100));\n';
        if (isOut) { e += 'enabled*(fadeOn?100*eased:(local<d*cut?0:100));\n'; }
        else { e += 'enabled*(fadeOn?100*(1-eased):(local<d*cut?100:0));\n'; }
    } else {
        e += isOut ? 'enabled*100*eased;\n' : 'enabled*100*(1-eased);\n';
    }
    amount.expression = e;
}
function MOTypeAddScale(animators, unit, isOut) {
    var prefix = isOut ? "Out " : "";
    var animator = animators.addProperty("ADBE Text Animator");
    animator.name = "MO Type " + prefix + "Scale";
    var scale = animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Scale 3D");
    scale.expression = 'var c=effect("MO Type Controls");var s=c("' + (isOut ? "Out Scale To" : "Scale From") + '");[s,s,100];';
    var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    selector.property("ADBE Text Range Type2").setValue(MOTypeBasedOn(unit));
    var amount = selector.property("ADBE Text Expressible Amount"), e = "";
    e += 'var c=effect("MO Type Controls");\n';
    e += 'var enabled=c("' + (isOut ? "Out Enabled" : "In Enabled") + '")>0&&c("' + prefix + 'Scale Enabled")>0?1:0;\n';
    e += 'var d=Math.max(1,c("' + prefix + 'Scale Duration Frames"))*thisComp.frameDuration;\n';
    e += 'var overlap=Math.max(0,Math.min(.99,c("' + prefix + 'Overlap")/100));var step=d*(1-overlap);\n';
    e += 'var start=c("' + prefix + 'Start Time");try{start+=marker.key("' + (isOut ? "MO Type Out" : "MO Type In") + '").time;}catch(err){}\n';
    e += 'var local=time-start-(textIndex-1)*step;var p=Math.max(0,Math.min(1,local/d));\n';
    e += 'var curve=Math.max(-1,Math.min(1,c("' + prefix + 'Scale Ease")/100));var easeOut=1-Math.pow(1-p,3);var easeIn=Math.pow(p,3);var eased=curve<0?p*(1+curve)+easeIn*(-curve):p*(1-curve)+easeOut*curve;\n';
    e += isOut ? 'enabled*100*eased;' : 'enabled*100*(1-eased);';
    amount.expression = e;
}
function MOTypeAddTracking(animators, unit, isOut) {
    var prefix = isOut ? "Out " : "";
    var animator = animators.addProperty("ADBE Text Animator");
    animator.name = "MO Type " + prefix + "Tracking";
    var tracking = animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount");
    tracking.expression = 'effect("MO Type Controls")("' + (isOut ? "Out Tracking To" : "Tracking From") + '")';
    var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    selector.property("ADBE Text Range Type2").setValue(MOTypeBasedOn(unit));
    var amount = selector.property("ADBE Text Expressible Amount"), e = "";
    e += 'var c=effect("MO Type Controls");\n';
    e += 'var enabled=c("' + (isOut ? "Out Enabled" : "In Enabled") + '")>0&&c("' + prefix + 'Tracking Enabled")>0?1:0;\n';
    e += 'var d=Math.max(1,c("' + prefix + 'Tracking Duration Frames"))*thisComp.frameDuration;\n';
    e += 'var overlap=Math.max(0,Math.min(.99,c("' + prefix + 'Overlap")/100));var step=d*(1-overlap);\n';
    e += 'var start=c("' + prefix + 'Start Time");try{start+=marker.key("' + (isOut ? "MO Type Out" : "MO Type In") + '").time;}catch(err){}\n';
    e += 'var local=time-start-(textIndex-1)*step;var p=Math.max(0,Math.min(1,local/d));\n';
    e += 'var curve=Math.max(-1,Math.min(1,c("' + prefix + 'Tracking Ease")/100));var easeOut=1-Math.pow(1-p,3);var easeIn=Math.pow(p,3);var eased=curve<0?p*(1+curve)+easeIn*(-curve):p*(1-curve)+easeOut*curve;\n';
    e += isOut ? 'enabled*100*eased;' : 'enabled*100*(1-eased);';
    amount.expression = e;
}
function MOTypeAddPhase(animators, unit, preset, distance, isOut) {
    var prefix = isOut ? "Out " : "";
    var positionAnimator = animators.addProperty("ADBE Text Animator");
    positionAnimator.name = "MO Type " + prefix + "Position";
    var position = positionAnimator.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D");
    position.expression = MOTypeVectorExpression(prefix);
    MOTypeSelector(positionAnimator, unit, isOut, false);
    var opacityAnimator = animators.addProperty("ADBE Text Animator");
    opacityAnimator.name = "MO Type " + prefix + "Opacity";
    opacityAnimator.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
    MOTypeSelector(opacityAnimator, unit, isOut, true);
    MOTypeAddScale(animators, unit, isOut);
    MOTypeAddTracking(animators, unit, isOut);
}
function MOTypeApplyPhase(phase, unit, preset, distance, duration, overlap, ease) {
    var result = "", isOut = phase == "out";
    app.beginUndoGroup(isOut ? "MO Type Apply OUT" : "MO Type Apply IN");
    try {
        var comp = app.project.activeItem;
        if (comp == null || !(comp instanceof CompItem)) { throw new Error("Open a composition and select one text layer."); }
        if (comp.selectedLayers.length != 1) { throw new Error("Select exactly one text layer."); }
        var layer = comp.selectedLayers[0], text = layer.property("ADBE Text Properties");
        if (text == null) { throw new Error("The selected layer is not a text layer."); }
        var effects = layer.property("ADBE Effect Parade"), control = effects.property("MO Type Controls"), controlWasCreated = false;
        if (control == null) {
            control = effects.addProperty("Pseudo/MO Type Controls");
            if (control == null) { throw new Error("MO Type Controls is not registered. Restart After Effects."); }
            control.name = "MO Type Controls";
            controlWasCreated = true;
        }
        MOTypeRemovePhaseAnimators(layer, isOut);
        if (isOut) {
            if (controlWasCreated) { MOTypeSetControl(control, "In Enabled", 0); }
            MOTypeSetMarker(layer, "MO Type Out", comp.time);
            MOTypeSetControl(control, "Out Enabled", 1);
            MOTypeSetControl(control, "Out Start Time", 0);
            MOTypeSetControl(control, "Out Duration Frames", Number(duration));
            MOTypeSetControl(control, "Out Overlap", Number(overlap));
            MOTypeSetControl(control, "Out Direction", MOTypeDirection(preset));
            MOTypeSetControl(control, "Out Distance", Number(distance));
            MOTypeSetControl(control, "Out Ease", Number(ease));
            MOTypeSetControl(control, "Out Position Enabled", preset != "none" && preset != "fade" ? 1 : 0);
        } else {
            MOTypeRemoveMarker(layer, "MO Type Start");
            MOTypeSetMarker(layer, "MO Type In", comp.time);
            MOTypeSetControl(control, "In Enabled", 1);
            MOTypeSetControl(control, "Start Time", 0);
            MOTypeSetControl(control, "Duration Frames", Number(duration));
            MOTypeSetControl(control, "Overlap", Number(overlap));
            MOTypeSetControl(control, "Direction", MOTypeDirection(preset));
            MOTypeSetControl(control, "Distance", Number(distance));
            MOTypeSetControl(control, "Ease", Number(ease));
            MOTypeSetControl(control, "Position Enabled", preset != "none" && preset != "fade" ? 1 : 0);
        }
        MOTypeAddPhase(text.property("ADBE Text Animators"), unit, preset, distance, isOut);
        result = (isOut ? "OUT" : "IN") + " applied. Drag the MO Type " + (isOut ? "Out" : "In") + " marker to retime.";
    } catch (error) { result = "Could not apply: " + error.toString(); }
    app.endUndoGroup();
    return result;
}
function MOTypeControlValue(control, name, fallback) {
    var property = MOTypeFindControl(control, name);
    return property == null ? fallback : property.value;
}
function MOTypeDirectionName(value) {
    value = Math.round(value);
    if (value == 1) { return "up"; }
    if (value == 2) { return "down"; }
    if (value == 3) { return "left"; }
    if (value == 4) { return "right"; }
    return "none";
}
function MOTypeReadUnit(layer) {
    var text = layer.property("ADBE Text Properties"), animators = text.property("ADBE Text Animators");
    for (var i = 1; i <= animators.numProperties; i++) {
        if (animators.property(i).name.indexOf("MO Type") == 0) {
            var selectors = animators.property(i).property("ADBE Text Selectors");
            for (var j = 1; j <= selectors.numProperties; j++) {
                var based = selectors.property(j).property("ADBE Text Range Type2");
                if (based != null) {
                    var value = Math.round(based.value);
                    if (value == 3) { return "words"; }
                    if (value == 4) { return "lines"; }
                    return "characters";
                }
            }
        }
    }
    return "words";
}
function MOTypeReadPhase(control, isOut) {
    var p = isOut ? "Out " : "";
    return {
        enabled: MOTypeControlValue(control, isOut ? "Out Enabled" : "In Enabled", isOut ? 0 : 1) > 0,
        duration: Math.round(MOTypeControlValue(control, p + "Duration Frames", 30)),
        overlap: Math.round(MOTypeControlValue(control, p + "Overlap", 90)),
        ease: Math.round(MOTypeControlValue(control, p + "Ease", 100)),
        positionEnabled: MOTypeControlValue(control, p + "Position Enabled", 1) > 0,
        direction: MOTypeDirectionName(MOTypeControlValue(control, p + "Direction", 1)),
        distance: MOTypeControlValue(control, p + "Distance", 40),
        opacityEnabled: MOTypeControlValue(control, p + "Opacity Enabled", 0) > 0,
        visibilityCut: Math.round(MOTypeControlValue(control, p + "Visibility Cut", isOut ? 85 : 0)),
        scaleEnabled: MOTypeControlValue(control, p + "Scale Enabled", 0) > 0,
        scaleAmount: MOTypeControlValue(control, isOut ? "Out Scale To" : "Scale From", 80),
        scaleDuration: Math.round(MOTypeControlValue(control, p + "Scale Duration Frames", 30)),
        scaleEase: Math.round(MOTypeControlValue(control, p + "Scale Ease", 100)),
        trackingEnabled: MOTypeControlValue(control, p + "Tracking Enabled", 0) > 0,
        trackingAmount: MOTypeControlValue(control, isOut ? "Out Tracking To" : "Tracking From", 50),
        trackingDuration: Math.round(MOTypeControlValue(control, p + "Tracking Duration Frames", 30)),
        trackingEase: Math.round(MOTypeControlValue(control, p + "Tracking Ease", 100))
    };
}
function MOTypeMarkerTime(layer, name, fallback) {
    var markers = layer.property("ADBE Marker");
    for (var i = 1; i <= markers.numKeys; i++) { if (markers.keyValue(i).comment == name) { return markers.keyTime(i); } }
    return fallback;
}
function MOTypeReadSelectedLayer() {
    try {
        var comp = app.project.activeItem;
        if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length != 1) { throw new Error("Select exactly one MO Type text layer."); }
        var layer = comp.selectedLayers[0];
        if (layer.property("ADBE Text Properties") == null) { throw new Error("The selected layer is not a text layer."); }
        var control = layer.property("ADBE Effect Parade").property("MO Type Controls");
        if (control == null) { throw new Error("The selected layer has no MO Type Controls."); }
        var inTime = MOTypeMarkerTime(layer, "MO Type In", comp.time);
        var outTime = MOTypeMarkerTime(layer, "MO Type Out", inTime + 2);
        var data = { version: 2, unit: MOTypeReadUnit(layer), outOffsetFrames: Math.round((outTime - inTime) / comp.frameDuration), "in": MOTypeReadPhase(control, false), "out": MOTypeReadPhase(control, true) };
        return JSON.stringify(data);
    } catch (error) { return JSON.stringify({ error: error.toString() }); }
}
function MOTypeWritePhase(control, config, isOut) {
    var p = isOut ? "Out " : "";
    MOTypeSetControl(control, isOut ? "Out Enabled" : "In Enabled", config.enabled ? 1 : 0);
    MOTypeSetControl(control, p + "Start Time", 0);
    MOTypeSetControl(control, p + "Duration Frames", Number(config.duration));
    MOTypeSetControl(control, p + "Overlap", Number(config.overlap));
    MOTypeSetControl(control, p + "Ease", Number(config.ease));
    MOTypeSetControl(control, p + "Position Enabled", config.positionEnabled ? 1 : 0);
    MOTypeSetControl(control, p + "Direction", MOTypeDirection(config.direction));
    MOTypeSetControl(control, p + "Distance", Number(config.distance));
    MOTypeSetControl(control, p + "Opacity Enabled", config.opacityEnabled ? 1 : 0);
    MOTypeSetControl(control, p + "Visibility Cut", Number(config.visibilityCut));
    MOTypeSetControl(control, p + "Scale Enabled", config.scaleEnabled ? 1 : 0);
    MOTypeSetControl(control, isOut ? "Out Scale To" : "Scale From", Number(config.scaleAmount));
    MOTypeSetControl(control, p + "Scale Duration Frames", Number(config.scaleDuration));
    MOTypeSetControl(control, p + "Scale Ease", Number(config.scaleEase));
    MOTypeSetControl(control, p + "Tracking Enabled", config.trackingEnabled ? 1 : 0);
    MOTypeSetControl(control, isOut ? "Out Tracking To" : "Tracking From", Number(config.trackingAmount));
    MOTypeSetControl(control, p + "Tracking Duration Frames", Number(config.trackingDuration));
    MOTypeSetControl(control, p + "Tracking Ease", Number(config.trackingEase));
}
function MOTypeApplySavedPreset(encoded, mode) {
    var result = "";
    app.beginUndoGroup("MO Type Apply Saved Preset");
    try {
        var data = JSON.parse(decodeURIComponent(encoded));
        var comp = app.project.activeItem;
        if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length != 1) { throw new Error("Select exactly one text layer."); }
        var layer = comp.selectedLayers[0], text = layer.property("ADBE Text Properties");
        if (text == null) { throw new Error("The selected layer is not a text layer."); }
        var effects = layer.property("ADBE Effect Parade"), control = effects.property("MO Type Controls"), controlWasCreated = false;
        if (control == null) { control = effects.addProperty("Pseudo/MO Type Controls"); control.name = "MO Type Controls"; controlWasCreated = true; }
        var animators = text.property("ADBE Text Animators"), applyIn = mode == "in" || mode == "both", applyOut = mode == "out" || mode == "both";
        if (applyIn) {
            MOTypeRemovePhaseAnimators(layer, false); MOTypeSetMarker(layer, "MO Type In", comp.time); MOTypeWritePhase(control, data["in"], false); MOTypeAddPhase(animators, data.unit, data["in"].direction, data["in"].distance, false);
        }
        if (applyOut) {
            if (!applyIn && controlWasCreated) { MOTypeSetControl(control, "In Enabled", 0); }
            MOTypeRemovePhaseAnimators(layer, true); var outTime = mode == "both" ? comp.time + Math.max(1, Number(data.outOffsetFrames)) * comp.frameDuration : comp.time; MOTypeSetMarker(layer, "MO Type Out", outTime); MOTypeWritePhase(control, data["out"], true); MOTypeAddPhase(animators, data.unit, data["out"].direction, data["out"].distance, true);
        }
        result = "Saved preset applied: " + mode.toUpperCase() + ".";
    } catch (error) { result = "Could not apply saved preset: " + error.toString(); }
    app.endUndoGroup();
    return result;
}
function MOTypeClear() {
    var result = "";
    app.beginUndoGroup("MO Type Clean");
    try {
        var comp = app.project.activeItem;
        if (comp == null || !(comp instanceof CompItem)) { throw new Error("Open a composition and select one text layer."); }
        if (comp.selectedLayers.length != 1) { throw new Error("Select exactly one text layer."); }
        var layer = comp.selectedLayers[0], removed = MOTypeRemoveAnimators(layer);
        removed += MOTypeRemoveMarker(layer, "MO Type Start");
        removed += MOTypeRemoveMarker(layer, "MO Type In");
        removed += MOTypeRemoveMarker(layer, "MO Type Out");
        var effects = layer.property("ADBE Effect Parade");
        for (var i = effects.numProperties; i >= 1; i--) {
            if (effects.property(i).name == "MO Type Controls" || effects.property(i).matchName == "Pseudo/MO Type Controls") { effects.property(i).remove(); removed++; }
        }
        result = removed > 0 ? "MO Type removed from selected layer." : "No MO Type setup found.";
    } catch (error) { result = "Could not clean: " + error.toString(); }
    app.endUndoGroup();
    return result;
}
