import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import {MathHelper} from '/util.js';
import {Import, ModelObject} from '/import.js';

export class Printer extends Import
{
    constructor(_filename, _scene, _shadows) 
    {
        super(_filename, _scene, _shadows);
        this.modelSet = new Set(["BezierCurve1","BezierCurve2","ConcretePrinter","HorizontalBar","HorizontalBar2","ZementAusguss"]);
        this.modelObjects = new Map();
        this.instructions_queue = [];
        this.pos_alpha = 1;
        this.pos_alpha_speed = 0;
        this.cm = new BABYLON.Mesh("custom", this.scene);
        this.cm_positions = [];
        this.cm_indices = [];
        var mat = new BABYLON.StandardMaterial("mat", this.scene);
            mat.backFaceCulling = false;
        this.cm.material = mat;
        this.global_counter = 0;
        this.point_list = [];
        this.point = 0;
        this.counter = 0;
        this.catmull = undefined;
        this.catty = new Map();
        this.catty_iterator = undefined;
        this.catty_keys = undefined;
        this.ready = false;
        this.on = false;
        this.brokenuntil = 0;
    }

    async parse_obj(txt)
    {
        txt = txt.trim() + "\n";

        var posA = 0;
        var posB = txt.indexOf("\n", 0);
        var line = "";
        var vertices = [];
        var lines = new Map();
        var itm = undefined;

        function closeTo(ref, val) {
            return Math.abs(ref - val) < 0.1;
        }

        while (posB > posA)
        {
            line = txt.substring(posA, posB).trim();
            itm = line.split(" ");
            itm.shift();
            switch (line.charAt(0))
            {
                case "v": // vertex
                    vertices.push(new BABYLON.Vector3(parseFloat(itm[0]), parseFloat(itm[1]), parseFloat(itm[2])));
                break;
                case "l": // lines, -1 because in obj index starts from 1

                    let _from = parseInt(itm[0]-1);
                    let _to = parseInt(itm[1]-1);
                    
                    // get y coords
                    let _y1 = vertices[_from].y;
                    let _y2 = vertices[_to].y;

                    // have these y coords their own map entry?
                    if (lines.get(_y1) == undefined) lines.set(_y1, []);
                    if (lines.get(_y2) == undefined) lines.set(_y2, []);

                    if (_y1 == _y2) {
                        lines.get(_y1).push([_from, _to]);
                    }
                    
                break;
                case "f": // face, can have any amount of indices

                    if (itm.length != 4) {
                        break;
                    }

                    // save the n indices in an array
                    let y1 = -Infinity;
                    let y2 =  Infinity;
                    let indices = [];
                    for (let n = 0; n < itm.length; n++) 
                    {
                        let i = parseInt(itm[n]-1);
                        let y = vertices[i].y;
                            indices.push(i);

                        // get both y levels (there are always two)
                        y1 = Math.max(y1, y); 
                        y2 = Math.min(y2, y); 
                    }

                    if (lines.get(y1) == undefined) lines.set(y1, []);
                    if (lines.get(y2) == undefined) lines.set(y2, []);

                    if (closeTo(y1, y2)) { // flat, don't add it.
                        // lines.get(y1).push(indices); 
                    } else { // this means it's a side to side area, pair same-y indices
                        let a1 = []; let a2 = []; 
                        indices.forEach((el, ind) => {
                            if (closeTo(y1, vertices[el].y)) a1.push(el);
                            else
                            if (closeTo(y2, vertices[el].y)) a2.push(el);
                        });
                        lines.get(y1).push(a1);
                        lines.get(y2).push(a2);
                    }

                break;
            }
            posA = posB+1;
            posB = txt.indexOf("\n", posA);
        }

        var loops = [];

        lines.forEach((arr, key) => 
        {
            let unordered_seek = arr.length;
            let ordered_seek = 0;
            let ordered_indices = [[],[],[],[]];
            let first_ind = arr[0][0];
            let next = first_ind;
            let n = 0;
            let state = 0;

            while (unordered_seek > 0)
            {
                ordered_indices[state][ordered_seek++] = next;
                let pair = arr[n];
                let f = pair[0];
                let t = pair[1];
                
                // remove it from the array of unordered pairs (by excluding the element)
                // previous index can be on [0] or on [1] we need to spit out the other to continue
                arr[n] = arr[--unordered_seek];
                next = (next == f ? t : f);
                
                // now search for a pair that has this index
                let found = false;
                for (let m = 0; m < unordered_seek; m++) {
                    let any_pair = arr[m]; 
                    if (next == any_pair[0] || next == any_pair[1]) {
                        n = m; found = true; break;
                    }
                }

                // if you reach here, you found no pair, they may be disconnected
                if (!found) 
                {
                    ordered_indices[state][ordered_seek] = first_ind; 
                    ordered_seek = 0; state++;
                    first_ind = arr[0][0];
                    next = first_ind; n = 0;
                }
            }

            // add to grand loop
            ordered_indices.forEach((arr, ind) => {
                if (arr.length > 0) {
                    loops.push(arr);
                }
            });
        });

        // create a catmull for that y level
        loops.forEach((loop, index) => {
            let ordered_vertices = [];
            for (let n = 0; n < loop.length; n++) {
                ordered_vertices.push(vertices[loop[n]]);
            } this.catty.set("cat_" + index, BABYLON.Curve3.CreateCatmullRomSpline(ordered_vertices, 12, false)._points);
        });

        // this.catty_iterator = this.catty.keys();
        this.catty_keys = this.catty.keys();
        this.catty_iterator = this.catty.get(this.catty_keys.next().value);
        console.log(this.catty_iterator);
    }

