#target aftereffects

var MOType = MOType || {};

MOType.getProperty = function (group, matchName) {
    if (group === null || group === undefined) {
        return null;
    }
    return group.property(matchName);
};

MOType.apply = function (unit, preset, distance, duration, overlap) {
    var result = "";
    app.beginUndoGroup("MO Type - Apply text animation");

    try {
        var comp = app.project.activeItem;
        if (comp === null || !(comp instanceof CompItem)) {
            throw new Error("Open a composition and select one text layer.");
        }
        if (comp.selectedLayers.length !== 1) {
            throw new Error("Select exactly one text layer.");
        }

        var layer = comp.selectedLayers[0];
        var textProperties = MOType.getProperty(layer, "ADBE Text Properties");
        if (textProperties === null) {
            throw new Error("The selected layer is not a text layer.");
        }

        var animators = MOType.getProperty(textProperties, "ADBE Text Animators");
        var animator = animators.addProperty("ADBE Text Animator");
        animator.name = "MO Type - " + preset;

        var x = 0;
        var y = 0;
        if (preset === "up") { y = distance; }
        if (preset === "down") { y = -distance; }
        if (preset === "left") { x = distance; }
        if (preset === "right") { x = -distance; }

        var animatorProperties = MOType.getProperty(animator, "ADBE Text Animator Properties");
        if (preset !== "fade") {
            var position = animatorProperties.addProperty("ADBE Text Position");
            position.setValue([x, y, 0]);
        }
        var opacity = animatorProperties.addProperty("ADBE Text Opacity");
        opacity.setValue(0);

        var selectors = MOType.getProperty(animator, "ADBE Text Selectors");
        var selector = selectors.addProperty("ADBE Text Selector");
        var advanced = MOType.getProperty(selector, "ADBE Text Range Advanced");
        MOType.getProperty(advanced, "ADBE Text Selector Units").setValue(1);

        var basedOn = 1;
        if (unit === "words") { basedOn = 2; }
        if (unit === "lines") { basedOn = 3; }
        MOType.getProperty(advanced, "ADBE Text Range Type2").setValue(basedOn);
        MOType.getProperty(advanced, "ADBE Text Selector Smoothness").setValue(0);

        var offset = MOType.getProperty(selector, "ADBE Text Selector Offset");
        var currentTime = comp.time;
        offset.setValueAtTime(currentTime, -100);
        offset.setValueAtTime(currentTime + Number(duration), 100);

        result = "Applied. Refine the '" + animator.name + "' Animator in the timeline anytime.";
    } catch (error) {
        result = "Could not apply: " + error.toString();
    }

    app.endUndoGroup();
    return result;
};
