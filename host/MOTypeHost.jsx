#target aftereffects

function MOTypeApply(unit, preset, distance, duration, overlap) {
    var result = "";
    app.beginUndoGroup("MO Type Apply");
    try {
        var comp = app.project.activeItem;
        if (comp == null || !(comp instanceof CompItem)) {
            throw new Error("Open a composition and select one text layer.");
        }
        if (comp.selectedLayers.length != 1) {
            throw new Error("Select exactly one text layer.");
        }
        var layer = comp.selectedLayers[0];
        var textProperties = layer.property("ADBE Text Properties");
        if (textProperties == null) {
            throw new Error("The selected layer is not a text layer.");
        }
        var animator = textProperties.property("ADBE Text Animators").addProperty("ADBE Text Animator");
        animator.name = "MO Type - " + preset;
        var x = 0;
        var y = 0;
        if (preset == "up") { y = distance; }
        if (preset == "down") { y = -distance; }
        if (preset == "left") { x = distance; }
        if (preset == "right") { x = -distance; }
        var properties = animator.property("ADBE Text Animator Properties");
        if (preset != "fade") {
            properties.addProperty("ADBE Text Position").setValue([x, y, 0]);
        }
        properties.addProperty("ADBE Text Opacity").setValue(0);
        var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var advanced = selector.property("ADBE Text Range Advanced");
        advanced.property("ADBE Text Selector Units").setValue(1);
        var basedOn = 1;
        if (unit == "words") { basedOn = 2; }
        if (unit == "lines") { basedOn = 3; }
        advanced.property("ADBE Text Range Type2").setValue(basedOn);
        advanced.property("ADBE Text Selector Smoothness").setValue(0);
        var offset = selector.property("ADBE Text Selector Offset");
        offset.setValueAtTime(comp.time, -100);
        offset.setValueAtTime(comp.time + Number(duration), 100);
        result = "Applied successfully.";
    } catch (error) {
        result = "Could not apply: " + error.toString();
    }
    app.endUndoGroup();
    return result;
}
