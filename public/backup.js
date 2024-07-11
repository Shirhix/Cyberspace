
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import * as cannon from 'cannon';
import * as GUI from '@babylonjs/gui';
import * as DebugLayer from "@babylonjs/core/Debug/debugLayer";
import * as Inspector from "@babylonjs/inspector";

// models
import skycityUrl from '/models/skycityNew.gltf';
import medilabUrl from '/models/medilab.gltf';
import devilmachineUrl from '/models/devilmachine.gltf';
import interiorUrl from '/models/interior.gltf';
import foliageUrl from '/models/foliage.gltf';
import itemsUrl from '/models/items.gltf';
import histoUrl from '/models/histopopart.gltf';
import logoUrl from '/models/logo.gltf';
import lodsUrl from '/models/lods.gltf';
import boxsUrl from '/models/boxs.gltf';
import terrainUrl from '/models/terrain.gltf';
import cameraUrl from '/models/camerapath.gltf';

// materials
import nodeMaterialBaseUrl1 from '/textures/nodeMaterial (75).json';
import nodeMaterialBaseUrl2 from '/textures/nodeMaterialMedilab.json';
import nodeMaterialBaseTree from '/textures/nodeMaterialTreeMove.json';
import nodeMaterialBaseLeaf from '/textures/nodeMaterial (80).json';
import nodeMaterialTerrainUrl from '/textures/nodeMaterialTerrain.json';
import nodeMaterialWaterUrl from '/textures/nodeMaterial (97).json';

// textures
import uiTex1 from '/textures/uiHelditem.png';

// files
import {Inventory} from './inventory.js';

window.CANNON = cannon;

class Interface // for inventories etc
{
    constructor() {

    }

    createLabels() 
    {
        let label = new GUI.TextBlock();
        label.text = this.texts[i][j];
               
        let rect = new GUI.Rectangle();
        rect.width = 0.01 * label.text.length;
        rect.height = "16px";
        rect.color = "cyan";
        rect.background = "black";
        rect.isVisible = false;       

        advancedTexture.addControl(rect);

        rect.addControl(label);
        rect.linkWithMesh(m);
        rect.linkOffsetY = 40;
    }
}

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
var camerapath = {ready:false};
var terrain = {ready:false};
var skycity = {ready:false};
var medilab = {ready:false};
var devilmachine = {ready:false};
var interior = {ready:false};
var foliage = {ready:false};
var items = {ready:false};
var histos = {ready:false};
var logos = {ready:false};
var globalLODs = {ready:false};
var globalBOXs = {ready:false};
const globalLOD = new Map();
const globalBOX = new Map();

// lods
async function startGame() 
{
    // lods
    globalLODs = new LODImport(lodsUrl, scene, shadowGeneratorCascaded, 0b00100, "lod");
    //globalLODs.ready = await globalLODs.loadfile();

    // boxes
    globalBOXs = new BOXImport(boxsUrl, scene, shadowGeneratorCascaded, 0b10000, "box");
    // globalBOXs.ready = await globalBOXs.loadfile();

    // flags [collision, makeshadows, receiveshadows, pickable, placeholder]
    //terrain = new ImportTerrain(terrainUrl, scene, shadowGeneratorCascaded, 0b0, "terrain");
    //terrain.ready = await terrain.loadfile();

    // skycity = new Import(skycityUrl, scene, shadowGeneratorCascaded, 0b11110, "world");
    // skycity.ready = await skycity.loadfile();

    // medilab = new Import(medilabUrl, scene, shadowGeneratorCascaded, 0b11110, "world");
    // medilab.ready = await medilab.loadfile();

    devilmachine = new Devilmachine(devilmachineUrl, scene, shadowGeneratorCascaded, 0b00110, "devilmachine");
    devilmachine.ready = await devilmachine.loadfile();

    interior = new Import(interiorUrl, scene, shadowGeneratorCascaded, 0b00110, "interior");
    interior.ready = await interior.loadfile();

    foliage = new Import(foliageUrl, scene, shadowGeneratorCascaded, 0b01100, "foliage");
    //foliage.ready = await foliage.loadfile();

    items = new Import(itemsUrl, scene, shadowGeneratorCascaded, 0b00110, "item");
    //await items.loadfile();
    //await items.createSeperateHitboxes(true);
    //items.ready = true;

    histos = new RotationArt(histoUrl, scene, shadowGeneratorCascaded, 0b01110, "viewable");
    //histos.ready = await histos.loadfile();
    //histos.createLabels();
    
    logos = new ImportAnimated(logoUrl, scene, shadowGeneratorCascaded, 0b00000, "world", (_ma) => {
        _ma.forEach((m, index) => {
            m.rotationQuaternion = null;
            m.rotation.y += 0.01;
        });
    }); //logos.ready = await logos.loadfile();

    

    // spawn player
    engine.hideLoadingUI();
    player.setAbsolutePosition(BABYLON.Vector3.Zero());
}

// special map for the key input
class CyborgMap extends Map {
    constructor() {
        super();
        this.constructor.prototype.increment = function (key) {this.has(key) && this.set(key, Math.min(65535, this.get(key) + 1));}
        this.constructor.prototype.decrement = function (key) {this.has(key) && this.set(key, Math.max(    0, this.get(key) - 1));}
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
        this.ready = false;
    }

