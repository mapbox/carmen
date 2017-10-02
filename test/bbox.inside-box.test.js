const tape = require('tape');
const BBox = require('../lib/util/bbox');

tape('check if point is inside polygon', t => {
    let coords = [-77, 38];
    let bbox = [-80, 30, -70, 40];
    let inside = BBox.inside(coords, bbox);
    t.equal(inside, true);
    t.end();
});

tape('check if point is outside polygon', t => {
    let coords = [-87, 38];
    let bbox = [-80, 30, -70, 40];
    let inside = BBox.inside(coords, bbox);
    t.equal(inside, false);
    t.end();
});
