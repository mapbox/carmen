var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity.center2zxy', function(assert) {
    assert.deepEqual(proximity.center2zxy([0,0],5), [5,16,16]);
    assert.deepEqual(proximity.center2zxy([-90,45],5), [5,8,11.51171875]);
    assert.deepEqual(proximity.center2zxy([-181,90.1],5), [5,0,0], 'respects world extents');
    assert.deepEqual(proximity.center2zxy([181,-90.1],5), [5,32,32], 'respects world extents');
    assert.end();
});

test('proximity.scoredist', function(assert) {
    assert.equal(proximity.scoredist(80.0, 1), 0.5, '80.0 miles');
    assert.equal(proximity.scoredist(40.0, 1), 1, '40.0 miles');
    assert.equal(proximity.scoredist(20.0, 1), 2, '20.0 miles');
    assert.equal(proximity.scoredist(8.0, 1),  5,   '8.0 miles');
    assert.equal(proximity.scoredist(5.0, 1),  8,   '5.0 miles = break even pt');
    assert.equal(proximity.scoredist(4.0, 1),  10,   '4.0 miles');
    assert.equal(proximity.scoredist(2.0, 1),  20,   '2.0 miles');
    assert.equal(proximity.scoredist(1.0, 1),  40,   '1.0 miles');
    assert.equal(proximity.scoredist(0.2, 1),  200,  '0.2 miles');
    assert.equal(proximity.scoredist(0.1, 1),  400,  '0.1 miles');
    assert.equal(proximity.scoredist(0.0, 1),  400000, '0.0 miles');
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
