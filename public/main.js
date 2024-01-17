
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import * as cannon from 'cannon';

// models
import skycityUrl from '/models/skycityNew.gltf';
import medilabUrl from '/models/medilab.gltf';
import devilmachineUrl from '/models/devilmachine.gltf';
import interiorUrl from '/models/interior.gltf';
import foliageUrl from '/models/foliage.gltf';
import itemsUrl from '/models/items.gltf';

// materials
import nodeMaterialBaseUrl1 from '/textures/nodeMaterial (75).json';
import nodeMaterialBaseUrl2 from '/textures/nodeMaterial (81).json';
import nodeMaterialBaseTree from '/textures/nodeMaterialPaletteTree.json';
import nodeMaterialBaseLeaf from '/textures/nodeMaterial (80).json';

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
Math.lerp = function(value1, value2, amount) {
    return value1 + (value2 - value1) * amount;
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

// import async func
async function startGame() 
{
    // flags [collision, makeshadows, receiveshadows, pickable, placeholder]
    const skycity = new Import(skycityUrl, scene, shadowGeneratorCascaded, 0b11110, "world");
    await skycity.loadfile();

    const medilab = new Import(medilabUrl, scene, shadowGeneratorCascaded, 0b11110, "world");
    await medilab.loadfile();

    const devilmachine = new Devilmachine(devilmachineUrl, scene, shadowGeneratorCascaded, 0b00110, "devilmachine");
    await devilmachine.loadfile();
    machineHandler = devilmachine;

    const interior = new Import(interiorUrl, scene, shadowGeneratorCascaded, 0b00110, "interior");
    await interior.loadfile();

    const foliage = new Import(foliageUrl, scene, shadowGeneratorCascaded, 0b01100, "foliage");
    await foliage.loadfile();

    const items = new Import(itemsUrl, scene, shadowGeneratorCascaded, 0b00110, "item");
    await items.loadfile();
    await items.createSeperateHitboxes(true);

    // spawn player
    player.setAbsolutePosition(BABYLON.Vector3.Zero());
}

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

// imports
class Import
{
    //animatorskeys = 2; // set
    
    // flags [collision, makeshadows, receiveshadows, pickable, isItem]
    constructor(_filename, _scene, _shadows, _flags, _class) 
    {
        this.filename = _filename;
        this.scene = _scene;
        this.shadowcaster = _shadows;
        this.modelArray = undefined; // array
        this.flags = _flags;
        this.class = _class;
        this.animators = undefined; // map
    }

    async loadfile() {
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.class = this.class;
            m.setParent(null);
        });
        await this.generateCollision();
        await this.generateShadows();
        await this.receiveShadows();
        await this.receivePickable();
        await this.updateMaterials();
    }

    async createSeperateHitboxes(Issphere) 
    {
        if (Issphere) { // sphere hitbox
            this.modelArray.forEach((m, index) => {
                let _radius = m.getBoundingInfo().boundingSphere.radiusWorld;
                let _mass = Math.pow(_radius, 3);
                this.hitbox = new BABYLON.MeshBuilder.CreateSphere("itemhbs_", {diameter: _radius, segments : 1});
                this.hitbox.position = m.position;
                this.hitbox.physicsImpostor = new BABYLON.PhysicsImpostor(this.hitbox, BABYLON.PhysicsImpostor.SphereImpostor, {mass : _mass, friction : 0.99, restitution : 1.0});
                this.hitbox.isVisible = false;
                this.hitbox.addChild(m);
            });
        } else { // box hitbox
            this.modelArray.forEach((m, index) => {
                let _radius = m.getBoundingInfo().boundingSphere.radiusWorld;
                this.hitbox = new BABYLON.MeshBuilder.CreateBox("itemhbb_", {size : _radius});
                this.hitbox.position = m.position;
                this.hitbox.isVisible = false;
                this.hitbox.addChild(m);
            });
        }
    }

    // import methods ///////////////////////////////////////////////
    async generateCollision() {
        if (this.flags & 16) {
            this.modelArray.forEach((m, index) => {
                m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, this.scene);
            });
        }
    }
    async generateShadows() {
        if (this.flags & 8) {
            this.modelArray.forEach((m, index) => {
                if (m.material.alpha == 1) this.shadowcaster.addShadowCaster(m);
            });
        }
    }
    async receiveShadows() {
        if (this.flags & 4) {
            this.modelArray.forEach((m, index) => {
                if (m.material.alpha == 1) m.receiveShadows = true;
            });
        }
    }
    async receivePickable() {
        if (!(this.flags & 2)) {
            this.modelArray.forEach((m, index) => {
                m.isPickable = false;
                m.doNotSyncBoundingInfo = true;
            });
        } 
    }
    async placeholder() {
        if (this.flags & 1) {
            
        }
    }
    async updateMaterials() {
        this.modelArray.forEach((m, index) => {
            if (!m.isAnInstance) {
                switch (m.material.id)
                {
                    case "ColorPaletteB":
                        m.material = nodeMaterialBase;
                    break;
                    case "TexturePaletteSkycity":
                        m.material = nodeMaterialSkycity;
                    break;
                    case "Fake_Glass":
                        m.material = pbrMateralGlass;
                    break;
                    case "TreePalette":
                        m.material = nodeMaterialTree;
                    break;
                    case "LeafPalette":
                        m.material = nodeMaterialLeaf;
                    break;
                    case "TextureAtlasA":
                    break;
                } 
            }
        });
    }

    // animation methods //////////////////////////////////////////////////
    registerAnimators(set) { // registers which meshes are animated
        this.animators = new Map();
        this.modelArray.forEach((m, index) => {
            if (set.has(m.name)) {
                this.animators.set(m.name, {mesh:m, animation:new Array()});
            }
        });
    } // map[?key] = {mesh, [anim0, anim1, anim2...]}

    registerAnimation(key, frames, what) {
        var anim = new BABYLON.Animation(key + "_" + what, what, 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, false);
            anim.setKeys(frames);
        var arr = this.animators.get(key).animation;
        try {arr.push(anim)} 
        catch {console.log("animator does not exist")}
    }

    playAnimation(key, ind, func=undefined) {
        var obj = this.animators.get(key);
        var anim = obj.animation[ind];
            var keys = anim.getKeys();
            var len = keys[keys.length-1].frame;
        this.scene.beginDirectAnimation(obj.mesh, [anim], 0, len, false, 1, func, undefined, false);
    }

}

