var dedupe = require('../lib/util/dedupe');
var tape = require('tape');

tape('dedup lowercase vs caps', function(assert) {
    features = [
        {
            place_name: '20 main st',
            text: 'main st',
            address: 20,
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: '20 MAIN ST',
            text: 'MAIN ST',
            address: 20,
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        }
    ];
    assert.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes by lowercase vs caps');

    assert.end();
});

tape('dedupe', function(assert) {
    var features;

    features = [
        {
            place_name: 'main st springfield',
            text: 'main st',
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: 'wall st springfield',
            text: 'wall st',
            center:[10,0],
            geometry: {
                type:'Point',
                coordinates:[10,0]
            }
        },
        {
            place_name: 'main st springfield',
            text: 'main st',
            center:[20,0],
            geometry: {
                type:'Point',
                coordinates:[20,0]
            }
        },
    ];
    assert.deepEqual(dedupe(features), [
        features[0],
        features[1]
    ], 'dedupes by place_name');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[20,0],
            geometry: {
                type:'Point',
                coordinates:[20,0]
            }
        },
    ];
    assert.deepEqual(dedupe(features), [
        features[0],
        features[1],
    ], 'dupe identical addresses when dist >= 5km');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                type:'Point',
                coordinates:[0.001,0]
            }
        },
    ];
    assert.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses when dist < 5km');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                type:'Point',
                coordinates:[0.001,0]
            }
        },
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[1,0],
            geometry: {
                type:'Point',
                coordinates:[1,0]
            }
        }
    ];
    assert.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses + placenames when dist < 5km');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                interpolated: true,
                omitted: true,
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.002,0],
            geometry: {
                interpolated: true,
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00003',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                type:'Point',
                coordinates:[0.001,0]
            }
        },
    ];
    assert.deepEqual(dedupe(features), [
        features[2]
    ], 'dedupes identical addresses, prioritizes non-interpolated');

    // Reverse to make sure logic works in reverse order.
    features.reverse();
    assert.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses, prioritizes non-interpolated');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                omitted: true,
                interpolated: true,
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                interpolated: true,
                type:'Point',
                coordinates:[0.001,0]
            }
        },
    ];
    assert.deepEqual(dedupe(features), [
        features[1]
    ], 'dedupes identical addresses, prioritizes non-omitted');

    // Reverse to make sure logic works in reverse order.
    features.reverse();
    assert.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses, prioritizes non-omitted');

    assert.end();
});

