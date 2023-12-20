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
      