// individual import classes
class Devilmachine extends Import 
{
    constructor(_filename, _scene, _shadows, _flags, _class) {
        super(_filename, _scene, _shadows, _flags, _class);
        this.readyState = 0;
        this.machineState = 0;
        this.meshesTTP = new Array();
        this.animatorsKeys = new Set(["dms_schlitten", "dms_schlitten_nano", "dms_magnifier", "dms_pipetierer", "dms_pipetierer2","dms_quadreagenz", "dms_spule_innen_links", "dms_spule_innen_rechts", "dms_spule_aussen_links", "dms_spule_aussen_rechts"]);
    }

    async loadfile() {
        await super.loadfile();
        this.modelArray.forEach((element, index) => {
            if (element.name.includes("Display")) {
                element.rotationQuaternion = null;
                this.meshesTTP.push(element);
            }
        });
        this.registerAnimators();
    }

    // methods
    tryStart() {
        if (this.readyState < 0b11111) {
            //return false;
        }

        // change machinestate
        this.machineState = 1;

        // animation
        var t = performance.now();
        super.playAnimation("dms_schlitten", 0, () => {
            super.playAnimation("dms_magnifier", 0, () => {
                super.playAnimation("dms_schlitten", 1, () => {
                    super.playAnimation("dms_pipetierer", 0, () => { // SPLIT
                        super.playAnimation("dms_schlitten", 2, undefined); // END
                        super.playAnimation("dms_pipetierer", 1, () => { 
                            super.playAnimation("dms_pipetierer", 2, () => { 
                                super.playAnimation("dms_pipetierer", 3, () => { // SPLIT

                                    // quad animation after nano sled
                                    super.playAnimation("dms_quadreagenz", 1, undefined); // END
                                    super.playAnimation("dms_quadreagenz", 0, () => {

                                        // magnets
                                        super.playAnimation("dms_spule_innen_links", 0, () => {

                                            // quad back down
                                            super.playAnimation("dms_quadreagenz", 3, undefined); // END
                                            super.playAnimation("dms_quadreagenz", 2, () => {

                                                // set machine as finished
                                                console.log("animation finished");
                                                this.machineState = 0;

                                            }); // END 
                                        });

                                        super.playAnimation("dms_spule_innen_rechts", 0, undefined);
                                        super.playAnimation("dms_spule_aussen_links", 0, undefined);
                                        super.playAnimation("dms_spule_aussen_rechts", 0, undefined);
                                    }); 
                                });
                            });
                        });
                    });
                });
            });
        });

        // nano sled parallel
        super.playAnimation("dms_schlitten_nano", 0, () => {
            super.playAnimation("dms_pipetierer2", 0, () => { // SPLIT
                super.playAnimation("dms_schlitten_nano", 1, undefined); // END
                super.playAnimation("dms_pipetierer2", 1, () => { 
                    super.playAnimation("dms_pipetierer2", 2, () => { 
                        super.playAnimation("dms_pipetierer2", 3, undefined); // END
                    });
                });
            });
        });
        var t = performance.now() - t;
        console.log("animation registered in : " + Math.round(1000*t)/1000 + " ms");
    }

