
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