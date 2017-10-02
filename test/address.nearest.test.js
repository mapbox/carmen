const addressItp = require('../lib/pure/addressitp');
const test = require('tape');

test('nearest', t => {
    t.deepEqual(
        addressItp.forward(
            {
                properties: {
                    'carmen:rangetype': 'tiger',
                    'carmen:lfromhn': [['1000']],
                    'carmen:ltohn': [['1100']]
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [
                        {
                            type: 'MultiLineString',
                            coordinates: [[[0, 0], [0, 100]]]
                        }
                    ]
                }
            },
            900
        ),
        {
            coordinates: [0, 0],
            interpolated: true,
            omitted: true, // because nearest endpoint match
            type: 'Point'
        },
        'nearest startpoint'
    );

    t.deepEqual(
        addressItp.forward(
            {
                properties: {
                    'carmen:rangetype': 'tiger',
                    'carmen:lfromhn': [['1000']],
                    'carmen:ltohn': [['1100']]
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [
                        {
                            type: 'MultiLineString',
                            coordinates: [[[0, 0], [0, 100]]]
                        }
                    ]
                }
            },
            1200
        ),
        {
            coordinates: [0, 100],
            interpolated: true,
            omitted: true, // because nearest endpoint match
            type: 'Point'
        },
        'nearest endpoint'
    );

    t.deepEqual(
        addressItp.forward(
            {
                properties: {
                    'carmen:rangetype': 'tiger',
                    'carmen:lfromhn': [['1000']],
                    'carmen:ltohn': [['1100']]
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [
                        {
                            type: 'MultiLineString',
                            coordinates: [[[0, 0], [0, 100]]]
                        }
                    ]
                }
            },
            2000
        ),
        undefined,
        'outside threshold'
    );
    t.end();
});

test('nearest stability 1', t => {
    let a = addressItp.forward(require('./fixtures/range-feature-1a.json'), 25);
    let b = addressItp.forward(require('./fixtures/range-feature-1b.json'), 25);
    t.deepEqual(a, b);
    t.deepEqual(a.omitted, undefined);
    t.end();
});

test('nearest stability 2', t => {
    let a = addressItp.forward(
        require('./fixtures/range-feature-3a.json'),
        625
    );
    let b = addressItp.forward(
        require('./fixtures/range-feature-3b.json'),
        625
    );
    t.deepEqual(a, b);
    t.deepEqual(a.coordinates, [-103.368341, 20.665601]);
    t.deepEqual(a.omitted, undefined);
    t.deepEqual(b.omitted, undefined);
    t.end();
});

test('nearest stability 3', t => {
    let a = addressItp.forward(
        require('./fixtures/range-feature-2a.json'),
        100
    );
    let b = addressItp.forward(
        require('./fixtures/range-feature-2b.json'),
        100
    );
    t.deepEqual(a, b);
    t.deepEqual(a.omitted, undefined);
    t.deepEqual(b.omitted, undefined);
    t.end();
});
