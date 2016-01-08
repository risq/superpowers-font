(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var TextRenderer_1 = require("../../components/TextRenderer");
var TextRendererUpdater_1 = require("../../components/TextRendererUpdater");
var data;
var ui = {};
var noCharsetText = "The quick brown fox\njumps over the lazy dog\n\n0123456789 +-*/=";
var socket;
function start() {
    socket = SupClient.connect(SupClient.query.project);
    socket.on("connect", onConnected);
    socket.on("disconnect", SupClient.onDisconnected);
    SupClient.setupHotkeys();
    ui.gameInstance = new SupEngine.GameInstance(document.querySelector("canvas"));
    ui.gameInstance.threeRenderer.setClearColor(0xbbbbbb);
    ui.gameInstance.update();
    ui.gameInstance.draw();
    var cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
    cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
    var cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
    cameraComponent.setOrthographicMode(true);
    cameraComponent.setOrthographicScale(5);
    /* tslint:disable:no-unused-expression */
    new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
        zoomSpeed: 1.5,
        zoomMin: 1,
        zoomMax: 200
    });
    /* tslint:enable:no-unused-expression */
    // Sidebar
    var fileSelect = document.querySelector("input.file-select");
    fileSelect.addEventListener("change", onFileSelectChange);
    document.querySelector("button.upload").addEventListener("click", function () { fileSelect.click(); });
    ui.allSettings = ["isBitmap", "filtering", "pixelsPerUnit", "size", "color", "gridWidth", "gridHeight", "charset", "charsetOffset"];
    ui.settings = {};
    ui.allSettings.forEach(function (setting) {
        var settingObj = ui.settings[setting] = document.querySelector(".property-" + setting);
        settingObj.dataset.name = setting;
        if (setting === "filtering" || setting === "color") {
            settingObj.addEventListener("change", function (event) {
                socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, event.target.value, function (err) { if (err != null)
                    new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
            });
        }
        else if (setting === "charset") {
            settingObj.addEventListener("input", function (event) {
                var charset = (event.target.value !== "") ? event.target.value : null;
                socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, charset, function (err) { if (err != null)
                    new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
            });
        }
        else if (setting === "isBitmap") {
            settingObj.addEventListener("change", function (event) {
                var isBitmap = event.target.value === "bitmap";
                socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, isBitmap, function (err) { if (err != null)
                    new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
            });
        }
        else {
            settingObj.addEventListener("change", function (event) {
                socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, parseInt(event.target.value, 10), function (err) { if (err != null)
                    new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
            });
        }
    });
    ui.colorPicker = document.querySelector("input.color-picker");
    ui.colorPicker.addEventListener("change", function (event) {
        socket.emit("edit:assets", SupClient.query.asset, "setProperty", "color", event.target.value.slice(1), function (err) { if (err != null)
            new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
    });
    ui.vectorFontTBody = document.querySelector("tbody.vector-font");
    ui.bitmapFontTBody = document.querySelector("tbody.bitmap-font");
    requestAnimationFrame(draw);
}
// Network callbacks
var onEditCommands = {};
function onConnected() {
    data = {};
    data.projectClient = new SupClient.ProjectClient(socket);
    var textActor = new SupEngine.Actor(ui.gameInstance, "Text");
    var textRenderer = new TextRenderer_1.default(textActor);
    var config = { fontAssetId: SupClient.query.asset, text: noCharsetText, alignment: "center" };
    var receiveCallbacks = { font: onAssetReceived };
    var editCallbacks = { font: onEditCommands };
    data.textUpdater = new TextRendererUpdater_1.default(data.projectClient, textRenderer, config, receiveCallbacks, editCallbacks);
}
function onAssetReceived() {
    ui.allSettings.forEach(function (setting) {
        if (setting === "isBitmap") {
            ui.settings[setting].value = data.textUpdater.fontAsset.pub.isBitmap ? "bitmap" : "vector";
            refreshFontMode();
        }
        else {
            ui.settings[setting].value = data.textUpdater.fontAsset.pub[setting];
        }
    });
    if (data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null)
        data.textUpdater.config_setProperty("text", data.textUpdater.fontAsset.pub.charset);
    ui.colorPicker.value = "#" + data.textUpdater.fontAsset.pub.color;
    ui.settings["charsetOffset"].disabled = data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null;
}
onEditCommands.setProperty = function (path, value) {
    if (path === "isBitmap") {
        ui.settings[path].value = value ? "bitmap" : "vector";
        if (!value)
            data.textUpdater.config_setProperty("text", noCharsetText);
        else {
            var charset = data.textUpdater.fontAsset.pub.charset;
            data.textUpdater.config_setProperty("text", charset != null ? charset : noCharsetText);
        }
        refreshFontMode();
    }
    else
        ui.settings[path].value = value;
    if (path === "color")
        ui.colorPicker.value = "#" + value;
    else if (path === "charset") {
        data.textUpdater.config_setProperty("text", value != null ? value : noCharsetText);
        ui.settings["charsetOffset"].disabled = value != null;
    }
};
function refreshFontMode() {
    var fontOrImageString = SupClient.i18n.t("fontEditor:" + (data.textUpdater.fontAsset.pub.isBitmap ? "texture" : "font.title"));
    document.querySelector(".sidebar .font-or-image th").textContent = fontOrImageString;
    if (data.textUpdater.fontAsset.pub.isBitmap) {
        ui.vectorFontTBody.hidden = true;
        ui.bitmapFontTBody.hidden = false;
    }
    else {
        ui.vectorFontTBody.hidden = false;
        ui.bitmapFontTBody.hidden = true;
    }
}
// User interface
function onFileSelectChange(event) {
    if (event.target.files.length === 0)
        return;
    var reader = new FileReader();
    reader.onload = function (event) {
        socket.emit("edit:assets", SupClient.query.asset, "upload", event.target.result, function (err) {
            if (err != null) {
                new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close"));
                return;
            }
        });
    };
    reader.readAsArrayBuffer(event.target.files[0]);
    event.target.parentElement.reset();
}
// Font download
document.querySelector("button.download").addEventListener("click", function (event) {
    function triggerDownload(name) {
        var anchor = document.createElement("a");
        document.body.appendChild(anchor);
        anchor.style.display = "none";
        anchor.href = data.textUpdater.fontAsset.url;
        // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
        anchor.download = name + (data.textUpdater.fontAsset.pub.isBitmap ? ".png" : ".woff");
        anchor.click();
        document.body.removeChild(anchor);
    }
    var options = {
        initialValue: SupClient.i18n.t("fontEditor:font.download.defaultName"),
        validationLabel: SupClient.i18n.t("common:actions.download")
    };
    if (SupClient.isApp) {
        triggerDownload(options.initialValue);
    }
    else {
        /* tslint:disable:no-unused-expression */
        new SupClient.dialogs.PromptDialog(SupClient.i18n.t("fontEditor:font.download.prompt"), options, function (name) {
            /* tslint:enable:no-unused-expression */
            if (name == null)
                return;
        });
    }
});
function draw() {
    requestAnimationFrame(draw);
    ui.gameInstance.update();
    ui.gameInstance.draw();
}
SupClient.i18n.load([{ root: window.location.pathname + "/../..", name: "fontEditor" }], start);

},{"../../components/TextRenderer":2,"../../components/TextRendererUpdater":4}],2:[function(require,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var THREE = SupEngine.THREE;
var TextRendererUpdater_1 = require("./TextRendererUpdater");
var TextRendererGeometry_1 = require("./TextRendererGeometry");
var TextRenderer = (function (_super) {
    __extends(TextRenderer, _super);
    function TextRenderer(actor) {
        _super.call(this, actor, "TextRenderer");
        this.threeMeshes = [];
    }
    TextRenderer.prototype.setText = function (text) {
        this.text = text;
        this._createMesh();
    };
    TextRenderer.prototype.setFont = function (font) {
        this.font = font;
        this._createMesh();
    };
    TextRenderer.prototype.setOptions = function (options) {
        if (options.alignment == null)
            options.alignment = "center";
        if (options.verticalAlignment == null)
            options.verticalAlignment = "center";
        this.options = options;
        this._createMesh();
    };
    TextRenderer.prototype.setOpacity = function (opacity) {
        this.opacity = opacity;
        for (var _i = 0, _a = this.threeMeshes; _i < _a.length; _i++) {
            var mesh = _a[_i];
            if (this.opacity != null) {
                mesh.material.transparent = true;
                mesh.material.opacity = this.opacity;
            }
            else {
                mesh.material.transparent = false;
                mesh.material.opacity = 1;
            }
        }
    };
    TextRenderer.prototype._createMesh = function () {
        this.clearMesh();
        if (this.text == null || this.font == null)
            return;
        if (!this.font.isBitmap)
            this._createFontMesh();
        else if (this.font.texture != null)
            this._createBitmapMesh();
        for (var _i = 0, _a = this.threeMeshes; _i < _a.length; _i++) {
            var threeMesh = _a[_i];
            this.actor.threeObject.add(threeMesh);
            var scale = 1 / this.font.pixelsPerUnit;
            threeMesh.scale.set(scale, scale, scale);
            threeMesh.updateMatrixWorld(false);
        }
    };
    TextRenderer.prototype._createFontMesh = function () {
        var fontSize = (this.options.size != null) ? this.options.size : this.font.size;
        var texts = this.text.split("\n");
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        ctx.font = fontSize + "px " + this.font.name;
        var width = 1;
        for (var _i = 0; _i < texts.length; _i++) {
            var text = texts[_i];
            width = Math.max(width, ctx.measureText(text).width);
        }
        // Arbitrary value that should be enough for most fonts
        // We might want to make it configurable in the future
        var heightBorder = fontSize * 0.3;
        var heightWithoutBorder = fontSize * texts.length;
        var height = heightWithoutBorder + heightBorder * 2;
        canvas.width = width;
        canvas.height = height;
        var color = (this.options.color != null) ? this.options.color : this.font.color;
        ctx.fillStyle = "#" + color;
        ctx.font = fontSize + "px " + this.font.name;
        ctx.textBaseline = "middle";
        ctx.textAlign = this.options.alignment;
        var x = width / 2;
        switch (this.options.alignment) {
            case "left":
                x = 0;
                break;
            case "right":
                x = width;
                break;
        }
        for (var index = 0; index < texts.length; index++) {
            ctx.fillText(texts[index], x, heightBorder + (0.5 + (index - (texts.length - 1) / 2) / texts.length) * heightWithoutBorder);
        }
        this.texture = new THREE.Texture(canvas);
        if (this.font.filtering === "pixelated") {
            this.texture.magFilter = SupEngine.THREE.NearestFilter;
            this.texture.minFilter = SupEngine.THREE.NearestFilter;
        }
        else {
            // See https://github.com/mrdoob/three.js/blob/4582bf1276c30c238e415cb79f4871e8560d102d/src/renderers/WebGLRenderer.js#L5664
            this.texture.minFilter = SupEngine.THREE.LinearFilter;
        }
        this.texture.needsUpdate = true;
        var geometry = new THREE.PlaneBufferGeometry(width, height);
        var material = new THREE.MeshBasicMaterial({
            map: this.texture,
            alphaTest: 0.01,
            side: THREE.DoubleSide
        });
        this.threeMeshes[0] = new THREE.Mesh(geometry, material);
        this.setOpacity(this.opacity);
        switch (this.options.alignment) {
            case "left":
                this.threeMeshes[0].position.setX(width / 2 / this.font.pixelsPerUnit);
                break;
            case "right":
                this.threeMeshes[0].position.setX(-width / 2 / this.font.pixelsPerUnit);
                break;
        }
        switch (this.options.verticalAlignment) {
            case "top":
                this.threeMeshes[0].position.setY(-height / 2 / this.font.pixelsPerUnit);
                break;
            case "bottom":
                this.threeMeshes[0].position.setY(height / 2 / this.font.pixelsPerUnit);
                break;
        }
    };
    TextRenderer.prototype._createBitmapMesh = function () {
        var texts = this.text.split("\n");
        for (var index = 0; index < texts.length; index++) {
            var text = texts[index];
            var geometry = new TextRendererGeometry_1.default(this.font.gridWidth * text.length, this.font.gridHeight, text.length, 1);
            var material = new THREE.MeshBasicMaterial({
                map: this.font.texture,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            var color = (this.options.color != null) ? this.options.color : this.font.color;
            material.color.setHex(parseInt(color, 16));
            this.threeMeshes[index] = new THREE.Mesh(geometry, material);
            switch (this.options.alignment) {
                case "center":
                    this.threeMeshes[index].position.setX(-geometry.width / 2 / this.font.pixelsPerUnit);
                    break;
                case "right":
                    this.threeMeshes[index].position.setX(-geometry.width / this.font.pixelsPerUnit);
                    break;
            }
            var y = void 0;
            switch (this.options.verticalAlignment) {
                case "center":
                    y = (0.5 + (index - (texts.length - 1) / 2)) * this.font.gridHeight / this.font.pixelsPerUnit;
                    break;
                case "top":
                    y = (1 + index) * this.font.gridHeight / this.font.pixelsPerUnit;
                    break;
                case "bottom":
                    y = (index - texts.length + 1) * this.font.gridHeight / this.font.pixelsPerUnit;
                    break;
            }
            this.threeMeshes[index].position.setY(-y);
            var uvs = geometry.getAttribute("uv");
            uvs.needsUpdate = true;
            var charsByRow = this.font.texture.image.width / this.font.gridWidth;
            for (var x = 0; x < text.length; x++) {
                var index_1 = void 0;
                if (this.font.charset == null)
                    index_1 = text.charCodeAt(x) - this.font.charsetOffset;
                else
                    index_1 = this.font.charset.indexOf(text[x]);
                var tileX = index_1 % charsByRow;
                var tileY = Math.floor(index_1 / charsByRow);
                var left = (tileX * this.font.gridWidth + 0.2) / this.font.texture.image.width;
                var right = ((tileX + 1) * this.font.gridWidth - 0.2) / this.font.texture.image.width;
                var bottom = 1 - ((tileY + 1) * this.font.gridHeight - 0.2) / this.font.texture.image.height;
                var top_1 = 1 - (tileY * this.font.gridHeight + 0.2) / this.font.texture.image.height;
                uvs.array[x * 8 + 0] = left;
                uvs.array[x * 8 + 1] = bottom;
                uvs.array[x * 8 + 2] = right;
                uvs.array[x * 8 + 3] = bottom;
                uvs.array[x * 8 + 4] = right;
                uvs.array[x * 8 + 5] = top_1;
                uvs.array[x * 8 + 6] = left;
                uvs.array[x * 8 + 7] = top_1;
            }
        }
        this.setOpacity(this.opacity);
    };
    TextRenderer.prototype.clearMesh = function () {
        for (var _i = 0, _a = this.threeMeshes; _i < _a.length; _i++) {
            var threeMesh = _a[_i];
            this.actor.threeObject.remove(threeMesh);
            threeMesh.geometry.dispose();
            threeMesh.material.dispose();
            threeMesh = null;
        }
        this.threeMeshes.length = 0;
        if (this.texture != null) {
            this.texture.dispose();
            this.texture = null;
        }
    };
    TextRenderer.prototype._destroy = function () {
        this.clearMesh();
        _super.prototype._destroy.call(this);
    };
    TextRenderer.prototype.setIsLayerActive = function (active) { for (var _i = 0, _a = this.threeMeshes; _i < _a.length; _i++) {
        var threeMesh = _a[_i];
        threeMesh.visible = active;
    } };
    TextRenderer.Updater = TextRendererUpdater_1.default;
    return TextRenderer;
})(SupEngine.ActorComponent);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TextRenderer;

},{"./TextRendererGeometry":3,"./TextRendererUpdater":4}],3:[function(require,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var THREE = SupEngine.THREE;
var TextRendererGeometry = (function (_super) {
    __extends(TextRendererGeometry, _super);
    function TextRendererGeometry(width, height, widthSegments, heightSegments) {
        _super.call(this);
        this.type = "TextRendererGeometry";
        this.width = width;
        this.height = height;
        var vertices = new Float32Array(widthSegments * heightSegments * 4 * 3);
        var normals = new Float32Array(widthSegments * heightSegments * 4 * 3);
        var uvs = new Float32Array(widthSegments * heightSegments * 4 * 2);
        var indices;
        if (vertices.length / 3 > 65535)
            indices = new Uint32Array(widthSegments * heightSegments * 6);
        else
            indices = new Uint16Array(widthSegments * heightSegments * 6);
        var offset = 0;
        var offset2 = 0;
        var offset3 = 0;
        for (var iy = 0; iy < heightSegments; iy++) {
            var y = iy * height / heightSegments;
            for (var ix = 0; ix < widthSegments; ix++) {
                var x = ix * width / widthSegments;
                // Left bottom
                vertices[offset + 0] = x;
                vertices[offset + 1] = y;
                normals[offset + 2] = 1;
                uvs[offset2 + 0] = ix / widthSegments;
                uvs[offset2 + 1] = iy / heightSegments;
                // Right bottom
                vertices[offset + 3] = x + width / widthSegments;
                vertices[offset + 4] = y;
                normals[offset + 5] = 1;
                uvs[offset2 + 2] = (ix + 1) / widthSegments;
                uvs[offset2 + 3] = iy / heightSegments;
                // Right top
                vertices[offset + 6] = x + width / widthSegments;
                vertices[offset + 7] = y + height / heightSegments;
                normals[offset + 8] = 1;
                uvs[offset2 + 4] = (ix + 1) / widthSegments;
                uvs[offset2 + 5] = (iy + 1) / heightSegments;
                // Left Top
                vertices[offset + 9] = x;
                vertices[offset + 10] = y + height / heightSegments;
                normals[offset + 11] = 1;
                uvs[offset2 + 6] = ix / widthSegments;
                uvs[offset2 + 7] = (iy + 1) / heightSegments;
                var ref = (ix + iy * widthSegments) * 4;
                // Bottom right corner
                indices[offset3 + 0] = ref + 0;
                indices[offset3 + 1] = ref + 1;
                indices[offset3 + 2] = ref + 2;
                // Top left corner
                indices[offset3 + 3] = ref + 0;
                indices[offset3 + 4] = ref + 3;
                indices[offset3 + 5] = ref + 2;
                offset += 4 * 3;
                offset2 += 4 * 2;
                offset3 += 6;
            }
        }
        this.setIndex(new THREE.BufferAttribute(indices, 1));
        this.addAttribute("position", new THREE.BufferAttribute(vertices, 3));
        this.addAttribute("normal", new THREE.BufferAttribute(normals, 3));
        this.addAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    }
    return TextRendererGeometry;
})(THREE.BufferGeometry);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TextRendererGeometry;

},{}],4:[function(require,module,exports){
var TextRendererUpdater = (function () {
    function TextRendererUpdater(client, textRenderer, config, receiveAssetCallbacks, editAssetCallbacks) {
        var _this = this;
        this.onFontAssetReceived = function (assetId, asset) {
            _this.fontAsset = asset;
            _this.textRenderer.setText(_this.text);
            _this.textRenderer.setOptions(_this.options);
            _this._setupFont();
            if (_this.receiveAssetCallbacks != null)
                _this.receiveAssetCallbacks.font(null);
        };
        this.onFontAssetEdited = function (id, command) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var commandFunction = _this[("onEditCommand_" + command)];
            if (commandFunction != null)
                commandFunction.apply(_this, args);
            if (_this.editAssetCallbacks != null) {
                var editCallback = _this.editAssetCallbacks.font[command];
                if (editCallback != null)
                    editCallback.apply(null, args);
            }
        };
        this.onFontAssetTrashed = function () {
            _this.textRenderer.clearMesh();
            if (_this.editAssetCallbacks != null)
                SupClient.onAssetTrashed();
        };
        this.client = client;
        this.textRenderer = textRenderer;
        this.receiveAssetCallbacks = receiveAssetCallbacks;
        this.editAssetCallbacks = editAssetCallbacks;
        this.fontAssetId = config.fontAssetId;
        this.text = config.text;
        this.options = { alignment: config.alignment, verticalAlignment: config.verticalAlignment, size: config.size, color: config.color };
        this.fontSubscriber = {
            onAssetReceived: this.onFontAssetReceived,
            onAssetEdited: this.onFontAssetEdited,
            onAssetTrashed: this.onFontAssetTrashed
        };
        if (this.fontAssetId != null)
            this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
    }
    TextRendererUpdater.prototype.destroy = function () {
        if (this.fontAssetId != null)
            this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
    };
    TextRendererUpdater.prototype.config_setProperty = function (path, value) {
        switch (path) {
            case "fontAssetId":
                {
                    if (this.fontAssetId != null)
                        this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
                    this.fontAssetId = value;
                    this.fontAsset = null;
                    this.textRenderer.setFont(null);
                    if (this.fontAssetId != null)
                        this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
                }
                break;
            case "text":
                {
                    this.text = value;
                    this.textRenderer.setText(this.text);
                }
                break;
            case "alignment":
            case "verticalAlignment":
            case "size":
            case "color":
                {
                    this.options[path] = (value !== "") ? value : null;
                    this.textRenderer.setOptions(this.options);
                }
                break;
        }
    };
    TextRendererUpdater.prototype._setupFont = function () {
        var _this = this;
        this.textRenderer.clearMesh();
        if (this.fontAsset.pub.isBitmap) {
            if (this.fontAsset.pub.texture != null) {
                var image = this.fontAsset.pub.texture.image;
                if (image.complete)
                    this.textRenderer.setFont(this.fontAsset.pub);
                else
                    image.addEventListener("load", function () { _this.textRenderer.setFont(_this.fontAsset.pub); });
            }
        }
        else {
            if (this.fontAsset.font == null)
                this.textRenderer.setFont(this.fontAsset.pub);
            else {
                this.fontAsset.font.load().then(function () { _this.textRenderer.setFont(_this.fontAsset.pub); }, function () { _this.textRenderer.setFont(_this.fontAsset.pub); });
            }
        }
    };
    TextRendererUpdater.prototype.onEditCommand_upload = function () { this._setupFont(); };
    TextRendererUpdater.prototype.onEditCommand_setProperty = function (path) {
        if (path === "isBitmap")
            this._setupFont();
        else
            this.textRenderer.setFont(this.fontAsset.pub);
    };
    return TextRendererUpdater;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TextRendererUpdater;

},{}]},{},[1]);
