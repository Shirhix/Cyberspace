
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import {clamp, lengthdir_x, lengthdir_y, lengthdir_z, point_distance, point_direction, irandom_range, lerp, rlerp} from "./util.js"; 
import {Item} from "./item.js";

// this class is used for gltf imports, it can be extended for individualized functionality
class Import 
{
    constructor(_scn, _csm, _filename, _scast=false, _sreceive=false, _pickable=false, _hasCollision=false) 
    {
        this.scene = _scn;
        this.shadowCaster = _csm;
        this.filename = _filename;
        this.castsShadows = _scast;
        this.receiveShadows = _sreceive;
        this.isPickable = _pickable;
        this.hasCollision = _hasCollision;
        this.componentArray = undefined;
        this.animatorsNames = new Set();
        this.animatorsMeshes = new Map();
    }
    
    // do some universal stuff
    async load(_ctype) {
        
        // this gives you an array with all meshes, meshes are divided by geometry and material
        this.componentArray = await this.loadModel();
        var scn = this.scene;
        var csm = this.shadowCaster;

        // pass classtype
        if (_ctype != undefined) {
            this.componentArray.meshArray.forEach(m => {
                m.classType = _ctype;
            });
        }

        // collision handling
        if (this.hasCollision) {
            this.componentArray.meshArray.forEach(m => {
                m.checkCollisions = true;
                m.setParent(null);
                m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, scn);
            });
        }

        // a tree shouldn't be targetable by the raycast (because extreme lag)
        if (!this.isPickable) {
            this.componentArray.meshArray.forEach(m => {
                m.isPickable = false;
            });
        }

        // receive shadows
        if (this.receiveShadows) {
            this.componentArray.meshArray.forEach(m => {
                if (m.material.alpha == 1) {
                    m.receiveShadows = true;
                }
            });
        }
        
        // cast shadows
        if (this.castsShadows) {
            this.componentArray.meshArray.forEach(m => {
                if (m.material.alpha == 1) {
                    csm.addShadowCaster(m);
                }
            });
        } 
        
        // material override
        await overrideMaterials(this.componentArray.meshArray, scn);
        return false;
    }

    // load gltf
    async loadModel() {
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', 'content/', this.filename, this.scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        return {root: env, meshArray: allMeshes};
    }

    // called after render
    update(_cam, _plr, _item) {
        
    }

    // use this to register meshes to be used in static animations
    registerAnimators() {
        var set = this.animatorsNames;
        var map = this.animatorsMeshes;
        this.componentArray.meshArray.forEach(mesh => {
            if (set.has(mesh.name)) {
                map.set(mesh.name, mesh);
            }
        });
    }

    // register the static animations
    registerAnimation(name, frames, what) 
    {
        var anim = new BABYLON.Animation(name + "_" + what, what, 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, false);
            anim.setKeys(frames);
        var mesh = this.animatorsMeshes.get(name);
            mesh.animations.push(anim);
    }

    // play the static animations
    playAnimation(meshname, ind, func=undefined) 
    {
        var mesh = this.animatorsMeshes.get(meshname);
        var anim = mesh.animations[ind];
        var keys = anim.getKeys();
        var len = keys[keys.length-1].frame;
        this.scene.beginDirectAnimation(mesh, [anim], 0, len, false, 1, func, undefined, false);
    }

    // dynamic animations aren't 'played', they handle themselves by re-registering every frame
    // this is very expensive, so use with care
    // unlikely that func gets to do much, since often the animations are cut short
    playDynamicAnimation(name, frames, targetProperty, func=undefined) 
    {
        var mesh = this.animatorsMeshes.get(name);
            mesh.rotationQuaternion = null;
        var anim = new BABYLON.Animation(name + "_" + targetProperty, targetProperty, 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, false);
            anim.setKeys(frames);

        var len = frames[frames.length-1].frame;
        this.scene.beginDirectAnimation(mesh, [anim], 0, len, false, 1, func, undefined, false);
    }

    // check for item existence and a certain name it must have
    canPut(_item, _reqSubString) {
        return _item == undefined ? false : _item.name.includes(_reqSubString); 
    }
}

class Devilmachine extends Import // 100% individual
{
    constructor(_scn, _csm, _file) {
        super(_scn, _csm, _file, true, true, true, false);
        this.meshesTurnTowards = new Array();
        this.machineState = 0;
        this.readyState = 0b00000; // [slide, api, api, cyl, cyl]
        this.animatorsNames = new Set(["dms_schlitten", "dms_schlitten_nano", "dms_magnifier", "dms_pipetierer", "dms_pipetierer2","dms_quadreagenz", "dms_spule_innen_links", "dms_spule_innen_rechts", "dms_spule_aussen_links", "dms_spule_aussen_rechts"]);
    }

