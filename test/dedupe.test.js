const dedupe = require('../lib/util/dedupe');
const tape = require('tape');

tape('dedup lowercase vs caps', (t) => {
    let features = [
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
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes by lowercase vs caps');

    t.end();
});

tape('dedup - change relev order', (t) => {
    const dedup = dedupe(require('./fixtures/relev.json'));


    t.equals(dedup.length, 9)

    t.equals(dedup[0].relevance, 0.7969999999999999);
    t.equals(dedup[1].relevance, 0.574);
    t.equals(dedup[2].relevance, 0.495);
    t.equals(dedup[3].relevance, 0.43233333333333335);
    t.equals(dedup[4].relevance, 0.3233333333333333);
    t.equals(dedup[5].relevance, 0.3233333333333333);
    t.equals(dedup[6].relevance, 0.3233333333333333);
    t.equals(dedup[7].relevance, 0.25666666666666665);
    t.equals(dedup[8].relevance, 0.25666666666666665);

    t.end();

});

tape('dedupe', (t) => {
    let features = [
        {
            place_name: 'Dandenong Road, Mount Ommaney',
            text: 'Dandenong Road',
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: '171 Dandenong Road, Mount Ommaney',
            text: 'Dandenong Road',
            address: 171,
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        }
    ];
    assert.deepEqual(dedupe(features), [
        features[1]
    ], 'dedup should dedup accross streets w/ address vs without');

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
    t.deepEqual(dedupe(features), [
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
    t.deepEqual(dedupe(features), [
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
    t.deepEqual(dedupe(features), [
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
    t.deepEqual(dedupe(features), [
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
    t.deepEqual(dedupe(features), [
        features[2]
    ], 'dedupes identical addresses, prioritizes non-interpolated');

    // Reverse to make sure logic works in reverse order.
    features.reverse();
    t.deepEqual(dedupe(features), [
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
    t.deepEqual(dedupe(features), [
        features[1]
    ], 'dedupes identical addresses, prioritizes non-omitted');

    // Reverse to make sure logic works in reverse order.
    features.reverse();
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses, prioritizes non-omitted');

    t.end();
});

