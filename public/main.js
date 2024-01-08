
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import * as cannon from 'cannon';
// import envUrl from '/textures/environment.env';
import skycityUrl from '/models/skycityNew.gltf';
import imgUrl from '/textures/test.png';

window.CANNON = cannon;

// math helper
function clamp(val, n1, n2) {
    return min(n2, max(val, n1));
}
function lengthdir_x(len, dir) {
    return len * Math.sin(dir);
}
function lengthdir_z(len, dir) {
    return len * Math.cos(dir);
}
function lengthdir_y(len, dir) {
    return len * -Math.sin(dir);
}
function point_distance(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}
function point_direction(x1, y1, x2, y2) {
    return -Math.atan2(y1 - y2, x1 - x2) + Math.PI/4;
}
function irandom_range(n1, n2) {
    return Math.round(n1 + Math.random(1) * (n2-n1));
}
function random_range(n1, n2) {
    return (n1 + Math.random(1) * (n2-n1));
}
function random(n1) {
    return (n1 * Math.random(1));
}
function irandom(n1) {
    return Math.round(n1 * Math.random(1));
}

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
        this.constructor.prototype.increment = function (key) {
            this.has(key) && this.set(key, Math.min(65535, this.get(key) + 1));
        }
        this.constructor.prototype.decrement = function (key) {
            this.has(key) && this.set(key, Math.max(0, this.get(key) - 1));
        }
    }
}

Math.lerp = function(value1, value2, amount) {
    return value1 + (value2 - value1) * amount;
}

// imports
class Import
{
    constructor(_filename, _scene, _shadows) 
    {
        this.filename = _filename;
        this.scene = _scene;
        this.shadowcaster = _shadows;
        this.modelArray = undefined; // this is an array
        this.defaultmat = new BABYLON.StandardMaterial("myMaterial", scene);
    }

    async loadfile() {
        this.modelArray = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);//"./models/", "skycityNew.gltf", this.scene);
        await this.generateCollision();
        await this.generateShadows();
        await this.receiveShadows();
        await this.receivePickable();
        await this.updateMaterials();
    }

    // child methods ///////////////////////////////////////////////
    async generateCollision() {
        var arr = this.modelArray.meshes;
        for (let n = 1; n < arr.length; n++) {
            let m = arr[n];
                m.checkCollisions = true;
                m.setParent(null);
                m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, this.scene);
        }
    }
    async generateShadows() {
        var arr = this.modelArray.meshes;
        for (let n = 1; n < arr.length; n++) {
            let m = arr[n];
            if (m.material.alpha == 1) {
                this.shadowcaster.addShadowCaster(m);
            }
        }
    }
    async receiveShadows() {
        var arr = this.modelArray.meshes;
        for (let n = 1; n < arr.length; n++) {
            let m = arr[n];
            if (m.material.alpha == 1) {
                m.receiveShadows = true;
            }
        }
    }
    async receivePickable() {
        var arr = this.modelArray.meshes;
        for (let n = 1; n < arr.length; n++) {
            let m = arr[n];
                m.isPickable = true;
        }
    }
    async updateMaterials() {
        var arr = this.modelArray.meshes;
        for (let n = 1; n < arr.length; n++) {
            let m = arr[n];
            var cls = m.getClassName();
            if (cls != "InstancedMesh") {
                //m.material = this.defaultmat;//._environmentIntensity = 0.0;
                console.log(m.material);
            } else {
                console.log("found instanced mesh");
            }
                
        }
    }
}

// includes methods [collision, shadowscasts, shadowreceives, pickable]
// does not include [animation]
class ImportRaw extends Import {
    constructor(_filename, _scene, _shadows) {super(_filename, _scene, _shadows);}
    async loadfile() {
        await super.loadfile();
    }
}

