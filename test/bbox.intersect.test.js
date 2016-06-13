var tape = require('tape');
var BBox = require('../lib/util/bbox');

tape('check if polygons intersect', function(t) {
    var bb1 = [-75, 35, -65, 45];
    var bb2 = [-66, 34, -64, 44];
    var intersect = BBox.intersect(bb1, bb2);
    t.equal(intersect, true);
    t.end();
});

tape('check if polygons do not intersect', function(t) {
    var bb1 = [-75, 35, -65, 45];
    var bb2 = [-66, -34, -64, -44];
    var intersect = BBox.intersect(bb1, bb2);
    t.equal(intersect, false);
    t.end();
});