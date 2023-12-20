
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