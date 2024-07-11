
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import {MathHelper} from '/util.js';
import {Import, ModelObject} from '/import.js';

export class Machine extends Import
{
    constructor(_filename, _scene, _shadows) 
    {
        super(_filename, _scene, _shadows);
        this.modelSet = new Set(["BarLeft","BarRight","SliderLeft","SliderRight","GrapplerLeft","GrapplerRight","Seitenelement1","Seitenelement2","Seitenelement3","Seitenelement4","Display","Rondell","RondellSpline"]);
        this.modelObjects = new Map();
        this.modelTubes = new Array();
        this.modelTracks = new Array();
        this.splinePositions = new Array();
        this.splineRotations = new Array();
        this.splinePos = 0;
        this.splineRunning = true;
    }

    async loadModels() 
    {
        this.modelArray.forEach((m, index) => {
            if (this.modelSet.has(m.name)) {
                this.modelObjects.set(m.name, new ModelObject(m));
                console.log(m.name);
            } else {
                let realname = m.name.slice(0, -4);
                console.log(realname);
                switch (realname) {
                    case "TubeHolder": this.modelTubes.push(new ModelObject(m)); break;
                    case "Schiene": this.modelTracks.push(new ModelObject(m)); break;
                }
            }
        });
    }

    async registerAnimations() 
    {
        // register animations
        let track1 = this.modelTracks[0];
            track1.registerAnimation("pullout", [{frame: 0, value: track1.mesh.position.z}, {frame:  60, value: track1.mesh.position.z + 0.5}], "position.z");
            track1.registerAnimation("putin",   [{frame: 0, value: track1.mesh.position.z + 0.5}, {frame:  60, value: track1.mesh.position.z}], "position.z");

        // this is a special animation using a spline
        let spline = this.modelObjects.get("RondellSpline");
        const vertices = spline.mesh._getPositionData(BABYLON.VertexBuffer.PositionKind);
        for (let n = 0; n < vertices.length; n += 3) {
            let x = vertices[n];
            let y = vertices[n+1];
            let z = vertices[n+2];
            this.splinePositions.push(new BABYLON.Vector3(x, y, z))
        }

        // grappler left
        let barl = this.modelObjects.get("BarLeft");
            barl.registerAnimation("getTube", [{frame: 0, value: barl.mesh.position.z}, {frame:  60, value: barl.mesh.position.z + 0.9}], "position.z");
        let slil = this.modelObjects.get("SliderLeft");
            slil.registerAnimation("getTube", [{frame: 0, value: slil.mesh.position.x}, {frame:  60, value: slil.mesh.position.x - 0.2}], "position.x");
        let gapl = this.modelObjects.get("GrapplerLeft");
            gapl.registerAnimation("getTube", [{frame: 0, value: gapl.mesh.position.y}, {frame:  60, value: gapl.mesh.position.y - 0.2}], "position.y");

        return true;
    }

    update() 
    {
        // spline thing
        if (this.splineRunning)
        {
            this.splinePos += 0.2;
            let sp1 = Math.floor(this.splinePos);
            let sp2 = Math.floor(this.splinePos+1);
            let spa = this.splinePos % 1;
            let positions = this.splinePositions;
            let count = positions.length;
            this.modelTubes.forEach((obj, index) => {
                let p1 = (sp1 + index * 4) % count; let pos1 = positions[p1];
                let p2 = (sp2 + index * 4) % count; let pos2 = positions[p2];
                obj.mesh.position = new BABYLON.Vector3(BABYLON.Scalar.Lerp(pos1.x, pos2.x, spa), BABYLON.Scalar.Lerp(pos1.y, pos2.y, spa), BABYLON.Scalar.Lerp(pos1.z, pos2.z, spa));
                obj.mesh.lookAt(pos2);
            });
        }
    }

    next() 
    {
        this.splineRunning = false;
        switch (this.state++)
        {
            case 0: this.modelTracks[0].playAnimation(0, undefined); break; // pull out sled
            case 1: this.modelTracks[0].playAnimation(1, undefined); break; // push in sled
            case 2: 
                this.modelObjects.get("BarLeft").playAnimation(0, undefined);
                this.modelObjects.get("SliderLeft").playAnimation(0, undefined); 
                this.modelObjects.get("GrapplerLeft").playAnimation(0, undefined);
                break;
            case 5: this.splineRunning = true; break; // start rondel

        }
    }
}