    async loadfile() 
    {
        // load meshes from gltf
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.class = this.class;
            // m.setParent(null);
            // m.rotationQuaternion = null;
        });

        // overrides
        await this.generateCollision();
        if (shadowsEnabled) await this.generateShadows();
        if (shadowsEnabled) await this.receiveShadows();
        await this.receivePickable();
        await this.updateMaterials();
        await this.distributeLods();
        return true;
    }

    async createSeperateHitboxes(Issphere) {
        this.modelArray.forEach((m, index) => {
            let _radius = m.getBoundingInfo().boundingSphere.radiusWorld;
            let _mass = Math.pow(_radius, 3);
            this.hitbox = new BABYLON.MeshBuilder.CreateSphere("itemhbs_", {diameter: _radius, segments : 1});
            this.hitbox.position = m.position;
            this.hitbox.physicsImpostor = new BABYLON.PhysicsImpostor(this.hitbox, BABYLON.PhysicsImpostor.SphereImpostor, {mass : _mass, friction : 0.99, restitution : 1.0});
            this.hitbox.isVisible = false;
            this.hitbox.addChild(m);
        });
    }

    // import methods ///////////////////////////////////////////////
    async generateCollision() {
        this.modelArray.forEach((m, index) => { // if you want collision, add it in the BOXs collection in blender, keep it simple, remove the material slot, put it at world origin.
            let realname = m.isAnInstance ? m.name.slice(0, -4) : m.name;
            let box = globalBOX.get(realname);
            if (box != undefined) {
                let boxInstance = m.isAnInstance ? box.clone() : box; // boxes aren't instanced, yet their owners are, so we just clone it, then put it there
                    boxInstance.position = m.position.clone();
                if (m.rotationQuaternion != null) {
                    boxInstance.rotationQuaternion = m.rotationQuaternion.clone();
                } else {
                    boxInstance.rotation = m.rotation.clone();
                } m.physicsImpostor = new BABYLON.PhysicsImpostor(boxInstance, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, this.scene);
            }
            console.log(m.name + (m.isAnInstance ? " instance" : " original"));
        });
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
        this.modelArray.forEach((m, index) => { // this is problematic, changing a material before every import has been made is going to duplicate some materials.
            if (!m.isAnInstance) {
                switch (m.material.id)
                {
                    case "ColorPaletteB":
                        m.material.environmentIntensity = 0.0;
                        m.material.backFaceCulling = true;
                    break;
                    case "TexturePaletteSkycity":
                    case "Pavement":
                        m.material = nodeMaterialSkycity;
                        m.material.backFaceCulling = true;
                    break;
                    case "Fake_Glass":
                        m.material = pbrMateralGlass;
                        m.material.backFaceCulling = true;
                    break;
                    case "LeafPalette":
                        m.material = nodeMaterialLeaf;
                    break;
                    default:
                        m.material.backFaceCulling = true;
                    break;
                } 
            }
        });
    }

    async distributeLods() {
        this.modelArray.forEach((m, index) => {
            let lodmesh = globalLOD.get(m.name);
            if (lodmesh != undefined && !m.isAnInstance) {
                let r = Math.sqrt(1 + 1000 * lodmesh.getBoundingInfo().boundingSphere.radiusWorld);
                m.addLODLevel(r, lodmesh);
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

    update(_camera) {
    }
}

class ImportTerrain extends Import
{
    constructor(_filename, _scene, _shadows, _flags, _class, _func) {
        super(_filename, _scene, _shadows, _flags, _class);
        this.customFunction = _func;
    }

    async loadfile() {
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.class = this.class;
            m.setParent(null);
            m.isPickable = false;
            m.shadowEnabled = true;
            m.receiveShadows = true;
        });
        this.modelArray[0].material = nodeMaterialTerrain;
        //this.modelArray[1].material = nodeMaterialWater;
        this.modelArray[2].material = nodeMaterialWater;
        return true; 
    }
}

class ImportAnimated extends Import
{
    constructor(_filename, _scene, _shadows, _flags, _class, _func) {
        super(_filename, _scene, _shadows, _flags, _class);
        this.customFunction = _func;
    }

    update() {
        super.update();
        this.customFunction(this.modelArray);
    }
}

class BOXImport extends Import
{
    constructor(_filename, _scene, _shadows, _flags, _class) {
        super(_filename, _scene, _shadows, _flags, _class);
    }

    async loadfile() {
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.class = this.class;
            m.setParent(null);
            m.isPickable = false;
            m.shadowEnabled = false;
            globalBOX.set(m.name.slice(0, -4), m);
        });

        this.modelArray.forEach((m, index) => {
            m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, this.scene);
            m.isVisible = false;
            m.material.wireframe = true;
        });
        return true;
    }
}

class LODImport extends Import
{
    constructor(_filename, _scene, _shadows, _flags, _class) {
        super(_filename, _scene, _shadows, _flags, _class);
    }

    async loadfile() {
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.class = this.class;
            m.setParent(null);
            m.isPickable = false;
            m.shadowEnabled = false;
            m.rotationQuaternion = null;
            globalLOD.set(m.name.slice(0, -5), m);
        });
        return true;
    }
}

class RotationArt extends Import
{
    constructor(_filename, _scene, _shadows, _flags, _class) {
        super(_filename, _scene, _shadows, _flags, _class);
        this.texts = [["Muskel","Nierenkörperchen","Blutgefässe","Dünndarm"],["Nebenhoden","Haar Quer","Haar Längs","Haut"],["Hoden","Knochen","Harnleiter","Speiseröhre"],"HistoPopArt"];
        this.rects = new Array();
    }

    update(_camera) {
        super.update(_camera);
        var time = performance.now() * 0.001;
        this.modelArray.forEach((m, index) => {
            m.rotation.y = Math.sin(time + Math.floor(index/2) * 1000);
        });
        this.rects.forEach((m, index) => {
            let mesh = m._linkedMesh;
            let dis = Math.abs(_camera.position.x - mesh.position.x) + Math.abs(_camera.position.y - mesh.position.y) + Math.abs(_camera.position.z - mesh.position.z);
            m.isVisible = dis < 12;
        });
    }

    createLabels() 
    {
        this.modelArray.forEach((m, index) => {
            if (m.material.name == "Histopops") {
                let uvs = m.getVerticesData("uv"); // uses uvs to determine which text is used in the label
                let i = uvs[0] * 4;
                let j = uvs[1] * 4;
                let label = new GUI.TextBlock();
                    label.text = this.texts[i][j];
                let rect = new GUI.Rectangle();
                    rect.width = 0.01 * label.text.length;
                    rect.height = "16px";
                    rect.color = "cyan";
                    rect.background = "black";
                    rect.isVisible = false;
                advancedTexture.addControl(rect);   
                    rect.addControl(label);
                    rect.linkWithMesh(m);
                    rect.linkOffsetY = 40;
                this.rects.push(rect);
            }
        });
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
        return true;
    }

