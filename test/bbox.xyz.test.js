var tape = require('tape');
var BBox = require('../lib/util/bbox');

tape('should convert bbox to xyz coords', function(t) {
    var bbox = [-78, 38, -76, 40];
    var zoom = 5;
    var converted = BBox.insideTile(bbox, zoom);
    var xyz = [5, 9, 12, 9, 12];
    t.deepEqual(converted, xyz);
    t.end();
});