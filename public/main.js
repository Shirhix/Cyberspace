
// import * as BABYLON from 'http://localhost:3000/node_modules/@babylonjs/core';
import * as BABYLON from './node_modules/@babylonjs/core';
// import {Vector3} from './node_modules/@babylonjs/core/Maths/math.js';
//import * as CANNON from './node_modules/cannon';

// this is a lookup table for a bezier curve
const bezierPrecision = 256;
var p1 = new Vector3(0.0, 0.0, 0.0);
var p2 = new Vector3(0.2, 0.0, 0.0);
var p3 = new Vector3(0.8, 1.0, 0.0);
var p4 = new Vector3(1.0, 1.0, 0.0);
var bezier3 = BABYLON.Curve3.CreateCubicBezier(p1, p2, p3, p4, bezierPrecision);

BABYLON.Animation.prototype.floatInterpolateFunction = function (startValue, endValue, gradient) {
  return startValue + (endValue - startValue) * bezier3._points[Math.ceil(gradient * bezierPrecision)].y;
};

// special map for the key input
class CyborgMap extends Map {
    constructor() {
        super();
        this.constructor.prototype.increment = function (key) {
            this.has(key) && this.set(key, Math.min(65535, this.get(key) + 1));
        }
        this.constructor.prototype.decrement = function (key) {
            this.has(key) && this.set(key, Math.max(0, this.get(key) - 1));
        }
    }
}

class Avatar {
    constructor() {

    }
}

// function to check if two sets are 100% equal
const setsEqual = function(xs, ys) { 
    return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}
  
// key presses
const keyRate = 100;
const keysRated = new Set(["f","q"]);
const keys = new CyborgMap();
    keys.set("w", 0); keys.set("a", 0); keys.set("s", 0); keys.set("d", 0);
    keys.set(" ", 0); keys.set("f", 0); keys.set("q", 0);

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

// raycast
class Raycast
{
    constructor(scene) {
        const indicatorPointMat = new BABYLON.StandardMaterial("indicatorPointMat", scene);
            indicatorPointMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
            indicatorPointMat.alpha = 0.7;
        this.indicatorPoint = BABYLON.MeshBuilder.CreateSphere("indicatorPoint", {diameter: 0.1}, scene);
        this.indicatorPoint.isVisible = true;
        this.indicatorPoint.isPickable = false;
        this.indicatorPoint.material = indicatorPointMat;
        this.indicatorPoint.hitId = undefined;
    }
    write(hitId, hitPos) {this.indicatorPoint.hitId = hitId; this.indicatorPoint.position = hitPos;}
    read() {return [this.indicatorPoint.hitId, this.indicatorPoint.position];}
    show() {console.log(read());}
}

// Create the scene space
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine, {fogStart : 150, fogEnd : 400, fogColor : BABYLON.Color3.Black, collisionsEnabled : true, autoClear : true});
    scene.createDefaultSkybox(new BABYLON.CubeTexture("/textures/environment.env", scene), true, 300, false);
    // scene.enablePhysics(new BABYLON.Vector3(0,-12,0)); // physics engine
    
const glowlayer = new BABYLON.GlowLayer("glow", scene);
const ambientlight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 20, 0), scene);
    ambientlight.intensity = 0.4;
const sunlight = new BABYLON.DirectionalLight("spotlight", new BABYLON.Vector3(-1, -1, 1), scene);
    sunlight.position = new BABYLON.Vector3(6, 5, 6);  
    sunlight.intensity = 5.0;
    sunlight.shadowEnabled = true;
    sunlight.shadowMaxZ = 10000;
    sunlight.autoCalcShadowZBounds = true;
const shadowGeneratorCascaded = new BABYLON.CascadedShadowGenerator(2048, sunlight);
    shadowGeneratorCascaded.lambda = 1.0;
    shadowGeneratorCascaded.cascadeBlendPercentage = 0.0;
    shadowGeneratorCascaded.debug = false;
    shadowGeneratorCascaded.autoCalcDepthBounds = true;
    shadowGeneratorCascaded.numCascades = 0;
    shadowGeneratorCascaded.shadowMaxZ = 5000;
    shadowGeneratorCascaded.bias = 0.02;
const camera = new BABYLON.UniversalCamera("MyCamera", new BABYLON.Vector3(0, 1, 0), scene);
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);
    camera.speed = 0.05;
    camera.angularSpeed = 0.05;
const utillayer = new BABYLON.UtilityLayerRenderer(scene);
const instrumentation = new BABYLON.SceneInstrumentation(scene);
    instrumentation.captureRenderTime = true;

// global variables
const divFps = document.getElementById("fps");
const divDrawCalls = document.getElementById("drawcalls");
const debug = false;
const raycast = new Raycast(scene);

// game running functions
engine.runRenderLoop(function() 
{
    // profiling
    divFps.innerHTML = engine.getFps().toFixed() + " fps";
    divDrawCalls.innerHTML = "vcalls: " + instrumentation.drawCallsCounter.current;

    // render frame
    scene.render();
});
window.addEventListener('resize', function() {
    engine.resize();
});

// before render
scene.registerAfterRender(function() 
{
    // key press handler
    keysRated.forEach((value, key, map) => {
        keys.decrement(key);
    });
});

function pressAction() 
{
    const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
    if (pickInfo.pickedMesh == null) {
        return false;
    }
}

// after render
scene.registerBeforeRender(function() 
{
    // main update loop
    if (keyPressed("f")) {
        pressAction();
    }
    
    // holding item

});