    TTP(_camera) {
        var minDis = 10;
        this.meshesTTP.forEach((element, index) => {
            var dis = point_distance(element._absolutePosition.x, element._absolutePosition.z, _camera.position.x, _camera.position.z);
            if (dis < minDis) {
                element.rotation.x = 0.0;
                element.rotation.y = point_direction(element._absolutePosition.x, element._absolutePosition.z, _camera.position.x, _camera.position.z); 
                element.rotation.z = Math.PI;
            }
        });
    }

    registerAnimators() 
    {
        super.registerAnimators(this.animatorsKeys);
        var sledPos = this.animators.get("dms_schlitten").mesh.position;
        var magPos = this.animators.get("dms_magnifier").mesh.position;
        var pipPos = this.animators.get("dms_pipetierer").mesh.position;
        var pip2Pos = this.animators.get("dms_pipetierer2").mesh.position;
        var nanoPos = this.animators.get("dms_schlitten_nano").mesh.position;
        var quadPos = this.animators.get("dms_quadreagenz").mesh.position;
        var centPos = this.animators.get("dms_spule_innen_links").mesh.position;
        var cent2Pos = this.animators.get("dms_spule_innen_rechts").mesh.position;
        var cent3Pos = this.animators.get("dms_spule_aussen_links").mesh.position;
        var cent4Pos = this.animators.get("dms_spule_aussen_rechts").mesh.position;

        // CHAIN 1
        // SLED TO MAG
        var frames = [
            {frame:   0, value: sledPos.x},
            {frame:  60, value: magPos.x}
        ]; super.registerAnimation("dms_schlitten", frames, "position.x");

        // MAG DOWN AND UP
        var frames = [
            {frame:   0, value: magPos.y},
            {frame:  60, value: magPos.y - 0.05},
            {frame: 120, value: magPos.y}
        ]; super.registerAnimation("dms_magnifier", frames, "position.y");

        // SLED TO PIPE
        var frames = [
            {frame:   0, value: magPos.x},
            {frame:  60, value: pipPos.x}
        ]; super.registerAnimation("dms_schlitten", frames, "position.x");

        // PIPE DOWN AND UP
        var frames = [
            {frame:   0, value: pipPos.y},
            {frame:  40, value: pipPos.y - 0.05},
            {frame:  80, value: pipPos.y}
        ]; super.registerAnimation("dms_pipetierer", frames, "position.y");

        // SLED TO ORIGIN
        var frames = [
            {frame:   0, value: pipPos.x},
            {frame: 120, value: sledPos.x}
        ]; super.registerAnimation("dms_schlitten", frames, "position.x");

        // PIPE TO QUAD AND DOWN AND BACK
        var frames = [
            {frame:   0, value: pipPos.x},
            {frame:  60, value: quadPos.x}
        ]; super.registerAnimation("dms_pipetierer", frames, "position.x");
        var frames = [
            {frame:   0, value: pipPos.y},
            {frame:  40, value: pipPos.y - 0.05},
            {frame:  80, value: pipPos.y}
        ]; super.registerAnimation("dms_pipetierer", frames, "position.y");
        var frames = [
            {frame:   0, value: quadPos.x},
            {frame:  60, value: pipPos.x}
        ]; super.registerAnimation("dms_pipetierer", frames, "position.x");

        /////////////////////////////////////////////
        // NANO SLED TO PIPE 2
        var frames = [
            {frame:   0, value: nanoPos.x},
            {frame:  80, value: pip2Pos.x}
        ]; super.registerAnimation("dms_schlitten_nano", frames, "position.x");

        // PIPE DOWN AND UP
        var frames = [
            {frame:   0, value: pip2Pos.y},
            {frame:  40, value: pip2Pos.y - 0.05},
            {frame:  80, value: pip2Pos.y}
        ]; super.registerAnimation("dms_pipetierer2", frames, "position.y");

        // NANO SLED TO ORIGIN
        var frames = [
            {frame:   0, value: pip2Pos.x},
            {frame:  80, value: nanoPos.x}
        ]; super.registerAnimation("dms_schlitten_nano", frames, "position.x");

        // PIPE2 TO QUAD AND DOWN AND BACK
        var frames = [
            {frame:   0, value: pip2Pos.x},
            {frame:  60, value: quadPos.x}
        ]; super.registerAnimation("dms_pipetierer2", frames, "position.x");
        var frames = [
            {frame:   0, value: pip2Pos.y},
            {frame:  40, value: pip2Pos.y - 0.05},
            {frame:  80, value: pip2Pos.y}
        ]; super.registerAnimation("dms_pipetierer2", frames, "position.y");
        var frames = [
            {frame:   0, value: quadPos.x},
            {frame:  60, value: pip2Pos.x}
        ]; super.registerAnimation("dms_pipetierer2", frames, "position.x");

        // QUAD BACK AND UP (PARALLEL)
        var frames = [
            {frame:   0, value: quadPos.z},
            {frame:  60, value: centPos.z}
        ]; super.registerAnimation("dms_quadreagenz", frames, "position.z");
        var frames = [
            {frame:  40, value: quadPos.y},
            {frame: 100, value: centPos.y}
        ]; super.registerAnimation("dms_quadreagenz", frames, "position.y");

        // MAGNETS
        var frames = [
            {frame:   0, value: centPos.x},
            {frame: 100, value: centPos.x - 0.05},
            {frame: 200, value: centPos.x}
        ]; super.registerAnimation("dms_spule_innen_links", frames, "position.x");
        var frames = [
            {frame:   0, value: cent2Pos.x},
            {frame: 100, value: cent2Pos.x + 0.05},
            {frame: 200, value: cent2Pos.x}
        ]; super.registerAnimation("dms_spule_innen_rechts", frames, "position.x");
        var frames = [
            {frame:  50, value: cent3Pos.x},
            {frame: 150, value: cent3Pos.x - 0.05},
            {frame: 250, value: cent3Pos.x}
        ]; super.registerAnimation("dms_spule_aussen_links", frames, "position.x");
        var frames = [
            {frame:  50, value: cent4Pos.x},
            {frame: 150, value: cent4Pos.x + 0.05},
            {frame: 250, value: cent4Pos.x}
        ]; super.registerAnimation("dms_spule_aussen_rechts", frames, "position.x");

        // QUAD BACK AND down (PARALLEL)
        var frames = [
            {frame:  40, value: centPos.z},
            {frame: 100, value: quadPos.z}
        ]; super.registerAnimation("dms_quadreagenz", frames, "position.z");
        var frames = [
            {frame:   0, value: centPos.y},
            {frame:  60, value: quadPos.y}
        ]; super.registerAnimation("dms_quadreagenz", frames, "position.y");
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
        this.root.isVisible = false;

        // phsyics
        this.setAbsolutePosition(spawn);
        this.speed = new BABYLON.Vector3(0,0,0);
        this.moveSpeed = 6.7;
        this.jumpSpeed = 1.2;

        // items
        this.heldItem = undefined;
        this.handPosition = new BABYLON.Vector3();
        this.myCamera = camera;

        // apply camera
        camera.setTarget(this.absolutePosition);

        // raycast
        var mat = new BABYLON.StandardMaterial("raycastMat", scene);
            mat.emissiveColor = new BABYLON.Color3(0.2, 1, 0);
        this.raycast = BABYLON.MeshBuilder.CreateSphere("indicatorPoint", {diameter: 0.02}, scene);
        this.raycast.isPickable = false;
        this.raycast.material = mat;
        this.raycast.hitId = undefined;
        this.raycast.renderingGroupId = 1;
        this.raycast._lightSources = [];
        this.raycastInvalid = BABYLON.MeshBuilder.CreateSphere("indicatorPoint", {diameter: 0.02}, scene);
        this.raycastInvalid.isPickable = false;
        var mat = new BABYLON.StandardMaterial("mat", scene);
            mat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        this.raycastInvalid.material = mat;
        this.raycastInvalid.renderingGroupId = 1;
        this.raycastInvalid._lightSources = [];
        this.raycastIsNear = false;
        
    }