    async set_up() 
    {
        // parse model obj to text, then to arrays
        fetch('/models/printer.obj').then((val) => {
            if (val.ok) {
                val.text().then(txt => {
                    this.parse_obj(txt).then(() => {
                        let head = this.get_head();
                            head.position = this.catty_iterator[0];
                            head.lookAt(this.catty_iterator[1]);
                    });
                });
            } else {
                console.log("fetch failed with status: " + val.status);
            }
        })
        return true;
    }

    update() 
    {
        // constants
        const HEAD_SPEED = 1;
        
        // next catty
        if (this.catty_iterator == undefined) {
            return;
        }

        let active = true;
        if (this.point > this.catty_iterator.length - 1) {
            active = false;
        }

        if (this.point == this.catty_iterator.length) {
            this.catty_iterator = this.catty.get(this.catty_keys.next().value);
            this.point = 0;
        }

        // next catty
        if (this.catty_iterator == undefined) {
            return;
        }

        // get head
        let head = this.get_head();
        let oldPos = undefined; let oldRot = undefined;
        let newPos = undefined; let newRot = undefined;

        // interpolate using integral
        let sp1 = Math.floor(this.point + 0); let p1 = sp1 % this.catty_iterator.length; let pos1 = this.catty_iterator[p1];
        let sp2 = Math.floor(this.point + 1); let p2 = sp2 % this.catty_iterator.length; let pos2 = this.catty_iterator[p2];

            oldPos = head.position.clone();
            oldRot = head.rotation.y;

        head.position = pos1;
        head.lookAt(pos2);

            newPos = head.position.clone();
            newRot = head.rotation.y;

        // set other meshes to head position
        var box = this.get_box();
            box.position = head.position.clone();
        var bar = this.get_horbar();
            bar.position.y = head.position.y + 6;
            bar.position.x = head.position.x - 0.2;
        var bar2 = this.get_horbar();
            bar2.position.y = bar.position.y;

        // make profile if new point
        if (active) {
            this.draw_profile_at(oldPos.x, oldPos.y, oldPos.z, oldRot, newPos.x, newPos.y, newPos.z, newRot);
        } 

        // advance point and stop at last
        this.point = Math.min(this.point += HEAD_SPEED, this.catty_iterator.length);
    }

    parseInstructions() 
    {
        // take instructions and turn them into a list of points
        let prev = {x:0,y:0,z:0,a:0};
        this.instructions_queue.forEach((cur, index) => {
            switch (cur.ins) {
                case "mov": // from a to b
                    let dir = MathHelper.point_direction(prev.x, prev.z, cur.x, cur.z);
                    this.point_list.push({x : cur.x, y : cur.y, z : cur.z, a : dir}); 
                break;
            }
        });

        // check points
        this.point_list.forEach(element => {
            console.log([element.x, element.z, element.a*180/Math.PI]);
        });
    }