    async load(_class) {
        await super.load(_class);
        this.registerDisplays();
        this.registerAnimators();
    }

    update(_cam, _plr, _item) {
        super.update(_cam, _plr, _item);
        this.rotateToCamera(_plr);
    }

    // register moveable meshes
    registerAnimators()
    {
        // run parent event
        super.registerAnimators();

        // now create some animations
        var sledPos = this.animatorsMeshes.get("dms_schlitten").position;
        var magPos = this.animatorsMeshes.get("dms_magnifier").position;
        var pipPos = this.animatorsMeshes.get("dms_pipetierer").position;
        var pip2Pos = this.animatorsMeshes.get("dms_pipetierer2").position;
        var nanoPos = this.animatorsMeshes.get("dms_schlitten_nano").position;
        var quadPos = this.animatorsMeshes.get("dms_quadreagenz").position;
        var centPos = this.animatorsMeshes.get("dms_spule_innen_links").position;
        var cent2Pos = this.animatorsMeshes.get("dms_spule_innen_rechts").position;
        var cent3Pos = this.animatorsMeshes.get("dms_spule_aussen_links").position;
        var cent4Pos = this.animatorsMeshes.get("dms_spule_aussen_rechts").position;

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

    tryStart() 
    {
        // check if the 2 cylinders and 2 apis are present, also make a check for the testtube
        this.readyState = 31;

        // if not, throw an error in the display of the machine
        if (this.readyState < 31 || this.machineState != 0) {
            return false;
        }

        // start machine and animation
        this.machineState = 1;

        // blood sled
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

    // put in 2 cylinders for bitmask [00011]
    putCylinder(_item, side=0) 
    {
        if (!super.canPut(_item, "cylinder")) {
            return false;
        }

        if (side == 0) {
            this.readyState |= 1; 
        } else {
            this.readyState |= 2; 
        }
        
    }

    // put in 2 apis for bitmask [01100]
    putApi(_item) 
    {
        if (!super.canPut(_item, "api")) {
            return false;
        }

        if (this.readyState & 4) {
            this.readyState |= 8; 
        } else 
        if (this.readyState & 8) {
            this.readyState |= 4; 
        }
    }

    // put in a testtube for bitmask [10000]
    putTube(_item) {
        if (!super.canPut(_item, "testtube")) {
            return false;
        }

        this.readyState |= 16;
    }

    registerDisplays()
    {
        var mtt = this.meshesTurnTowards;
        this.componentArray.meshArray.forEach(mesh => {
            if (mesh.id.includes("Terminals")) {
                mesh.rotationQuaternion = null;
                mtt.push(mesh);
            }
        });
    }
    
    rotateToCamera(_plr)
    {
        const minDis = 50;
        this.meshesTurnTowards.forEach(element => {
            var dis = point_distance(element._absolutePosition.x, element._absolutePosition.z, _plr.base.position.x, _plr.base.position.z);
            if (dis < minDis) {
                element.rotation.x = 0.0;
                element.rotation.y = point_direction(element._absolutePosition.x, element._absolutePosition.z, _plr.base.position.x, _plr.base.position.z); // rlerp(element.rotation.y, point_direction(element._absolutePosition.x, element._absolutePosition.z, _plr.base.position.x, _plr.base.position.z), 0.1);
                element.rotation.z = Math.PI;
            }
        });
    }

    // main ablauf
    update() 
    {
        // parent function
        super.update();

    }
}

class ZweiSäulenPresse extends Import
{
    constructor(_scn, _csm, _file) {
        super(_scn, _csm, _file, true, true, true, false);
        this.animatorsNames = new Set(["zsp_press", "zsp_base", "zsp_spindel", "zsp_gauge", "zsp_pointer", "zsp_lever"]);
        this.originalSpindelPos = undefined;
        this.systemPressure = 0.00; // overpressure in psi
        this.spindelState = true;
    }

    async load(_class) {
        await super.load(_class);
        this.registerAnimators();
    }

    update(_cam, _plr, _item) {
        super.update(_cam, _plr, _item);
    }

    registerAnimators() {
        super.registerAnimators();
        this.originalSpindelPos = this.animatorsMeshes.get("zsp_spindel").position;
    }

    // you can screw the Spindel to fix another object on the base
    turnSpindel() 
    {
        var spindelPos = this.animatorsMeshes.get("zsp_spindel").position;
        var spindelRot = this.animatorsMeshes.get("zsp_spindel").rotation;
        var targetPos = this.animatorsMeshes.get("zsp_base").position;
        var dis = Math.abs(spindelPos.y - targetPos.y);
        var osp = this.originalSpindelPos;

        if (this.spindelState) 
        { 
            var frames1 = [
                {frame:        0, value: spindelPos.y},
                {frame: dis * 10, value: targetPos.y},
            ];
            var frames2 = [
                {frame:        0, value: spindelRot.y},
                {frame: dis * 10, value: spindelRot.y + 30},
            ];
        } 
        else 
        {
            var frames1 = [
                {frame:        0, value: spindelPos.y},
                {frame: dis * 10, value: osp.y},
            ];
            var frames2 = [
                {frame:        0, value: spindelRot.y},
                {frame: dis * 10, value: spindelRot.y - 30},
            ];
        }

        this.spindelState = !this.spindelState;
        super.playDynamicAnimation("zsp_spindel", frames1, "position.y", undefined);
        super.playDynamicAnimation("zsp_spindel", frames2, "rotation.y", undefined);
    }

    // you can press on the pump to increase the pressure in the system, 
    // this will push the base upwards if it's not stopped by the Spindel
    // if the base is met with resistance, it will indicate the pressure on the gauge 
    // you can also release the pressure
    pump(release=false) 
    {
        // initially you can pump .2 psi, decreasing with the pressure in the system
        var pumpAttemptPressure = 1.50; // psi

        var basePos = this.animatorsMeshes.get("zsp_base").position;
        var spindelPos = this.animatorsMeshes.get("zsp_spindel").position;

        var dis = spindelPos.y - basePos.y; // should be positive
        if (!release) { // increase
            var frames1 = [
                {frame:  0, value: basePos.y},
                {frame: 10, value: basePos.y + Math.min(dis, pumpAttemptPressure * 0.10)},
            ];
        } else { // decrease
            
        }

        super.playDynamicAnimation("zsp_spindel", frames1, "position.y", undefined);
    }
}

class City extends Import // both medilab and skycity
{
    constructor(_scn, _csm, _file) {
        super(_scn, _csm, _file, true, true, true, true);
    }
    async load(_class) {
        await super.load(_class);
    }
}

class Foliage extends Import // things that can't be touched
{
    constructor(_scn, _csm, _file) {
        super(_scn, _csm, _file, true, true, false, false);
    }
    async load(_class) {
        await super.load(_class);
    }
}

class Interior extends Import // streamlined objects with all the same methods
{
    constructor(_scn, _csm, _file) {
        super(_scn, _csm, _file, true, true, true, false);
    }
    async load(_class) {
        await super.load(_class);
    }
}

// this is an import class and has nothing to do with the actual items
class Items extends Import
{
    constructor(_scn, _csm, _file) {
        super(_scn, _csm, _file, true, true, true, false); // collisions are overriden
    }

    async load(_class) 
    {
        await super.load(_class);
        this.componentArray.meshArray.forEach(m => 
        {
            m.position = BABYLON.Vector3.Zero();
            m.collisionsEnabled = false;
            m.isPickable = true;
            m.receiveShadows = true;
            var hb = new Item(m);
            m.setParent(hb.hitbox);
        });
    }
}

async function overrideMaterials(meshArray, _scn, _bfc=true) 
{
    // materials
    const selectedColor = new BABYLON.Color3(0.1,0.1,0.05);
    const deselectedColor = new BABYLON.Color3(0.00,0.00,0.00);
    const neonColor = new BABYLON.Color3(0,0.05,0.91);
    const neonColor2 = new BABYLON.Color3(1,0.05,0.05);
    const interiorMaterial = await BABYLON.NodeMaterial.ParseFromFileAsync("GlobalPalette", 'content/nodeMaterial (60).json', _scn);
    const foliageMaterial = await BABYLON.NodeMaterial.ParseFromFileAsync("TreePalette", 'content/nodeMaterial (61).json', _scn);
    const skycityMaterial = await BABYLON.NodeMaterial.ParseFromFileAsync("TreePalette", 'content/nodeMaterial (64).json', _scn);

    // material interchange, node materials have different members
    meshArray.forEach(mesh => 
    {
        var cls = mesh.getClassName();
        if (cls != "InstancedMesh") 
        {
            switch (mesh.material.id)
            {
                case "ColorPaletteB":
                    mesh.material = interiorMaterial;
                break;
                case "TreePalette":
                    mesh.material = foliageMaterial;
                break;
                case "TexturePaletteSkycity":
                    mesh.material = skycityMaterial;
                break;
                case "RocheGlass":
                    mesh.material.alpha = 1;
                break;
                case "M_5_Translucent_Glass_Gray":
                    mesh.material.alpha = 1;
                    mesh.isPickable = false;
                break;
                case "M_1_NEON_BLAU":
                    mesh.material.emissiveColor = neonColor;
                break;
                default:
                    mesh.material._environmentIntensity = 0.0;
                break;
            }
        } 
    });
    return false;
}

export {Devilmachine, City, Foliage, Interior, ZweiSäulenPresse, Items}




'https://medi-lab.net/wp-includes/logo.gltf'