    update() 
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
        this.myCamera.position.y = Math.lerp(this.myCamera.position.y, this.root.position.y + 1.0, 0.4);
    }

    jump() {
        this.root.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, this.jumpSpeed, 0), this.root.absolutePosition);
    }

    updateRay(pickinfo) 
    {
        if (pickinfo != undefined) 
        {
            if (pickinfo.pickedMesh != null) 
            {
                this.raycast.hitId = pickinfo.pickedMesh;
                this.raycast.position = pickinfo.pickedPoint;
                this.raycastInvalid.position = pickinfo.pickedPoint;
                var dis = BABYLON.Vector3.Distance(pickinfo.pickedPoint, this.myCamera.position);
                var scd1 = 1.0 + dis * 0.2;
                var scd2 = 0.0 + dis * 0.6;
                this.raycast.scalingDeterminant = scd1;
                this.raycastInvalid.scalingDeterminant = scd2;
                this.raycastIsNear = (scd1 > scd2);
            } else {
                this.raycastIsNear = false;
            }
        }
    }

    updateHeld() {
        this.handPosition.x = this.myCamera.position.x + lengthdir_x(2.5, this.myCamera.rotation.y);
        this.handPosition.y = this.myCamera.position.y - 0.6;
        this.handPosition.z = this.myCamera.position.z + lengthdir_z(2.5, this.myCamera.rotation.y);
        if (this.heldItem != undefined) {
            this.heldItem.parent._position = this.handPosition;
        }
    }

    action(pickinfo) 
    {
        // handle raycast pickedMesh
        if (pickinfo == undefined || pickinfo.pickedMesh == undefined || !player.raycastIsNear) {
            return;
        }

        console.log("picked " + pickinfo.pickedMesh.name);
        console.log("class " + pickinfo.pickedMesh.class);
        switch (pickinfo.pickedMesh.class)
        {
            case "world":
            case "foliage":

            break;
            case "devilmachine":
                switch (pickinfo.pickedMesh.name)
                {
                    case "DisplayMain":
                        machineHandler.tryStart();
                    break;
                    case "dms_schlitten":
                    
                    break;
                }
            break;
            case "item":
                this.pickup(pickinfo.pickedMesh);
            break;
        }
    }

    pickup(mesh) { 
        if (this.heldItem != undefined) {
            this.drop();
        }
        this.heldItem = mesh;
        this.heldItem._parentNode.picked = true;
        this.heldItem._parentNode.isPickable = false;
        this.heldItem._parentNode.physicsImpostor.sleep();
        this.heldItem.renderingGroupId = 1;
    }

    drop() {
        if (this.heldItem != undefined) {
            this.heldItem._parentNode.picked = false;
            this.heldItem._parentNode.isPickable = true;
            this.heldItem._parentNode.physicsImpostor.wakeUp();
            this.heldItem.renderingGroupId = 0;
            this.heldItem = undefined;
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
var gravityVector = new BABYLON.Vector3(0, -16.00, 0);
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine, {fogStart : 150, fogEnd : 400, fogColor : BABYLON.Color3.Black, collisionsEnabled : true, autoClear : true});
    scene.createDefaultSkybox(new BABYLON.CubeTexture('/textures/environment.env', scene), true, 300, false);
    scene.collisionsEnabled = true;
    scene.enablePhysics(gravityVector);
    scene.autoClear = false; // Color buffer
    scene.autoClearDepthAndStencil = false; // Depth and stencil, obviously
    scene.blockMaterialDirtyMechanism = true;
    //scene.enablePhysics(new BABYLON.Vector3(0,-12,0)); // physics engine
    
const glowlayer = new BABYLON.GlowLayer("glow", scene);
const ambientlight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 20, 0), scene);
    ambientlight.intensity = 0.08;
    