    async loadModels() {
        this.modelArray.forEach((m, index) => {
            if (this.modelSet.has(m.name)) {
                this.modelObjects.set(m.name, new ModelObject(m, this.scene));
                console.log(m.name + " registered as a Model");
            }
        });
        this.get_head().rotationQuaternion = null;
        
        const gaxes = new BABYLON.AxesViewer(this.scene, 1);
        const laxes = new BABYLON.AxesViewer(this.scene, 0.5);
            laxes.xAxis.parent = this.get_head();
            laxes.yAxis.parent = this.get_head();
            laxes.zAxis.parent = this.get_head();
        return true;
    }

    update_mesh() {
        var vertexData = new BABYLON.VertexData();
            vertexData.positions = this.cm_positions;
            vertexData.indices = this.cm_indices;
        vertexData.applyToMesh(this.cm);
    }

    draw_cuboid_at(xl, yl, zl, rl, x, y, z, r) 
    {
        const q = 0.05;
        const h = 0.05;
        let r_real = r + Math.PI * 0.5;
        let r_real_l = rl + Math.PI * 0.5;

        // front positions
        let x1 = x + MathHelper.lengthdir_x(q, r_real - Math.PI * 0.25);
        let x2 = x + MathHelper.lengthdir_x(q, r_real + Math.PI * 0.25);
        let y1 = y;
        let y2 = y + h;
        let z1 = z + MathHelper.lengthdir_z(q, r_real - Math.PI * 0.25);
        let z2 = z + MathHelper.lengthdir_z(q, r_real + Math.PI * 0.25);

        // back positions
        let x3 = xl + MathHelper.lengthdir_x(q, r_real_l - Math.PI * 0.25);
        let x4 = xl + MathHelper.lengthdir_x(q, r_real_l + Math.PI * 0.25);
        let y3 = yl;
        let y4 = yl + h;
        let z3 = zl + MathHelper.lengthdir_z(q, r_real_l - Math.PI * 0.25);
        let z4 = zl + MathHelper.lengthdir_z(q, r_real_l + Math.PI * 0.25);

        // left face
        this.cm_positions.push(x1, y1, z1);
        this.cm_positions.push(x1, y2, z1);
        this.cm_positions.push(x3, y4, z3);
        this.cm_positions.push(x3, y4, z3);
        this.cm_positions.push(x3, y3, z3);
        this.cm_positions.push(x1, y1, z1);

        // top face
        this.cm_positions.push(x1, y2, z1);
        this.cm_positions.push(x2, y2, z2);
        this.cm_positions.push(x4, y4, z4);
        this.cm_positions.push(x4, y4, z4);
        this.cm_positions.push(x3, y4, z3);
        this.cm_positions.push(x1, y2, z1);

        // right face
        this.cm_positions.push(x2, y1, z2);
        this.cm_positions.push(x2, y2, z2);
        this.cm_positions.push(x4, y4, z4);
        this.cm_positions.push(x4, y4, z4);
        this.cm_positions.push(x4, y3, z4);
        this.cm_positions.push(x2, y1, z2);

        // indices
        let len = this.cm_indices.length;
        for (var n = 0; n < 18; n++) {
            this.cm_indices.push(n+len);
        }
    }

    draw_profile_at(xl, yl, zl, rl, x, y, z ,r) 
    {
        let head = this.get_head();
        let ppos = head.parent._absolutePosition;
        let px = ppos.x;
        let py = ppos.y;
        let pz = ppos.z;

        // make a quad
        // why is x minus? we will never know
        this.draw_cuboid_at(-(px+xl), py+yl, pz+zl, rl, -(px+x), py+y, pz+z, r);
        this.update_mesh();
    }
    
    // getters
    get_head() {return this.modelObjects.get("ZementAusguss").mesh;}
    get_box() {return this.modelObjects.get("ConcretePrinter").mesh;}
    get_horbar() {return this.modelObjects.get("HorizontalBar").mesh;}
    get_horbar2() {return this.modelObjects.get("HorizontalBar2").mesh;}
    get_spline() {return this.modelObjects.get("BezierCurve2").mesh;}
}