    // methods
    tryStart() 
    {
        if (this.readyState < 0b11111) {
            //return false;
        }

        // change machinestate
        this.machineState = 1;

        // animation
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
    }

    update(_camera) {
        super.update(_camera);
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

// camera
class CameraManager 
{
    constructor() 
    {
        this.mode = "arc";

        this.cameraUni = new BABYLON.UniversalCamera("cameraUni", new BABYLON.Vector3(0, 1, 0), scene);
        this.cameraUni.minZ = 1;
        this.cameraUni.maxZ = 42000;
        this.cameraUni.attachControl(false);
        this.cameraUni.defaults = {minZ:1, maxZ:42000};

        this.cameraArc = new BABYLON.ArcRotateCamera("cameraArc", 0.5, 0.5, 1, BABYLON.Vector3.Zero(), scene, false);
        this.cameraArc.minZ = 1;
        this.cameraArc.panningSensibility = 0;
        this.cameraArc.attachControl(true);
        this.cameraArc.lowerRadiusLimit = 50; 
        this.cameraArc.upperRadiusLimit = 450;
        this.cameraArc.wheelPrecision = 0.2;
        this.cameraArc.defaults = {minZ:1, panningSensibility:0, lowerRadiusLimit:250, upperRadiusLimit:450, wheelPrecision:0.2};

        // defeault start
        this.changeCamera("arc");

        // import paths
        this.camerapaths = undefined;
        this.activeVertices = undefined;
        this.startVertex = undefined;
        this.endVertex = undefined;
        this.arcStep = 0;
        this.cameraPathPosition = new Array();
    }

    async loadPaths() {
        let arr = await BABYLON.SceneLoader.ImportMeshAsync('', cameraUrl, '', this.scene);
        this.camerapaths = arr.meshes[0].getChildMeshes();
        this.camerapaths.forEach((m, index) => {
            m.class = "path";
            m.setParent(null);
            m.isPickable = false;
            m.isVisible = true;
            m.wireframe = true;
        });
        console.log(this.camerapaths);
        return true;
    }

    changeCamera(to, seamless=false, target=undefined, data={}) {
        this.arcStep = 0; 
        this.mode = to;
        scene.activeCamera = this.mode == "uni" ? this.cameraUni : this.cameraArc;
        if (target != undefined) {
            scene.activeCamera.setTarget(target);
        } 
        this.cameraArc.lowerRadiusLimit = data.lowerRadiusLimit ?? 100; 
        this.cameraArc.upperRadiusLimit = data.upperRadiusLimit ?? 150; 
        this.cameraArc.wheelPrecision = data.wheelPrecision ?? 1/100;
    }

    flipCamera(target=undefined) {
        switch (this.mode) {
            case "arc": this.mode = "uni"; break;
            case "uni": this.mode = "arc"; break;
        } changeCamera(this.mode, target);
    }

    update()
    {
        switch (this.mode) 
        {
            case "arc":

            break;
            case "unimove": // update lerp

                this.arcStep += 0.1;

                // position
                let pos1 = this.cameraPathPosition[Math.ceil(this.arcStep)];
                let pos2 = this.cameraPathPosition[Math.floor(this.arcStep)+2];

                let tar1 = this.cameraPathPosition[Math.ceil(this.arcStep)+5];
                let tar2 = this.cameraPathPosition[Math.floor(this.arcStep)+7];
                let alpha = this.arcStep % 1;

                let position = new BABYLON.Vector3(Math.lerp(pos1.x, pos2.x, alpha), Math.lerp(pos1.y, pos2.y, alpha), Math.lerp(pos1.z, pos2.z, alpha));
                let rotation = new BABYLON.Vector3(Math.lerp(tar1.x, tar2.x, alpha), Math.lerp(tar1.y, tar2.y, alpha), Math.lerp(tar1.z, tar2.z, alpha));

                this.cameraUni.position = position;
                this.cameraUni.setTarget(rotation);
                
                if (this.arcStep-1 >= this.endStep) {
                    this.mode = "arc";
                }

            break;
            case "uni":
                
            break;
        }
    }
    
    isBriefingActive() {
        return Math.round(this.arcStep) != this.arcStep;
    }

    activateCameraFlight(mesh=this.camerapaths[0]) 
    {
        if (this.isBriefingActive()) {
            return false;
        }

        // figure out points from mesh
        this.activeVertices = mesh._getPositionData();
        console.log(this.cameraArc);
        scene.activeCamera = this.cameraUni;
        this.mode = "unimove";
        this.arcStep = 0;
        this.startVertex = 0;
        this.endVertex = this.activeVertices.length;

        // translate positions
        let m = 0;
        for (let n = 0; n < this.endVertex; n += 3) {
            this.cameraPathPosition[m++] = new BABYLON.Vector3(this.activeVertices[n], this.activeVertices[n+1], this.activeVertices[n+2]);
        }

        return true;
    }
}

// player
class Avatar extends BABYLON.Mesh 
{
    constructor(scene, cameraMan, spawn) 
    {
        super("Avatar", scene);
        this.root = new BABYLON.MeshBuilder.CreateSphere("avatar-root", {diameter : 1.0, segments : 1});
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
        this.myCamera = scene.activeCamera;

        // state machine
        this.state = "free";
        this.chair = undefined;
        this.inspector = undefined;

        // apply camera
        // camera.setTarget(this.absolutePosition);
        this.camHeight = 1.0;

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
        this.raycastPreviousMesh = undefined;
        this.raycastPreview = undefined;

        // inventory
        this.inventory = new Inventory(8,8);
        this.inventory.close();
        this.handInvPosition = new BABYLON.Vector3(engine.getRenderWidth() * 0.50, engine.getRenderHeight() * 0.90, 0.99);
        this.uiTexture1 = new BABYLON.Texture(uiTex1);

        let xc = engine.getRenderWidth() * 0.50;
        let yb = engine.getRenderHeight();

        this.ui = new GUI.Rectangle("asd");//xc-138, yb-142, xc+138, yb);
        this.ui.width = 277 / engine.getRenderWidth();
        this.ui.height = 142 / engine.getRenderHeight();
        this.ui.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.ui.color = "cyan";
        this.ui.background = "black";
        this.ui.renderingGroupId = 0;
        advancedTexture.addControl(this.ui);
    }

    update() 
    {
        // update camera
        //this.myCamera.position.x = Math.lerp(this.myCamera.position.x, this.root.position.x, 0.4);
        //this.myCamera.position.z = Math.lerp(this.myCamera.position.z, this.root.position.z, 0.4);
        //this.myCamera.position.y = Math.lerp(this.myCamera.position.y, this.root.position.y + this.camHeight, 0.4);

        // set rotation to camera, inputs
        this.root.rotation.xz = this.myCamera.rotation.xz;
        let vmult = keyPressed("w") - keyPressed("s");
        let hmult = keyPressed("a") - keyPressed("d");
        let input_action1 = keyPressed("f");
        let input_action2 = keyPressed("q");
        let input_jump = keyPressed(" ");
        let invtoggle = keyPressed("e");
        let pi = scene.pick(scene.pointerX, scene.pointerY);

        if (invtoggle) {
            this.inventory.toggle();
        }

        this.hover(pi);

        switch (this.state)
        {
            case "free":

                // move jump freely
                this.camHeight = 1.0;
                this.speed.x = lengthdir_x(vmult * this.moveSpeed, this.myCamera.rotation.y) + lengthdir_x(hmult * this.moveSpeed, this.myCamera.rotation.y - Math.PI/2);
                this.speed.z = lengthdir_z(vmult * this.moveSpeed, this.myCamera.rotation.y) + lengthdir_z(hmult * this.moveSpeed, this.myCamera.rotation.y - Math.PI/2);
                if (input_jump) this.jump();

                // interaction
                
                if (input_action1) {
                    this.action(pi);
                } else {
                    if (input_action2) {
                        this.drop();
                    }
                }

                // sitting
                if (this.chair != undefined) 
                {
                    // teleport to chair
                    this.camHeight = 0.5;
                    this.speed = BABYLON.Vector3.Zero();
                    this.root.position = this.chair.position.clone();

                    // get up
                    if (input_action2 || input_jump) {
                        this.chair = undefined;
                        this.root.physicsImpostor._physicsBody.wakeUp();
                    }
                }

            break;
            case "inspect":

                if (input_action2) {
                    this.state = "free";
                    this.inspector = undefined;
                    scene.activeCamera = this.myCamera;
                }

            break;
        }

        // reduce speed
        this.speed = BABYLON.Vector3.Lerp(this.speed, BABYLON.Vector3.Zero(), 0.10);
        this.root.physicsImpostor._physicsBody.velocity.x = this.speed.x;
        this.root.physicsImpostor._physicsBody.velocity.z = this.speed.z;
    
        // auto update
        this.updateHeld();
        this.updateRay(pi);
    }

    jump() {
        this.root.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, this.jumpSpeed, 0), this.root.absolutePosition);
    }