const sunlight = new BABYLON.DirectionalLight("spotlight", new BABYLON.Vector3(-1, -1, 1), scene);
    sunlight.position = new BABYLON.Vector3(6, 2, 6);  
    sunlight.intensity = 4.6;
    sunlight.shadowEnabled = true;
    sunlight.shadowMaxZ = 12000;
    sunlight.autoCalcShadowZBounds = true;
const shadowGeneratorCascaded = new BABYLON.CascadedShadowGenerator(2048, sunlight);
    shadowGeneratorCascaded.lambda = 1.0;
    shadowGeneratorCascaded.cascadeBlendPercentage = 0.2;
    shadowGeneratorCascaded.debug = false;
    shadowGeneratorCascaded.autoCalcDepthBounds = true;
    shadowGeneratorCascaded.numCascades = 1;
    shadowGeneratorCascaded.shadowMaxZ = 12000;
    shadowGeneratorCascaded.bias = 0.01; // 0.02
const camera = new BABYLON.UniversalCamera("MyCamera", new BABYLON.Vector3(0, 1, 0), scene);
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);
    camera.speed = 0.05;
    camera.angularSpeed = 0.05;
const utillayer = new BABYLON.UtilityLayerRenderer(scene);
const instrumentation = new BABYLON.SceneInstrumentation(scene);
    instrumentation.captureRenderTime = true;

