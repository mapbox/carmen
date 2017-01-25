var addressItp = require('../lib/pure/addressitp');
var test = require('tape');
var feature = require('../lib/util/feature');

test('nearest', function(t) {
    t.deepEqual(addressItp.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 900), {
        coordinates: [ 0, 0 ],
        interpolated: true,
        omitted: true, // because nearest endpoint match
        type: 'Point'
    }, 'nearest startpoint');

    t.deepEqual(addressItp.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 1200), {
        coordinates: [ 0, 100 ],
        interpolated: true,
        omitted: true, // because nearest endpoint match
        type: 'Point'
    }, 'nearest endpoint');

    t.deepEqual(addressItp.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 2000),
    undefined,
    'outside threshold');
    t.end();
});

test('nearest stability 1', function(assert) {
    var a = addressItp.forward(feature.transform(require('./fixtures/range-feature-1a.json')), 25);
    var b = addressItp.forward(feature.transform(require('./fixtures/range-feature-1b.json')), 25);
    assert.deepEqual(a, b);
    assert.deepEqual(a.omitted, undefined);
    assert.end();
});

test('nearest stability 2', function(assert) {
    var a = addressItp.forward(feature.transform(require('./fixtures/range-feature-3a.json')), 625);
    var b = addressItp.forward(feature.transform(require('./fixtures/range-feature-3b.json')), 625);
    assert.deepEqual(a, b);
    assert.deepEqual(a.coordinates, [-103.368341,20.665601]);
    assert.deepEqual(a.omitted, undefined);
    assert.deepEqual(b.omitted, undefined);
    assert.end();
});

test('nearest stability 3', function(assert) {
    var a = addressItp.forward(feature.transform(require('./fixtures/range-feature-2a.json')), 100);
    var b = addressItp.forward(feature.transform(require('./fixtures/range-feature-2b.json')), 100);
    assert.deepEqual(a, b);
    assert.deepEqual(a.omitted, undefined);
    assert.deepEqual(b.omitted, undefined);
    assert.end();
});

