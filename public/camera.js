import * as BABYLON from '@babylonjs/core';
import {MathHelper} from '/util.js';

export class CameraManager 
{
    constructor(_scene) 
    {
        this.mode = "arc";
        this.scene = _scene;

        this.cameraUni = new BABYLON.UniversalCamera("cameraUni", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.cameraUni.minZ = 0.1;
        this.cameraUni.maxZ = 1000;
        this.cameraUni.attachControl(false);
        this.cameraUni.defaults = {minZ:0.1, maxZ:1000};

        this.cameraArc = new BABYLON.ArcRotateCamera("cameraArc", 0.5, 0.5, 1, BABYLON.Vector3.Zero(), this.scene, false);
        this.cameraArc.minZ = 0.1;
        this.cameraArc.panningSensibility = 0;
        this.cameraArc.attachControl(true);
        this.cameraArc.lowerRadiusLimit = 10;
        this.cameraArc.upperRadiusLimit = 100;
        this.cameraArc.wheelPrecision = 2;
        this.cameraArc.defaults = {minZ:0.1, panningSensibility:0, lowerRadiusLimit:10, upperRadiusLimit:100, wheelPrecision:0.2};

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

    changeCamera(to, seamless=false, target=undefined, data={}) {
        this.arcStep = 0; 
        this.mode = to;
        this.scene.activeCamera = this.mode == "uni" ? this.cameraUni : this.cameraArc;
        if (target != undefined) {
            this.scene.activeCamera.setTarget(target);
        }
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
            case "arcmove":

            break;
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
        this.scene.activeCamera = this.cameraUni;
        this.mode = "unimove";
        this.arcStep = 0;
        this.startVertex = 0;
        this.endVertex = this.activeVertices.length;

        // translate positions
        let m = 0;
        for (let n = 0; n < this.endVertex; n += 3) {
            this.cameraPathPosition[m++] = new BABYLON.Vector3(this.activeVertices[n], this.activeVertices[n+1], this.activeVertices[n+2]);
        } return true;
    }
}