// PBR materials
const noEmission = new BABYLON.Color3(0,0,0);
const pbrMateralGlass = new BABYLON.PBRMaterial("glassMat", scene);
    pbrMateralGlass.metallic = 0;
    pbrMateralGlass.roughness = 0;
    pbrMateralGlass.separateCullingPass = true;
    pbrMateralGlass.backFaceCulling = false;
    pbrMateralGlass.environmentIntensity = 0.8;
    pbrMateralGlass._albedoColor = new BABYLON.Color3(0,0,0);
    pbrMateralGlass.alpha = 0.45;

// node materials
const nodeMaterialBase = BABYLON.NodeMaterial.Parse(nodeMaterialBaseUrl1, scene);
    nodeMaterialBase.freeze();
const nodeMaterialSkycity = BABYLON.NodeMaterial.Parse(nodeMaterialBaseUrl2, scene);
    nodeMaterialSkycity.freeze();
const nodeMaterialTree = BABYLON.NodeMaterial.Parse(nodeMaterialBaseTree, scene);
    nodeMaterialTree.freeze();
const nodeMaterialLeaf = BABYLON.NodeMaterial.Parse(nodeMaterialBaseLeaf, scene);
    nodeMaterialLeaf.backFaceCulling = false;
    nodeMaterialLeaf.freeze();

// global variables
const divFps = document.getElementById("fps");
const divDrawCalls = document.getElementById("drawcalls");
const player = new Avatar(scene, camera, BABYLON.Vector3.Zero());
var machineHandler = undefined;

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
    let pi = scene.pick(scene.pointerX, scene.pointerY);
    if (keyPressed("f")) player.action(pi);

    // player jump
    if (keyPressed(" ")) player.jump();

    // drop item
    if (keyPressed("q")) player.drop();
    
    // camera to player position, and rotation, held items
    player.update();
    player.updateHeld();
    player.updateRay(pi);

    // other shit
    if (machineHandler != undefined) {
        machineHandler.TTP(camera);
    }
});

// start game !!! final order !!!
startGame();