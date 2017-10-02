const tape = require('tape');
const indexdocs = require('../lib/indexer/indexdocs.js');

// Multipolygon with one big part in the Eastern Hemisphere, and one small part in the Western.
// Make sure bbox is formatted [W,S,E,N] order, not literally [minX,minY,maxX,maxY].
tape('bbox is sane', t => {
    const res = indexdocs.standardize({
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'USA',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:score': 1
        },
        geometry: {
            type: 'MultiPolygon',
            coordinates: [
                [[[-140, 25], [-65, 25], [-65, 50], [-140, 50], [-140, 25]]],
                [[[160, 40], [170, 40], [170, 50], [160, 50], [160, 40]]]
            ]
        }
    });
    const width = res.bbox[2] - res.bbox[0];
    t.ok(width < 180, 'bbox is sane');
    t.deepEquals(res.bbox, [160, 25, -65, 50]);
    t.end();
});
