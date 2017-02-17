var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity.center2zxy', function(assert) {
    assert.deepEqual(proximity.center2zxy([0,0],5), [5,16,16]);
    assert.deepEqual(proximity.center2zxy([-90,45],5), [5,8,11.51171875]);
    assert.deepEqual(proximity.center2zxy([-181,90.1],5), [5,0,0], 'respects world extents');
    assert.deepEqual(proximity.center2zxy([181,-90.1],5), [5,32,32], 'respects world extents');
    assert.end();
});

test('proximity.distance', function(assert) {
    // uses distance to center when closer than furthest corner of cover
    assert.equal(proximity.distance([0, 0], [0, 0], { x: 0, y: 0, zoom: 2 }), 0);
    // uses distance to furthest corner of cover when closer than center
    assert.equal(proximity.distance([-170, 0], [0, 0], { x: 0, y: 1, zoom: 2 }), 5946.081666100757);
    // changing center does not change distance when it is further than the furthest corner of the cover
    assert.equal(proximity.distance([-170, 0], [10, 0], { x: 0, y: 1, zoom: 2 }), 5946.081666100757);
    assert.end();
});

test('proximity.distscore', function(assert) {
    assert.deepEqual(proximity.distscore(50, 10), 200, '20x score bump when 50 meters away');
    assert.deepEqual(proximity.distscore(500, 10000), 20000, '2x score bump when 500 meters away');

    assert.end();
});