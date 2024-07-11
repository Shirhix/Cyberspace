import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";

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

class MaterialHandler
{
    constructor(_scene) 
    {
        this.scene = _scene;

        // materials
        const noEmission = new BABYLON.Color3(0,0,0);
        const pbrMateralGlass = new BABYLON.PBRMaterial("glassMat", this.scene);
            pbrMateralGlass.metallic = 0;
            pbrMateralGlass.roughness = 0;
            pbrMateralGlass.separateCullingPass = true;
            pbrMateralGlass.backFaceCulling = false;
            pbrMateralGlass.environmentIntensity = 0.8;
            pbrMateralGlass._albedoColor = new BABYLON.Color3(0,0,0);
            pbrMateralGlass.alpha = 0.45;
            pbrMateralGlass.freeze();
        const RCM = new BABYLON.StandardMaterial("raycastMat", this.scene);
            RCM.emissiveColor = new BABYLON.Color3(0.2,0.2,0);
        const nodeMaterialBase = BABYLON.NodeMaterial.Parse(nodeMaterialBaseUrl1, this.scene);
            nodeMaterialBase.backFaceCulling = true; 
            nodeMaterialBase.freeze();
        const nodeMaterialTerrain = BABYLON.NodeMaterial.Parse(nodeMaterialTerrainUrl, this.scene);
            nodeMaterialTerrain.backFaceCulling = true; 
            nodeMaterialTerrain.freeze();
        const nodeMaterialWater = BABYLON.NodeMaterial.Parse(nodeMaterialWaterUrl, this.scene);
            nodeMaterialWater.backFaceCulling = true; 
            nodeMaterialWater.freeze();
        const nodeMaterialSkycity = BABYLON.NodeMaterial.Parse(nodeMaterialBaseUrl2, this.scene);
            nodeMaterialSkycity.backFaceCulling = true; 
            nodeMaterialSkycity.freeze();
        const nodeMaterialTree = BABYLON.NodeMaterial.Parse(nodeMaterialBaseTree, this.scene);
            nodeMaterialLeaf.backFaceCulling = true;
            nodeMaterialTree.freeze();
        const nodeMaterialLeaf = BABYLON.NodeMaterial.Parse(nodeMaterialBaseLeaf, this.scene);
            nodeMaterialLeaf.backFaceCulling = false;
            nodeMaterialLeaf.freeze();

        // which materials override which names
        // the names are the ones in blender
        const materialReplacements = new Map();
            materialReplacements.set("ColorPaletteB", nodeMaterialBase);
            materialReplacements.set("TexturePaletteSkycity", nodeMaterialSkycity);
            materialReplacements.set("Pavement", nodeMaterialSkycity);
            materialReplacements.set("Fake_Glass", nodeMaterialSkycity);
            materialReplacements.set("LeafTexture", nodeMaterialSkycity);
            materialReplacements.set("TreeTexture", nodeMaterialSkycity);
    }

    overrideImports() // provide any amount of models
    {
        for (const imp of arguments) {
        for (const m of imp.modelArray) {
            if (!m.isAnInstance) {
                m.material = materialReplacements.get(m.material.id) ?? m.material;
            }
        }}
    }
}

class LodHandler
{
    constructor(_file, _scene) 
    {
        this.filename = _file;
        this.scene = _scene;
        this.ready = false;
        this.register = new Map();
    }

    async loadLods() 
    {
        // loads all lods from every mesh from a single file (see Blender LODS container)
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
            arr.meshes[0].getChildMeshes().forEach((m, index) => {
                m.class = "lod";
                m.setParent(null);
                m.isPickable = false;
                m.shadowEnabled = false;
                m.rotationQuaternion = null;
            this.register.set(m.name.slice(0, -5), m);
            
        });
        this.ready = true;
    }

    async assignLods()
    {
        // then distributes each lod to their real counterpart
        // this is done by looking up the name of the LOD minus the ".LOD1" they have in blender
        for (const imp of arguments) {
        for (const m of imp.modelArray) {
            let realname = m.isAnInstance ? m.name.slice(0, -5) : m.name;
            let lodmesh = this.register.get(realname);
            if (lodmesh != undefined && !m.isAnInstance) {
                let r = Math.sqrt(1 + 1000 * lodmesh.getBoundingInfo().boundingSphere.radiusWorld);
                    m.addLODLevel(r, lodmesh);
            }
        }};
    }
}

class BoxHandler
{
    constructor(_file, _scene)
    {
        this.filename = _file;
        this.scene = _scene;
        this.ready = false;
        this.register = new Map();
    }

    async loadBoxs() 
    {
        // loads all collision meshes from every mesh from a single file (see Blender BOXS container)
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
            arr.meshes[0].getChildMeshes().forEach((m, index) => {
                m.class = "box";
                m.setParent(null);
                m.isPickable = false;
                m.isVisible = false;
                m.material.wireframe = true;
                m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, this.scene);
            this.register.set(m.name.slice(0, -4), m);
        });
        this.ready = true;
    }

    async assignBoxs()
    {
        // does the same as LODs but instead with the ".BOX" postfix
        // The boxes here get a physicsimposter with 0 mass, indicating they're stationary
        for (const imp of arguments) {
        for (const m of imp.modelArray) {
            let realname = m.isAnInstance ? m.name.slice(0, -4) : m.name;
            let box = this.register.get(realname);
            if (box == undefined) continue;

            let boxInstance = m.isAnInstance ? box.clone() : box; // boxes aren't instanced, yet their owners are, so we just clone it, then put it there
                boxInstance.position = m.position.clone();
            if (m.rotationQuaternion != null) {
                boxInstance.rotationQuaternion = m.rotationQuaternion.clone();
            } else {
                boxInstance.rotation = m.rotation.clone();
            } m.physicsImpostor = new BABYLON.PhysicsImpostor(boxInstance, BABYLON.PhysicsImpostor.MeshImpostor, {mass:0.0, restitution:0.2}, this.scene);
        }};
    }
}

// imports
class Import
{
    constructor(_filename, _scene, _shadows, _func=undefined) 
    {
        this.filename = _filename;
        this.scene = _scene;
        this.shadowCaster = _shadows;
        this.class = "none";
        this.modelArray = undefined; // array
        this.animators = undefined; // map
        this.ready = false;
        this.customUpdateFunction = _func;
    }

    async loadfile() 
    {
        // load meshes from gltf
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.class = this.class;
        });
        return true;
    }

    async createSeperateHitboxes() {
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
    async generateShadows() {
        this.modelArray.forEach((m, index) => {
            if (m.material.alpha == 1) this.shadowCaster.addShadowCaster(m);
        });
    }
    async receiveShadows() {
        this.modelArray.forEach((m, index) => {
            if (m.material.alpha == 1) m.receiveShadows = true;
        });
    }
    async receivePickable() {
        this.modelArray.forEach((m, index) => {
            m.isPickable = false;
            m.doNotSyncBoundingInfo = true;
        });
    }
    async makeInvisible() {
        this.modelArray.forEach((m, index) => {
            m.isVisible = false;
        });
    }
    async makeVisible() {
        this.modelArray.forEach((m, index) => {
            m.isVisible = true;
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

    // update methods
    update() {
        let cam = this.scene.activeCamera;
        if (this.customUpdateFunction != undefined) {
            this.customUpdateFunction();
        }
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
// 'https://medi-lab.net/wp-includes/logo.gltf'


