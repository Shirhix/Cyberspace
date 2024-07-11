
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import {MathHelper} from '/util.js';

class Import
{
    constructor(_filename, _scene, _shadows) 
    {
        this.filename = _filename;
        this.scene = _scene;
        this.shadowcaster = _shadows;
        this.modelArray = undefined; // array
        this.animators = undefined; // map
        this.ready = false;
        this.state = 0;
        this.class = "";
    }

    async loadfile() 
    {
        var arr = await BABYLON.SceneLoader.ImportMeshAsync('', this.filename, '', this.scene);
        this.modelArray = arr.meshes[0].getChildMeshes();
        this.modelArray.forEach((m, index) => {
            m.isPickable = true;
            m.class = this.class;
            m.rotationQuaternion = null;
        });
        this.modelArray.forEach((m, index) => {
            if (m.material.alpha == 1) {
                this.shadowcaster.addShadowCaster(m);
                m.receiveShadows = true;
            } 
        }); 
        return true;
    }

    parseSplineCatmull(array, mesh, closed=false) 
    {
        const vertices = mesh._getPositionData(BABYLON.VertexBuffer.PositionKind);
        for (let n = 0; n < vertices.length; n += 3) {
            let x = vertices[n];
            let y = vertices[n+1];
            let z = vertices[n+2];
            array.push(new BABYLON.Vector3(x, y, z));
        }

        // add last point if closed
        if (closed) {
            let x = vertices[0];
            let y = vertices[1];
            let z = vertices[2];
            array.push(new BABYLON.Vector3(x, y, z));
        }

        // make a catmull
        return BABYLON.Curve3.CreateCatmullRomSpline(array, 1, closed)._points;
    }
}

class ModelObject
{
    constructor(_mesh=undefined, _scene) 
    {
        this.mesh = _mesh;
        this.mesh.active = false;
        this.mesh.targetposition = this.mesh.position.clone();
        this.mesh.targetrotation = this.mesh.rotation.clone();
        this.mesh.originalposition = this.mesh.position.clone();
        this.mesh.originalrotation = this.mesh.rotation.clone();
        this.animations = new Array();
    }

    registerAnimation(name, frames, what) {
        var anim = new BABYLON.Animation(name + "_" + what, what, 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, false);
            anim.setKeys(frames);
        this.animations.push(anim);
    }

    playAnimation(ind, func=undefined) {
        var anim = this.animations[ind];
        var keys = anim.getKeys();
        var len = keys[keys.length-1].frame;
        SCENE.beginDirectAnimation(this.mesh, [anim], 0, len, false, 1, func, undefined, false);
    }
}

export {Import, ModelObject};