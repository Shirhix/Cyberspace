
// math helper
class MathHelper 
{
    constructor() {
        
    }
    static lerp(a, b, alpha) {
        return a + alpha * (b-a);
    }
    static clamp(val, n1, n2) {
        return min(n2, max(val, n1));
    }
    static lengthdir_x(len, dir) {
        return len * Math.cos(dir);
    }
    static lengthdir_z(len, dir) {
        return len * Math.sin(dir);
    }
    static lengthdir_y(len, dir) {
        return len * -Math.sin(dir);
    }
    static point_distance(x1, y1, x2, y2) {
        return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
    }
    static point_direction(x1, y1, x2, y2) {
        return -Math.atan2(y1 - y2, x1 - x2) + Math.PI/4;
    }
    static irandom_range(n1, n2) {
        return Math.round(n1 + Math.random(1) * (n2-n1));
    }
    static random_range(n1, n2) {
        return (n1 + Math.random(1) * (n2-n1));
    }
    static random(n1) {
        return (n1 * Math.random(1));
    }
    static irandom(n1) {
        return Math.round(n1 * Math.random(1));
    }
}
export {MathHelper};