    updateRay(pickinfo) 
    {
        this.raycastIsNear = false;
        if (pickinfo != undefined) 
        {
            if (pickinfo.pickedMesh != null) 
            {
                this.raycast.hitId = pickinfo.pickedMesh;
                this.raycast.position = pickinfo.pickedPoint;
                this.raycastInvalid.position = pickinfo.pickedPoint;
                var dis = BABYLON.Vector3.Distance(pickinfo.pickedPoint, this.myCamera.position);
                var scd1 = this.state == "inspect" ? 0.0 + dis * 0.3 : 1.0 + dis * 0.2;
                var scd2 = this.state == "inspect" ? 0.0             : 0.0 + dis * 0.6;
                this.raycast.scalingDeterminant = 10.0;
                //this.raycastInvalid.scalingDeterminant = scd2;
                this.raycastIsNear = (scd1 > scd2);
            } 
        }
    }

    updateHeld() 
    {
        // designate hand position
        this.handPosition.x = this.myCamera.position.x + lengthdir_x(2.5, this.myCamera.rotation.y);
        this.handPosition.y = this.myCamera.position.y - 0.6;
        this.handPosition.z = this.myCamera.position.z + lengthdir_z(2.5, this.myCamera.rotation.y);

        // overide hand position if inventory is open
        if (this.inventory.grid.isVisible) 
        {
            var coordinates = BABYLON.Vector3.Unproject(this.handInvPosition, engine.getRenderWidth(), engine.getRenderHeight(), BABYLON.Matrix.Identity(), scene.getViewMatrix(), scene.getProjectionMatrix());
            this.handPosition.x = coordinates.x;
            this.handPosition.y = coordinates.y;
            this.handPosition.z = coordinates.z;
        }

        // set item position there
        if (this.heldItem != undefined) {
            this.heldItem.parent._position = this.handPosition;
        }
    }

