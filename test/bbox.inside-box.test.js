var tape = require('tape');
var BBox = require('../lib/util/bbox');

tape('check if point is inside polygon', function(t) {
    var coords = [-77, 38];
    var bbox = [-80, 30, -70, 40];
    var inside = BBox.inside(coords, bbox);
    t.equal(inside, true);
    t.end();
});

tape('check if point is outside polygon', function(t) {
    var coords = [-87, 38];
    var bbox = [-80, 30, -70, 40];
    var inside = BBox.inside(coords, bbox);
    t.equal(inside, false);
    t.end();
});