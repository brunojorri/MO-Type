(function () {
    var cs = new CSInterface(), $ = function (id) { return document.getElementById(id); };
    var unit = "words", phase = "in", restartTimer = null, frameRate = 30;
    var panelPath = decodeURI(window.location.pathname).replace(/\\/g, "/");
    if (/^\/[A-Za-z]:\//.test(panelPath)) { panelPath = panelPath.substring(1); }
    var hostPath = panelPath.replace(/\/client\/index\.html(?:[?#].*)?$/i, "") + "/host/MOTypeRuntime.jsx";
    var settings = {
        "in": { preset: "up", distance: 40, duration: 30, overlap: 90, ease: 100 },
        "out": { preset: "down", distance: 40, duration: 30, overlap: 90, ease: 100 }
    };
    var customPresets = [];
    try { customPresets = JSON.parse(localStorage.getItem("moTypePresets") || "[]"); } catch (ignore) { customPresets = []; }
    function esc(v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function copyPreset(source) { return { name: source.name, unit: source.unit, preset: source.preset, distance: source.distance, duration: source.duration, overlap: source.overlap, ease: source.ease == null ? 100 : source.ease }; }
    function persistPresets() { try { localStorage.setItem("moTypePresets", JSON.stringify(customPresets)); } catch (ignore) {} }
    function setUnitButtons() {
        var buttons = $("unit").getElementsByTagName("button");
        for (var i = 0; i < buttons.length; i++) { buttons[i].className = buttons[i].getAttribute("data-unit") == unit ? "active" : ""; }
    }
    function applyLibraryPreset(item) {
        unit = item.unit || "words";
        settings[phase] = copyPreset(item);
        setUnitButtons();
        loadControls();
        $("status").textContent = item.name + " loaded for " + phase.toUpperCase() + ".";
    }
    function directionName(value) { return { none: "None", up: "Up", down: "Down", left: "Left", right: "Right", fade: "None" }[value] || value; }
    function directionIcon(value, isOut) {
        var path = { up: "M12 20V4m-6 6 6-6 6 6", down: "M12 4v16m-6-6 6 6 6-6", left: "M20 12H4m6-6-6 6 6 6", right: "M4 12h16m-6-6 6 6-6 6" }[value];
        return path ? '<svg class="direction-icon" viewBox="0 0 24 24"><path d="' + path + '"/></svg>' : '<svg class="direction-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><path d="M7 17 17 7"/></svg>';
    }
    function frameBlocks(frames) {
        var count = Math.max(1, Math.min(10, Math.ceil(frames / 10))), html = '<span class="frame-blocks">';
        for (var i = 0; i < count; i++) { html += '<i></i>'; }
        return html + '</span><span class="frame-label">' + frames + ' fr</span>';
    }
    function moduleSummary(config, side) {
        var html = "";
        if (config.positionEnabled) { html += '<div class="module-line">' + directionIcon(config.direction, side == "out") + '<span>' + config.distance + ' px</span></div>'; }
        if (config.opacityEnabled) { html += '<div class="module-line"><span class="module-tag">OP</span><span>Fade · Cut ' + config.visibilityCut + '%</span></div>'; }
        if (config.scaleEnabled) { html += '<div class="module-line"><span class="module-tag">S</span><span>' + config.scaleAmount + '% · ' + config.scaleDuration + 'fr · Ease ' + config.scaleEase + '%</span></div>'; }
        if (config.trackingEnabled) { html += '<div class="module-line"><span class="module-tag">T</span><span>' + config.trackingAmount + ' · ' + config.trackingDuration + 'fr · Ease ' + config.trackingEase + '%</span></div>'; }
        return html;
    }
    function phaseSummary(label, config, side) {
        if (!config.enabled) { return ""; }
        var modules = moduleSummary(config, side);
        return '<div class="preset-phase phase-' + side + '"><div class="preset-phase-title">' + label.toUpperCase() + '</div><div class="preset-timing">' + frameBlocks(config.duration) + '</div><div class="timing-meta">Overlap ' + config.overlap + '% · Ease ' + config.ease + '%</div>' + (modules ? '<div class="preset-modules">' + modules + '</div>' : '') + '</div>';
    }
    function hostCall(call, callback) {
        $("status").textContent = "Working...";
        cs.evalScript('$.evalFile("' + hostPath + '");' + call, function (result) {
            if (callback) { callback(result); } else { $("status").textContent = result; }
        });
    }
    function presetMode(item) {
        if (item["in"].enabled && item["out"].enabled) { return "both"; }
        return item["out"].enabled ? "out" : "in";
    }
    function applySavedPreset(index) {
        var item = customPresets[index], encoded = encodeURIComponent(JSON.stringify(item));
        var mode = presetMode(item);
        hostCall('MOTypeApplySavedPreset("' + encoded + '","' + mode + '")');
    }
    function renderPresetLibrary() {
        var library = $("presetLibrary"), html = "", i, item;
        for (i = 0; i < customPresets.length; i++) {
            item = customPresets[i];
            if (item.version == 2 && item["in"] && item["out"]) {
                html += '<div class="preset-card"><div class="preset-title">' + esc(item.name) + '</div><button class="preset-delete" data-delete="' + i + '">×</button>';
                var mode = presetMode(item);
                html += '<div class="preset-summary summary-' + mode + '">' + phaseSummary("IN · " + item.unit, item["in"], "in") + phaseSummary("OUT · " + item.unit, item["out"], "out") + '</div>';
                html += '<div class="preset-actions"><button data-index="' + i + '">Apply</button></div></div>';
            } else {
                html += '<span class="preset-card legacy-preset"><button class="preset-load" data-index="' + i + '">' + esc(item.name) + '</button><button class="preset-delete" data-delete="' + i + '">×</button></span>';
            }
        }
        library.innerHTML = html;
        var loads = library.getElementsByClassName("preset-load");
        for (i = 0; i < loads.length; i++) { loads[i].onclick = function () { applyLibraryPreset(customPresets[Number(this.getAttribute("data-index"))]); }; }
        var deletes = library.getElementsByClassName("preset-delete");
        for (i = 0; i < deletes.length; i++) { deletes[i].onclick = function () { customPresets.splice(Number(this.getAttribute("data-delete")), 1); persistPresets(); renderPresetLibrary(); }; }
        var actions = library.getElementsByClassName("preset-actions"), j, buttons;
        for (i = 0; i < actions.length; i++) {
            buttons = actions[i].getElementsByTagName("button");
            for (j = 0; j < buttons.length; j++) { buttons[j].onclick = function () { applySavedPreset(Number(this.getAttribute("data-index"))); }; }
        }
    }
    function saveControls() {
        var s = settings[phase];
        s.distance = Number($("distance").value);
        s.duration = Number($("duration").value);
        s.overlap = Number($("overlap").value);
        s.ease = Number($("ease").value);
    }
    function loadControls() {
        var s = settings[phase], buttons = $("preset").getElementsByTagName("button"), i;
        $("distance").value = s.distance;
        $("duration").value = s.duration;
        $("overlap").value = s.overlap;
        $("ease").value = s.ease;
        for (i = 0; i < buttons.length; i++) { buttons[i].className = buttons[i].getAttribute("data-preset") == s.preset ? "active" : ""; }
        $("apply").textContent = phase == "out" ? "Apply OUT" : "Apply IN";
        $("outAdvanced").style.display = phase == "out" ? "block" : "none";
        refresh();
    }
    function token(t, i, c) { return '<span class="token ' + c + '" style="--i:' + i + '">' + esc(t).replace(/ /g, "&nbsp;") + "</span>"; }
    function draw() {
        var copy = $("previewText").value, parts, html = "", i, count = 0;
        if (unit == "words") {
            parts = copy.split(/(\s+)/);
            for (i = 0; i < parts.length; i++) {
                if (parts[i].replace(/\s/g, "")) { html += token(parts[i], count++, "word"); }
                else if (parts[i].indexOf("\n") !== -1) { html += "<br>"; }
            }
        } else if (unit == "characters") {
            parts = copy.split("");
            for (i = 0; i < parts.length; i++) { html += parts[i] == "\n" ? "<br>" : token(parts[i], count++, "character"); }
        } else {
            parts = copy.split("\n");
            for (i = 0; i < parts.length; i++) { html += '<span class="token line" style="--i:' + count++ + '">' + esc(parts[i]) + "</span>"; }
        }
        $("sample").innerHTML = html;
        return count;
    }
    function refresh() {
        saveControls();
        var s = settings[phase];
        var inTransforms = { none: "translateY(0)", up: "translateY(" + s.distance + "px)", down: "translateY(-" + s.distance + "px)", left: "translateX(" + s.distance + "px)", right: "translateX(-" + s.distance + "px)", fade: "translateY(0)" };
        var outTransforms = { none: "translateY(0)", up: "translateY(-" + s.distance + "px)", down: "translateY(" + s.distance + "px)", left: "translateX(-" + s.distance + "px)", right: "translateX(" + s.distance + "px)", fade: "translateY(0)" };
        var transform = (phase == "out" ? outTransforms : inTransforms)[s.preset];
        var durationSeconds = s.duration / frameRate, step = Math.max(1 / frameRate, durationSeconds * (1 - s.overlap / 100)), count;
        if (restartTimer) { clearTimeout(restartTimer); }
        $("distanceOut").textContent = s.distance + " px";
        $("durationOut").textContent = s.duration + " fr";
        $("overlapOut").textContent = s.overlap + "%";
        $("easeOut").textContent = s.ease + "%";
        document.documentElement.style.setProperty("--preview-transform", transform);
        document.documentElement.style.setProperty("--preview-duration", durationSeconds + "s");
        count = draw();
        var tokens = $("sample").getElementsByClassName("token"), i, weight = Math.abs(s.ease) / 100;
        var easeOutCurve = "cubic-bezier(" + (0.2 * weight) + "," + (0.8 * weight) + "," + (1 - 0.8 * weight) + ",1)";
        var easeInCurve = "cubic-bezier(" + (0.8 * weight) + ",0," + (1 - 0.2 * weight) + "," + (1 - 0.8 * weight) + ")";
        var timing = s.ease == 0 ? "linear" : (phase == "out" ? (s.ease > 0 ? easeInCurve : easeOutCurve) : (s.ease > 0 ? easeOutCurve : easeInCurve));
        for (i = 0; i < tokens.length; i++) {
            tokens[i].style.animationDelay = (i * step) + "s";
            tokens[i].style.animationDirection = phase == "out" ? "reverse" : "normal";
            tokens[i].style.animationFillMode = "both";
            tokens[i].style.animationTimingFunction = timing;
        }
        restartTimer = setTimeout(refresh, Math.max(1200, (durationSeconds + (count - 1) * step + 0.8) * 1000));
    }
    function select(group, attr, handler) {
        var buttons = $(group).getElementsByTagName("button");
        for (var i = 0; i < buttons.length; i++) { buttons[i].onclick = function () {
            handler(this.getAttribute(attr));
            for (var j = 0; j < buttons.length; j++) { buttons[j].className = ""; }
            this.className = "active";
            refresh();
        }; }
    }
    select("unit", "data-unit", function (value) { unit = value; });
    select("preset", "data-preset", function (value) { settings[phase].preset = value; });
    select("phase", "data-phase", function (value) { saveControls(); phase = value; loadControls(); });
    select("mainTabs", "data-view", function (value) {
        $("createView").style.display = value == "create" ? "block" : "none";
        $("libraryView").style.display = value == "library" ? "block" : "none";
        if (value == "library") { renderPresetLibrary(); }
    });
    ["previewText", "distance", "duration", "overlap", "ease"].forEach(function (id) { $(id).addEventListener("input", refresh); });
    $("apply").onclick = function () {
        saveControls();
        var s = settings[phase];
        hostCall('MOTypeApplyPhase("' + phase + '","' + unit + '","' + s.preset + '",' + s.distance + ',' + s.duration + ',' + s.overlap + ',' + s.ease + ')');
    };
    $("clean").onclick = function () { hostCall("MOTypeClear()"); };
    $("savePreset").onclick = function () {
        saveControls();
        var name = $("presetName").value.replace(/^\s+|\s+$/g, "");
        if (!name) { $("status").textContent = "Enter a preset name first."; return; }
        var item = copyPreset(settings[phase]); item.name = name; item.unit = unit;
        customPresets.push(item); persistPresets(); renderPresetLibrary(); $("presetName").value = "";
        $("status").textContent = name + " saved from panel.";
    };
    $("saveLayerPreset").onclick = function () {
        var name = $("presetName").value.replace(/^\s+|\s+$/g, "");
        if (!name) { $("status").textContent = "Enter a preset name first."; return; }
        hostCall("MOTypeReadSelectedLayer()", function (result) {
            try {
                var item = JSON.parse(result);
                if (item.error) { $("status").textContent = item.error; return; }
                item.name = name; customPresets.push(item); persistPresets(); renderPresetLibrary(); $("presetName").value = "";
                $("status").textContent = name + " saved from selected layer.";
            } catch (error) { $("status").textContent = "Could not read selected layer: " + result; }
        });
    };
    $("authorLink").onclick = function (event) {
        event.preventDefault();
        var url = "https://www.instagram.com/brunojorri_work/";
        if (window.cep && window.cep.util && window.cep.util.openURLInDefaultBrowser) { window.cep.util.openURLInDefaultBrowser(url); }
        else { window.open(url, "_blank"); }
    };
    renderPresetLibrary();
    loadControls();
    cs.evalScript('$.evalFile("' + hostPath + '");MOTypeGetFrameRate()', function (result) { var detected = Number(result); if (detected > 0) { frameRate = detected; refresh(); } });
}());