// player
class Avatar extends BABYLON.Mesh 
{
    constructor(scene, camera, spawn) 
    {
        super("Avatar", scene);
        this.root = new BABYLON.MeshBuilder.CreateSphere("avatar-root", {diameter : 1.0, segments : 16});
        this.root.physicsImpostor = new BABYLON.PhysicsImpostor(this.root, BABYLON.PhysicsImpostor.SphereImpostor, {mass: 1, restitution: 0.5, friction: 0.1}, scene);
        this.root.isPickable = false;

        // phsyics
        this.setAbsolutePosition(spawn);
        this.speed = new BABYLON.Vector3(0,0,0);
        this.moveSpeed = 6.7;
        this.jumpSpeed = 1.2;

        // items
        this.heldItem = undefined;
        this.myCamera = camera;

        // apply camera
        camera.setTarget(this.absolutePosition);

        const raycastMat = new BABYLON.StandardMaterial("raycastMat", scene);
            raycastMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
            raycastMat.alpha = 0.7;
        this.raycast = BABYLON.MeshBuilder.CreateSphere("indicatorPoint", {diameter: 0.1}, scene);
        this.raycast.isVisible = true;
        this.raycast.isPickable = false;
        this.raycast.material = raycastMat;
        this.raycast.hitId = undefined;
    }

    update(pickedPoint) 
    {
        // set rotation to camera
        this.root.rotation.xz = this.myCamera.rotation.xz;

        // increase speed
        let vmult = keyPressed("w") - keyPressed("s");
        let hmult = keyPressed("a") - keyPressed("d");

        this.speed.x = lengthdir_x(vmult * this.moveSpeed, this.myCamera.rotation.y) + lengthdir_x(hmult * this.moveSpeed, this.myCamera.rotation.y - Math.PI/2);
        this.speed.z = lengthdir_z(vmult * this.moveSpeed, this.myCamera.rotation.y) + lengthdir_z(hmult * this.moveSpeed, this.myCamera.rotation.y - Math.PI/2);

        // reduce speed
        this.speed = BABYLON.Vector3.Lerp(this.speed, BABYLON.Vector3.Zero(), 0.10);
        this.root.physicsImpostor._physicsBody.velocity.x = this.speed.x;
        this.root.physicsImpostor._physicsBody.velocity.z = this.speed.z;

        // update camera
        this.myCamera.position.x = Math.lerp(this.myCamera.position.x, this.root.position.x, 0.4);
        this.myCamera.position.z = Math.lerp(this.myCamera.position.z, this.root.position.z, 0.4);
        this.myCamera.position.y = Math.lerp(this.myCamera.position.y, this.root.position.y, 0.4);

        // raycast
        if (pickedPoint != undefined) {
            this.raycast.position = pickedPoint;
            this.raycast.scalingDeterminant = BABYLON.Vector3.length(pickedPoint, this.myCamera.position);
        }
    }

    jump() {
        this.root.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, this.jumpSpeed, 0), this.root.absolutePosition);
    }

    action(pickedMesh) {

        // handle raycast pickedMesh
        if (pickedMesh == undefined) {
            return;
        }

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

// Create the scene space
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine, {fogStart : 150, fogEnd : 400, fogColor : BABYLON.Color3.Black, collisionsEnabled : true, autoClear : true});
    scene.createDefaultSkybox(new BABYLON.CubeTexture('/textures/environment.env', scene), true, 300, false);
    scene.collisionsEnabled = true;
    scene.enablePhysics();
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
const player = new Avatar(scene, camera, BABYLON.Vector3.Zero());
const pickInfo = scene.pick(scene.pointerX, scene.pointerY);

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
scene.registerAfterRender(function() 
{
    // key press handler
    keysRated.forEach((value, key, map) => {
        keys.decrement(key);
    });
});

// after render
scene.registerBeforeRender(function() 
{
    // main update loop
    if (keyPressed("f")) {
        player.action(pickInfo.pickedMesh);
    }

    // player jump
    if (keyPressed(" ")) {
        player.jump();
    }
    
    // camera to player position, and rotation, held items
    player.update(pickInfo.pickedPoint);
});

// load content
const skycity = new ImportRaw(skycityUrl, scene, shadowGeneratorCascaded);
skycity.loadfile();