    hover(pickinfo)
    {
        if (pickinfo == undefined || pickinfo.pickedMesh == undefined || this.raycastPreviousMesh == pickinfo.pickedMesh) {
            return;
        }

        // clear and copy geometry
        if (this.raycastPreview != undefined) {
            this.raycastPreview.dispose();
        }
        switch (pickinfo.pickedMesh.class)
        {
            case "world":
            case "item":
            case "interior":
            case "devilmachine":
                // console.log(pickinfo.pickedMesh.parent.class); 
                let sourceMeshInstance = pickinfo.pickedMesh;
                let sourceMesh = pickinfo.pickedMesh;
                if (sourceMesh.isAnInstance) 
                {
                    // find source
                    this.raycastPreview = sourceMesh._sourceMesh.clone("previewclone");
                    this.raycastPreview.class = "preview";
                    
                    
                    // copy position / rotation
                    this.raycastPreview.position = sourceMeshInstance.position;
                    if (sourceMeshInstance.rotationQuaternion != null) {
                        this.raycastPreview.rotationQuaternion = sourceMeshInstance.rotationQuaternion.clone();
                    } else {
                        this.raycastPreview.rotation = sourceMeshInstance.rotation.clone();
                    }
                } 
                else 
                {
                    // copy
                    while (sourceMesh.parent != null && sourceMesh.parent.id != "__root__") {
                        sourceMesh = sourceMesh.parent;
                    }
                    this.raycastPreview = sourceMesh.clone("previewclone");
                    this.raycastPreview.class = "preview";
                    console.log(this.raycast);
                }

                // update previous
                this.raycastPreview.isPickable = false;
                this.raycastPreview.material = RCM;
                this.raycastPreviousMesh = pickinfo.pickedMesh;

            break;
            case "terrain": // don't do that here please, that sounds awful
            case "foliage":

            break;
        }
        
    }

    action(pickinfo) 
    {
        // handle raycast pickedMesh
        console.log(pickinfo);
        if (pickinfo == undefined || pickinfo.pickedMesh == undefined) {// || !player.raycastIsNear) {
            return;
        }

        console.log("picked " + pickinfo.pickedMesh.name);
        console.log("class " + pickinfo.pickedMesh.class);
        let realname = pickinfo.pickedMesh.isAnInstance ? pickinfo.pickedMesh.name.slice(0, -4) : pickinfo.pickedMesh.name;

        switch (pickinfo.pickedMesh.class)
        {
            case "world":
                cameraManager.activateCameraFlight();
            break;
            case "skycity":

            break;
            case "foliage":

            break;
            case "devilmachine":

                // make sure to remove hover clones before an animation

                this.inspect(pickinfo.pickedMesh);
                console.log(devilmachine);
                devilmachine.tryStart();
                switch (realname)
                {
                    case "DisplayMain":
                        devilmachine.tryStart();
                    break;
                    case "dms_schlitten":

                    break;
                }
            break;
            case "item":
                this.pickup(pickinfo.pickedMesh);
            break;
            case "interior":
                
                switch (realname)
                {
                    case "Chairstool":
                    case "SM_Chair":
                        this.chair = pickinfo.pickedMesh;
                        this.root.physicsImpostor._physicsBody.sleep();
                    break;
                    case "SM_Centrifuge":
                    case "SM_AnalyticalBalance":
                    case "SM_Distiller":
                    case "SM_Microscope":
                    case "SM_VortexMixer":
                    case "SM_Monitor":
                    case "SM_Monitor_Large":
                    case "SM_Dissecator":
                    case "Surfdisplay":
                        this.inspect(pickinfo.pickedMesh);
                    break;
                }
            break;
        }
    }

    inspect(mesh) 
    {
        this.state = "free";
        this.inspector = mesh;
        let r = mesh.getBoundingInfo().boundingSphere.radiusWorld;
        let data = {minZ:0.01, lowerRadiusLimit:5, upperRadiusLimit:15, wheelPrecision:100/r};
        cameraManager.changeCamera("arc", true, mesh, data);

        /*
        if (inspectorCamera == undefined) {
            inspectorCamera = new BABYLON.ArcRotateCamera("inscam", 0, 0, 1, BABYLON.Vector3.Zero(), scene, false);
            inspectorCamera.minZ = 0.01;
            inspectorCamera.panningSensibility = 0;
            inspectorCamera.attachControl(true);
        }
        inspectorCamera.setTarget(mesh.position.clone());
        inspectorCamera.position = this.myCamera.position.clone();
        inspectorCamera.lowerRadiusLimit = 1.5 * r; 
        inspectorCamera.upperRadiusLimit = 4.0 * r;
        inspectorCamera.wheelPrecision = 100.0 / r;
        scene.activeCamera = inspectorCamera;*/
    }

    pickup(mesh) { 
        if (this.heldItem != undefined) {
            this.drop();
        }
        this.heldItem = mesh;
        mesh._parentNode.picked = true;
        mesh._parentNode.isPickable = false;
        mesh._parentNode.physicsImpostor.sleep();
        mesh.renderingGroupId = 1;
        console.log("picked up item");
    }

    drop() {
        if (this.heldItem != undefined) {
            this.heldItem._parentNode.picked = false;
            this.heldItem._parentNode.isPickable = true;
            this.heldItem._parentNode.physicsImpostor.wakeUp();
            this.heldItem.renderingGroupId = 0;
            this.heldItem = undefined;
            console.log("dropped item");
        }
    }
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
    // scene.debugLayer.show();
    scene.pointerMovePredicate = () => false;
    scene.pointerDownPredicate = () => false;
    scene.pointerUpPredicate = () => false;

