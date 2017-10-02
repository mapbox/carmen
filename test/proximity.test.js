const proximity = require('../lib/util/proximity');
const test = require('tape');

test('proximity.center2zxy', t => {
    t.deepEqual(proximity.center2zxy([0, 0], 5), [5, 16, 16]);
    t.deepEqual(proximity.center2zxy([-90, 45], 5), [5, 8, 11.51171875]);
    t.deepEqual(
        proximity.center2zxy([-181, 90.1], 5),
        [5, 0, 0],
        'respects world extents'
    );
    t.deepEqual(
        proximity.center2zxy([181, -90.1], 5),
        [5, 32, 32],
        'respects world extents'
    );
    t.end();
});

test('proximity.distance', t => {
    // uses distance to center when closer than furthest corner of cover
    t.equal(proximity.distance([0, 0], [0, 0], { x: 0, y: 0, zoom: 2 }), 0);
    // uses distance to furthest corner of cover when closer than center
    t.equal(
        proximity.distance([-170, 0], [0, 0], { x: 0, y: 1, zoom: 2 }),
        5946.081666100757
    );
    // changing center does not change distance when it is further than the furthest corner of the cover
    t.equal(
        proximity.distance([-170, 0], [10, 0], { x: 0, y: 1, zoom: 2 }),
        5946.081666100757
    );
    t.end();
});

test('proximity.distscore', t => {
    t.deepEqual(
        proximity.distscore(50, 10),
        200,
        '20x score bump when 50 meters away'
    );
    t.deepEqual(
        proximity.distscore(500, 10000),
        20000,
        '2x score bump when 500 meters away'
    );

    t.end();
});
