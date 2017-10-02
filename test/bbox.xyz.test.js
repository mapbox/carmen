const tape = require('tape');
const BBox = require('../lib/util/bbox');

tape('should convert bbox to xyz coords', t => {
    let bbox = [-78, 38, -76, 40];
    let zoom = 5;
    let converted = BBox.insideTile(bbox, zoom);
    let xyz = [5, 9, 12, 9, 12];
    t.deepEqual(converted, xyz);
    t.end();
});