    //scene.enablePhysics(new BABYLON.Vector3(0,-12,0)); // physics engine
    scene.skipFrustumCulling = false
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
const shadowsEnabled = true;/*
const camera = new BABYLON.UniversalCamera("MyCamera", new BABYLON.Vector3(0, 1, 0), scene);
    camera.minZ = 1;
    camera.maxZ = 42000;
    camera.attachControl(true);
var inspectorCamera = undefined;*/
const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
const utillayer = new BABYLON.UtilityLayerRenderer(scene);
const instrumentation = new BABYLON.SceneInstrumentation(scene);
    instrumentation.captureRenderTime = true;/*
const worldCamera = new BABYLON.ArcRotateCamera("worldcam", 0.5, 0.5, 1, BABYLON.Vector3.Zero(), scene, false);
    worldCamera.minZ = 1;
    worldCamera.panningSensibility = 0;
    worldCamera.attachControl(true);
    worldCamera.lowerRadiusLimit = 250; 
    worldCamera.upperRadiusLimit = 450;
    worldCamera.wheelPrecision = 0.2;*/
const cameraManager = new CameraManager();
await cameraManager.loadPaths();

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
    pbrMateralGlass.freeze();
const RCM = new BABYLON.StandardMaterial("raycastMat", scene);
    RCM.emissiveColor = new BABYLON.Color3(0.2,0.2,0);
// node materials
const nodeMaterialBase = BABYLON.NodeMaterial.Parse(nodeMaterialBaseUrl1, scene);
    nodeMaterialBase.backFaceCulling = true; 
    nodeMaterialBase.freeze();
const nodeMaterialTerrain = BABYLON.NodeMaterial.Parse(nodeMaterialTerrainUrl, scene);
    nodeMaterialTerrain.backFaceCulling = true; 
    nodeMaterialTerrain.freeze();
const nodeMaterialWater = BABYLON.NodeMaterial.Parse(nodeMaterialWaterUrl, scene);
    nodeMaterialWater.backFaceCulling = true; 
    nodeMaterialWater.freeze();
const nodeMaterialSkycity = BABYLON.NodeMaterial.Parse(nodeMaterialBaseUrl2, scene);
    nodeMaterialSkycity.backFaceCulling = true; 
    nodeMaterialSkycity.freeze();
const nodeMaterialTree = BABYLON.NodeMaterial.Parse(nodeMaterialBaseTree, scene);
    //nodeMaterialTree.freeze();
const nodeMaterialLeaf = BABYLON.NodeMaterial.Parse(nodeMaterialBaseLeaf, scene);
    nodeMaterialLeaf.backFaceCulling = false;
    nodeMaterialLeaf.freeze();

// global variables
const divFps = document.getElementById("fps");
const divDrawCalls = document.getElementById("drawcalls");
const player = new Avatar(scene, cameraManager, BABYLON.Vector3.Zero());

// GUI


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
    
    // camera to player position, and rotation, held items
    player.update();

    // other shit
    if (devilmachine.ready) {
        //devilmachine.update(camera);
    }

    // histo art
    if (histos.ready) {
        histos.update(camera);
    }

    if (logos.ready) {
        logos.update();
    }

    // update cameras
    cameraManager.update();
});

// start game !!! final order !!!
startGame();


import * as BABYLON from '@babylonjs/core';


class Item extends BABYLON.Mesh
{
  constructor(_meshcaller) 
  {
    super();
    let _radius = _meshcaller.getBoundingInfo().boundingSphere.radiusWorld;
    let _mass = Math.pow(_radius, 3);
    this.hitbox = new BABYLON.MeshBuilder.CreateSphere("item_", {diameter: _radius, segments : 2});
    this.hitbox.position = _meshcaller.position;
    this.hitbox.physicsImpostor = new BABYLON.PhysicsImpostor(this.hitbox, BABYLON.PhysicsImpostor.SphereImpostor, {mass : _mass, friction : 0.9, restitution : 1.0});
    this.hitbox.isVisible = false;
    this.hitbox.collisionsEnabled = true;
    this.hitbox.addChild(_meshcaller);
  }
}

export {Item};


import * as GUI from '@babylonjs/gui';

class Invbox 
{
    constructor(_id=undefined, _amt=0) 
    {
        this.item_id = _id;
        this.item_amount = _amt;
        this.rectangle = new GUI.Rectangle("r");
        this.rectangle.width = 64;
        this.rectangle.height = 64;
    }

    drawBox(_x, _y) {
        
    }
    drawItem() {

    }
    drawAmount() {

    }
}

class Inventory 
{
    constructor(_rows=4, _cols=4) 
    {
        var adv = GUI.AdvancedDynamicTexture.CreateFullscreenUI("adv");
        this.contents = new Array(_rows * _cols);
        for (let n = 0; n < _rows * _cols; n++) {
            this.contents[n] = new Invbox();
        }

        this.rows = _rows;
        this.columns = _cols;
        this.grid = new GUI.Grid("grid");
        this.grid.width = "50%";
        this.grid.height = "50%";
        this.grid.alpha = 0.4;
        this.grid.isVisible = false;

        for (let i = 0; i < _rows; i++) this.grid.addRowDefinition(1/_rows);
        for (let j = 0; j < _cols; j++) this.grid.addColumnDefinition(1/_cols);

        adv.addControl(this.grid);

        for (let i = 0; i < _rows; i++) {
        for (let j = 0; j < _cols; j++) {
            var rc= new GUI.Rectangle("rc"+i+j);
                rc.width = "100%";
                rc.height = "100%";
            this.grid.addControl(rc, i, j);
        }}
    }

    toggle() {
        this.grid.isVisible = !this.grid.isVisible;
    }

    open() {
        this.grid.isVisible = true;
    }

    close() {
        this.grid.isVisible = false;
    }

    draw() {
        this.contents.forEach((element, index) => {
            element.drawBox();
        });
        this.contents.forEach((element, index) => {
            element.drawItem();
        });
        this.contents.forEach((element, index) => {
            element.drawAmount();
        });
    }
}

export {Inventory};

import {Meshbuilder} from '@babylonjs/core';
import {clamp, lengthdir_x, lengthdir_y, lengthdir_z, point_distance, point_direction, irandom_range, lerp} from "./util.js"; 

class Avatar extends BABYLON.Mesh 
{
  constructor(scene, camera, spawn=BABYLON.Vector3.Zero(), ydir=0)
  {
    super("avatar", scene);
    this.spawnPosition = spawn;
    this.camera = camera;
    this.base = new BABYLON.MeshBuilder.CreateSphere("player", {diameter : 1.0, segments : 8});
    this.base.isPickable = false;
    this.base.position = this.spawnPosition;
    this.base.physicsImpostor = new BABYLON.PhysicsImpostor(this.base, BABYLON.PhysicsImpostor.SphereImpostor, {mass : 1.0, friction : 0.2, restitution : 0.0});
    this.base.physicsImpostor._physicsBody.inertia = BABYLON.Vector3.Zero();
    this.moveSpeed = 6.7;
    this.jumpSpeed = 1.2;
    this.xspd = 0;
    this.yspd = 0;
    this.zspd = 0;
    this.heldItem = undefined;

    // update this.camera
    this.camera.setTarget(this.base.position);
    this.camera.rotation.x = 0.0;
    this.camera.rotation.y = ydir;
  }

