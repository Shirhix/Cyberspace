
function clamp(val, n1, n2) {
    return min(n2, max(val, n1));
}
function lengthdir_x(len, dir) {
    return len * Math.sin(dir);
}
function lengthdir_z(len, dir) {
    return len * Math.cos(dir);
}
function lengthdir_y(len, dir) {
    return len * -Math.sin(dir);
}
function point_distance(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}
function point_direction(x1, y1, x2, y2) {
    return -Math.atan2(y1 - y2, x1 - x2) + Math.PI/4;
}
function irandom_range(n1, n2) {
    return Math.round(n1 + Math.random(1) * (n2-n1));
}
function random_range(n1, n2) {
    return (n1 + Math.random(1) * (n2-n1));
}
function random(n1) {
    return (n1 * Math.random(1));
}
function irandom(n1) {
    return Math.round(n1 * Math.random(1));
}
function lerp(value1, value2, amount) {
	amount = amount < 0 ? 0 : amount;
	amount = amount > 1 ? 1 : amount;
	return value1 + (value2 - value1) * amount;
};
function rlerp (A, B, w){
    let CS = (1-w)*Math.cos(A) + w*Math.cos(B);
    let SN = (1-w)*Math.sin(A) + w*Math.sin(B);
    return Math.atan2(SN, CS);
}

export {clamp, lengthdir_x, lengthdir_y, lengthdir_z, point_distance, point_direction, irandom_range, lerp, rlerp};

