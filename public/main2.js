
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import * as cannon from 'cannon';
import * as GUI from '@babylonjs/gui';
import * as DebugLayer from "@babylonjs/core/Debug/debugLayer";
import * as Inspector from "@babylonjs/inspector";
import {MathHelper} from '/util.js';
import {Printer} from '/printer.js';
import {CameraManager} from '/camera.js';
import {Raycast} from '/raycast.js';

// models
import machineUrl from '/models/machine.gltf';
import printerUrl from '/models/printer.gltf';


window.CANNON = cannon;
var SCENE = undefined;

// this is a lookup table for a bezier curve
const bezierPrecision = 256;
var p1 = new BABYLON.Vector3(0.0, 0.0, 0.0);
var p2 = new BABYLON.Vector3(0.2, 0.0, 0.0);
var p3 = new BABYLON.Vector3(0.8, 1.0, 0.0);
var p4 = new BABYLON.Vector3(1.0, 1.0, 0.0);
var bezier3 = BABYLON.Curve3.CreateCubicBezier(p1, p2, p3, p4, bezierPrecision);

BABYLON.Animation.prototype.floatInterpolateFunction = function (startValue, endValue, gradient) {
  return startValue + (endValue - startValue) * bezier3._points[Math.ceil(gradient * bezierPrecision)].y;
};

// special map for the key input
class CyborgMap extends Map {
    constructor() {
        super();
        this.constructor.prototype.increment = function (key) {this.has(key) && this.set(key, Math.min(65535, this.get(key) + 1));}
        this.constructor.prototype.decrement = function (key) {this.has(key) && this.set(key, Math.max(    0, this.get(key) - 1));}
    }
}

// import async func
var machine = {ready:false};
var printer = {ready:false};
var raycast = undefined;

// lods
async function startGame() 
{
    raycast = new Raycast(SCENE);
    printer = new Printer(printerUrl, SCENE, shadowGeneratorCascaded);
                    await printer.loadfile();
                    await printer.loadModels();
    printer.ready = await printer.set_up();
    engine.hideLoadingUI();
}

// function to check if two sets are 100% equal
const setsEqual = function(xs, ys) {
    return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}
  
// key presses
const keyRate = 100;
const keysRated = new Set(["f","q","e"]);
const keys = new CyborgMap();
    keys.set("w", 0); keys.set("a", 0); keys.set("s", 0); keys.set("d", 0);
    keys.set(" ", 0); keys.set("f", 0); keys.set("q", 0); keys.set("e", 0);

function keyPressed(key="f") {
    return keys.get(key) == keyRate;
}
document.body.addEventListener('keydown', function(e) {
    if (keys.get(e.key) == 0) {
        keys.set(e.key, keyRate);
    }
}, false);
document.body.addEventListener('keyup', function(e) {
    keys.set(e.key, 0);
}, false);

// Create the scene space
var gravityVector = new BABYLON.Vector3(0, -16.00, 0);
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
    engine.setHardwareScalingLevel(1);
    engine.displayLoadingUI();
const scene = new BABYLON.Scene(engine, {fogStart : 150, fogEnd : 400, fogColor : BABYLON.Color3.Black, collisionsEnabled : true, autoClear : true});
    scene.createDefaultSkybox(new BABYLON.CubeTexture('/textures/environment.env', scene), true, 3000, false);
    scene.collisionsEnabled = true;
    scene.enablePhysics(gravityVector);
    scene.autoClear = false; // Color buffer
    scene.autoClearDepthAndStencil = false; // Depth and stencil, obviously
    scene.blockMaterialDirtyMechanism = true;
    scene.pointerMovePredicate = () => false;
    scene.pointerDownPredicate = () => false;
    scene.pointerUpPredicate = () => false;

    //scene.enablePhysics(new BABYLON.Vector3(0,-12,0)); // physics engine
    scene.skipFrustumCulling = false
SCENE = scene;
const glowlayer = new BABYLON.GlowLayer("glow", scene);
const ambientlight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 0, 0), scene);
    ambientlight.intensity = 0.04;
    ambientlight.color = new BABYLON.Color3(1,1,1);
const sunlight = new BABYLON.DirectionalLight("spotlight", new BABYLON.Vector3(0, -1, 0), scene);  
    sunlight.intensity = 4.4;
    sunlight.shadowEnabled = true;
    sunlight.shadowMaxZ = 35000;
    sunlight.autoCalcShadowZBounds = true;
    sunlight.color = new BABYLON.Color3(1,1,.8);
const shadowGeneratorCascaded = new BABYLON.CascadedShadowGenerator(4096, sunlight);
    shadowGeneratorCascaded.lambda = 0.29;
    shadowGeneratorCascaded.cascadeBlendPercentage = 0.0;
    shadowGeneratorCascaded.debug = false;
    shadowGeneratorCascaded.autoCalcDepthBounds = true;
    shadowGeneratorCascaded.numCascades = 4;
    shadowGeneratorCascaded.shadowMaxZ = 35000;
    shadowGeneratorCascaded.bias = 0.01; // 0.02
const shadowsEnabled = true;
const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
const utillayer = new BABYLON.UtilityLayerRenderer(scene);
const instrumentation = new BABYLON.SceneInstrumentation(scene);
    instrumentation.captureRenderTime = true;
const cameraManager = new CameraManager(SCENE);

// global variables
const divFps = document.getElementById("fps");
const divDrawCalls = document.getElementById("drawcalls");

// game running functions
engine.runRenderLoop(function() {
    divFps.innerHTML = engine.getFps().toFixed() + " fps";
    divDrawCalls.innerHTML = "vcalls: " + instrumentation.drawCallsCounter.current;
    scene.render();
});
window.addEventListener('resize', function() {
    engine.resize();
});

// before render
scene.registerAfterRender(function() {
    keysRated.forEach((value, key, map) => {
        keys.decrement(key);
    });
});

// after render
scene.registerBeforeRender(function() 
{
    raycast.updateRay();
    if (machine.ready) machine.update();
    if (printer.ready) printer.update();
    cameraManager.update();
});

// start game !!! final order !!!
startGame();