  update() 
  {
    let vmult = canPressKey("w") - canPressKey("s");
    let hmult = canPressKey("a") - canPressKey("d");

    if (keyPressed.get("c")) 
    {
      let spd = 0.2;
      this.camera.position.x += lengthdir_x(vmult * spd, this.camera.rotation.y) + lengthdir_x(hmult * spd, this.camera.rotation.y - Math.PI/2);
      this.camera.position.z += lengthdir_z(vmult * spd, this.camera.rotation.y) + lengthdir_z(hmult * spd, this.camera.rotation.y - Math.PI/2);
      this.camera.position.y += lengthdir_y(vmult * spd, this.camera.rotation.x);
    } 
    else
    {
      // this.camera position
      this.camera.position.x = lerp(this.camera.position.x, this.base.position.x, 0.4);
      this.camera.position.z = lerp(this.camera.position.z, this.base.position.z, 0.4);
      this.camera.position.y = lerp(this.camera.position.y, Math.max(this.base.position.y + 1.0, -10), 0.4);
      if (this.camera.position.y == -10) {
        this.camera.setTarget(this.base.position);
      } else this.base.rotation.xz = this.camera.rotation.xz;

      // moving
      this.xspd = lengthdir_x(vmult * this.moveSpeed, this.camera.rotation.y) + lengthdir_x(hmult * this.moveSpeed, this.camera.rotation.y - Math.PI/2);
      this.zspd = lengthdir_z(vmult * this.moveSpeed, this.camera.rotation.y) + lengthdir_z(hmult * this.moveSpeed, this.camera.rotation.y - Math.PI/2);

      this.base.physicsImpostor._physicsBody.velocity.x = this.xspd;
      this.base.physicsImpostor._physicsBody.velocity.z = this.zspd;

      // jumping
      if (keyPressed.get(" ")) {
        this.base.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, this.jumpSpeed, 0), this.base.absolutePosition);
      }
    }

    // out of bounds
    if (this.base.position.y < -40) {
      this.base.position = this.spawnPosition;
      this.base.physicsImpostor._physicsBody.velocity.y = 0;
    }
  }

  interact(raycastHitId)
  {
    // failsafe
    if (raycastHitId == undefined) {
      return false;
    }

    // is it an item?
    let hasParent = raycastHitId._parentNode != null;
    if (hasParent && raycastHitId._parentNode.id.includes("item")) {
      return this.pickupItem(raycastHitId);
    }

    // something else
    switch (raycastHitId.id) 
    {
      case undefined: 
      case null:

      break;
      case "CylinderRight":
      case "CylinderRight.001":
        if (this.heldItem != undefined) {
          if (this.heldItem.itemName == "Cylinder") {
            this.putInItem(raycastHitId);
          }
        }
      break;
    }
  }

  canPickItem(item) {
    return this.heldItem == undefined && !item._parentNode.picked && item._parentNode.isPickable;
  }

  pickupItem(item) 
  {
    if (!this.canPickItem(item)) {
      return false;
    }

    item._parentNode.picked = true;
    item._parentNode.isPickable = false;
    item._parentNode.physicsImpostor.sleep();
    this.heldItem = item._parentNode;
  }

  dropItem() 
  {
    if (this.heldItem == undefined) {
      return false;
    }

    this.heldItem.picked = false;
    this.heldItem.isPickable = true;
    this.heldItem.physicsImpostor.wakeUp();
    this.heldItem = undefined;
  }

  putInItem(mesh) 
  {
    if (this.heldItem == undefined || mesh == undefined) {
      return false;
    }

    var rotation = BABYLON.Quaternion.Identity();
    var position = BABYLON.Vector3.Zero();
    
    mesh.getWorldMatrix().decompose(BABYLON.Vector3.Zero(), rotation, position);
    if (mesh.rotationQuaternion) {
      this.heldItem.rotationQuaternion.copyFrom(rotation);
    } 
    this.heldItem.position = mesh.absolutePosition;
    this.heldItem.picked = false;
    this.heldItem.isPickable = false;
    this.heldItem.physicsImpostor.dispose(); // deletes physics actor
    this.heldItem = undefined;
  }
}

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

  write(hitId, hitPos) {
    this.indicatorPoint.hitId = hitId;
    this.indicatorPoint.position = hitPos;
  }

  read() {
    return [this.indicatorPoint.hitId, this.indicatorPoint.position]; 
  }

  show() {
    console.log(read());
  }
}



export {Avatar, Raycast};

