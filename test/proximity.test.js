var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity.center2zxy', function(assert) {
    assert.deepEqual(proximity.center2zxy([0,0],5), [5,16,16]);
    assert.deepEqual(proximity.center2zxy([-90,45],5), [5,8,11.51171875]);
    assert.deepEqual(proximity.center2zxy([-181,90.1],5), [5,0,0], 'respects world extents');
    assert.deepEqual(proximity.center2zxy([181,-90.1],5), [5,32,32], 'respects world extents');
    assert.end();
});

test('proximity._scoredist', function(assert) {
    assert.equal(proximity._scoredist(1, 80.0), 0.5, '80.0 miles');
    assert.equal(proximity._scoredist(1, 40.0), 1, '40.0 miles');
    assert.equal(proximity._scoredist(1, 20.0), 2, '20.0 miles');
    assert.equal(proximity._scoredist(1, 8.0),  5,   '8.0 miles');
    assert.equal(proximity._scoredist(1, 5.0),  8,   '5.0 miles = break even pt');
    assert.equal(proximity._scoredist(1, 4.0),  10,   '4.0 miles');
    assert.equal(proximity._scoredist(1, 2.0),  20,   '2.0 miles');
    assert.equal(proximity._scoredist(1, 1.0),  40,   '1.0 miles');
    assert.equal(proximity._scoredist(1, 0.2),  200,  '0.2 miles');
    assert.equal(proximity._scoredist(1, 0.1),  400,  '0.1 miles');
    assert.equal(proximity._scoredist(1, 0.0),  400000, '0.0 miles');
    assert.end();
});

test('proximity.scoredist', function(assert) {
    // lon/lat center
    assert.equal(proximity.scoredist([0,0], [0,0], 1000), 4e8, 'll scoredist');
    assert.equal(proximity.scoredist([0,0], [0.05,0], 1000), 11574.905, 'll scoredist');
    assert.equal(proximity.scoredist([0,0], [2.00,0], 1000), 289.3726, 'll scoredist');
    assert.equal(proximity.scoredist([0,0], [10.00,0], 1000), 57.8745, 'll scoredist');
    assert.end();
});
