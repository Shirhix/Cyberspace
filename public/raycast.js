import * as BABYLON from '@babylonjs/core';
import {MathHelper} from '/util.js';

export class Raycast
{
    constructor(_scene) 
    {
        this.scene = _scene;
        this.myCamera = this.scene.activeCamera;
        var mat = new BABYLON.StandardMaterial("raycastMat", this.scene);
            mat.emissiveColor = new BABYLON.Color3(0.2, 1, 0);
        this.raycast = BABYLON.MeshBuilder.CreateSphere("indicatorPoint", {diameter: 0.02}, this.scene);
        this.raycast.isPickable = false;
        this.raycast.material = mat;
        this.raycast.hitId = undefined;
        this.raycast.renderingGroupId = 1;
        this.raycast._lightSources = [];
        this.raycastIsNear = false;
        this.raycastPreviousMesh = undefined;
        this.raycastPreview = undefined;
    }

    updateRay(pickinfo=this.scene.pick(this.scene.pointerX, this.scene.pointerY)) 
    {
        if (pickinfo != undefined && pickinfo.pickedMesh != null) {
            this.raycast.hitId = pickinfo.pickedMesh;
            this.raycast.position = pickinfo.pickedPoint;
        } else {
            this.raycast.position.x = this.scene.pointerX;
            this.raycast.position.y = this.scene.pointerY;
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
            case "machine":

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
        }
        
    }

    action(pickinfo) 
    {
        // handle raycast pickedMesh
        console.log(pickinfo);
        if (pickinfo == undefined || pickinfo.pickedMesh == undefined) {
            return;
        }

        console.log("picked " + pickinfo.pickedMesh.name);
        console.log("class " + pickinfo.pickedMesh.class);
        let realname = pickinfo.pickedMesh.isAnInstance ? pickinfo.pickedMesh.name.slice(0, -4) : pickinfo.pickedMesh.name;

        switch (pickinfo.pickedMesh.class)
        {
            case "machine":
                machine.next();
            break;
            case "item":
                this.pickup(pickinfo.pickedMesh);
            break;
        }
    }
}