/*

      // individual selection function
      switch (selectedMesh.id)
      {
        case "Press":

          break;
        case "Weight":
          Weight.force = Math.min(Weight.force + 200, 2000);
          break;
        case "Pointer":

          break;
        case "Spindel":
          Spindel.target = !Spindel.target;
          break;
        case "Gauge_primitive0":
        case "Gauge_primitive1":
          break
        case "CapTop":
        case "CapBot":
          if (!Cap.on) {
            let vec = Cap.meshes[1].originalPosition;
            Cap.meshes[0].position.x += Base.mesh.position.x - vec.x;
            Cap.meshes[0].position.y += Base.mesh.position.y - vec.y;
            Cap.meshes[0].position.z += Base.mesh.position.z - vec.z;
            Cap.meshes[1].position.x += Base.mesh.position.x - vec.x;
            Cap.meshes[1].position.y += Base.mesh.position.y - vec.y;
            Cap.meshes[1].position.z += Base.mesh.position.z - vec.z;
            Cap.on = true;
            Spindel.maxDistance = 0.114;
          } else {
            Cap.meshes[0].position.x = Cap.meshes[0].originalPosition.x;
            Cap.meshes[0].position.y = Cap.meshes[0].originalPosition.y;
            Cap.meshes[0].position.z = Cap.meshes[0].originalPosition.z;
            Cap.meshes[1].position.x = Cap.meshes[1].originalPosition.x;
            Cap.meshes[1].position.y = Cap.meshes[1].originalPosition.y;
            Cap.meshes[1].position.z = Cap.meshes[1].originalPosition.z;
            Cap.on = false;
            Spindel.maxDistance = 0.118;
          } 
        break;
      }

      // give selected mesh an indicator that it's selected
      for (let n = 1; n < press.length; n++) {
        let m = press[n];
        if (m != selectedMesh) {
          m.highligthed = false;
          //m.material.emissiveColor = deselectedColor;
        } else {
          m.highligthed = true;
          //m.material.emissiveColor = selectedColor;
        }
      }
      
      
      // update press
      // Spindel
      if (Spindel.current < Spindel.target) {
        Spindel.current = Math.min(Spindel.current + 0.01, Spindel.target)
      }
      else
      if (Spindel.current > Spindel.target) {
        Spindel.current = Math.max(Spindel.current - 0.01, Spindel.target)
      }

      Spindel.mesh.position.y = lerp(0, -Spindel.maxDistance, Spindel.current);
      Spindel.mesh.rotation.y += Math.sign(Spindel.current - Spindel.target) * 0.3;

      // pressure induced by Base pressing against Spindel
      Base.ytarget = Base.ystart + Weight.force / 10000;
      Base.mesh.position.y = lerp(Base.ytarget, Base.mesh.position.y, 0.97)
      Base.mesh.position.y = Math.min(Base.mesh.position.y, Spindel.mesh.position.y);

      // overpressure
      let distance = Math.max(0, Base.ytarget - Spindel.mesh.position.y);
      let overpressure = Base.mesh.position.y == Spindel.mesh.position.y ? distance : 0;

      // weight
      Weight.force = Math.max(0, Math.floor(Weight.force / 1.2));
      Weight.mesh.rotation.z = Math.PI - Math.min(Weight.force / 1000, Math.PI/12);

      // pointer
      Gauge.pointer.mesh.rotation.x = -Math.PI/(4) - (overpressure * 30);
      */
// PRESS
// allowed rotations

/*
var Spindel = {
  mesh : undefined,
  selected : false,
  current : 0,
  target : 0,
  maxDistance : 0.118,
};

var Gauge = {
  meshes : new Array(),
  pointer : {
    mesh : undefined,
  },
  selected : false,
  forceSpike : 0,
}; 

var Base = {
  mesh : undefined,
  y : 0,
  ystart : 0,
  ytarget : 0,
}

var Weight = {
  mesh : undefined,
  force : 0,
  base_x_rotation : 0,
};

var Press = {
  mesh : undefined,
}

var Cap = {
  meshes : new Array(),
  on : false,
}

const deselectedColor = new BABYLON.Color3(0.00,0.00,0.00);
var press = undefined;
BABYLON.SceneLoader.ImportMesh('', 'content/', 'Presse.gltf', scene, function(meshes, particleSyetems, skeletons, animationGroups) { 
  press = meshes;
  for (let n1 = 1; n1 < meshes.length; n1++) 
  {
    let m = meshes[n1];
        m.isPickable = true;
        m.setParent(null);
        m.receiveShadows = true;
        m.material.emissiveColor = deselectedColor;
        m.originalPosition = new BABYLON.Vector3(0,0,0);
        m.originalPosition.copyFrom(m.position);

    shadowGenerator.getShadowMap().renderList.push(m);

    switch (m.id)
    {
      case "Press":
        Press.mesh = m;
      break;
      case "Weight":
        Weight.mesh = m;
        m.rotationQuaternion.toEulerAnglesToRef(m.rotation);
        m.rotationQuaternion = null;
      break;
      case "Pointer":
        Gauge.pointer.mesh = m;
        m.rotationQuaternion.toEulerAnglesToRef(m.rotation);
        m.rotationQuaternion = null;
      break;
      case "Spindel":
        Spindel.mesh = m;
        m.rotationQuaternion.toEulerAnglesToRef(m.rotation);
        m.rotationQuaternion = null;
      break;
      case "Gauge_primitive0":
      case "Gauge_primitive1":
        Gauge.meshes.push(m);
      break
      case "Base":
        Base.mesh = m;
        Base.ystart = m.position.y;
      break
      case "CapTop":
      case "CapBot":
        Cap.meshes.push(m);
      break;
    }
  } 
  loadedHas.add("press");
});*/

/*
const camera = new BABYLON.ArcRotateCamera("MyCamera", -2, 1.1, 0.8, new BABYLON.Vector3(0, 0, 0), scene);
      camera.minZ = 0.1;
      camera.attachControl(canvas, true);
      camera.speed = 0.05;
      camera.angularSpeed = 0.05;
      camera.angle = Math.PI/2;
      camera.direction = new BABYLON.Vector3(Math.cos(camera.angle), 0, Math.sin(camera.angle));
      camera.position.y = .2;
      camera.position.x = -.4;
      camera.position.z = -.4;
      camera.inputs.remove(camera.inputs.attached.mousewheel);
const camera2 = new BABYLON.ArcRotateCamera("gaugeCamera", -Math.PI*(1/2), Math.PI*(1/2), 0.1, new BABYLON.Vector3(-0.0, -0.12, -0.2), scene);
      camera.viewport =  new BABYLON.Viewport(0.0, 0.4, 1.0, 0.6);
      camera2.viewport = new BABYLON.Viewport(0.0, 0.0, 1.0, 0.4);
      camera2.minZ = 0.02;
scene.activeCameras.push(camera2);
scene.activeCameras.push(camera);*/
      