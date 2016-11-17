var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity.center2zxy', function(assert) {
    assert.deepEqual(proximity.center2zxy([0,0],5), [5,16,16]);
    assert.deepEqual(proximity.center2zxy([-90,45],5), [5,8,11]);
    assert.deepEqual(proximity.center2zxy([-181,90.1],5), [5,0,0], 'respects world extents');
    assert.deepEqual(proximity.center2zxy([181,-90.1],5), [5,32,31], 'respects world extents');
    assert.end();
});

test('proximity._scoredist', function(assert) {
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

test('proximity.scoredist', function(assert) {
    // lon/lat center
    assert.equal(proximity.scoredist(proximity.distance([0,0], [0,0]), 1000), 4e8, 'll scoredist');
    assert.equal(proximity.scoredist(proximity.distance([0,0], [0.05,0]), 1000), 11574.905, 'll scoredist');
    assert.equal(proximity.scoredist(proximity.distance([0,0], [2.00,0]), 1000), 289.3726, 'll scoredist');
    assert.equal(proximity.scoredist(proximity.distance([0,0], [10.00,0]), 1000), 57.8745, 'll scoredist');
    assert.end();
});

test('proximity.distanceToFeature', function(t) {
    var features = require('./fixtures/proximity-geojson.json').features;
    var mapbox = [-77.03254401683807, 38.913181684714296]
    var dca = [-77.04480171203613, 38.85174028464973];

    var dcPoint = features[0];
    var torontoPoint = features[1];
    var canadaUsBorder = features[2];
    var parallel49th = features[3];
    var dcPoly = features[4];
    var torontoPoly = features[5];

    function fixed(n) {
        return parseFloat(n.toFixed(3));
    }

    function distanceToGeometry() {
        return fixed(proximity.distanceToGeometry.apply(this, arguments));
    }

    t.test('Point', function(t) {
        t.equal(distanceToGeometry(mapbox, dcPoint.geometry), 1.003);
        t.end();
    });

    t.test('MultiPoint', function(t) {
        var multiPoint = {
            type: 'MultiPoint',
            coordinates: [torontoPoint.geometry.coordinates, dcPoint.geometry.coordinates]
        };

        t.equal(distanceToGeometry(mapbox, multiPoint), 1.003);
        multiPoint.coordinates.reverse();
        t.equal(distanceToGeometry(mapbox, multiPoint), 1.003);
        t.end();
    });

    t.test('Line', function(t) {
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, canadaUsBorder.geometry), 16.708);
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, parallel49th.geometry), 372.057);
        t.end();
    });

    t.test('MultiLineString', function(t) {
        var multiLine = {
            type: 'MultiLineString',
            coordinates: [canadaUsBorder.geometry.coordinates, parallel49th.geometry.coordinates]
        };
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, multiLine), 16.708);
        multiLine.coordinates.reverse();
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, multiLine), 16.708);
        t.end();
    });

    t.test('Polygon', function(t) {
        t.equal(distanceToGeometry(mapbox, dcPoly.geometry), 0);
        t.equal(distanceToGeometry(dca, dcPoly.geometry), 0.643);
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, torontoPoly.geometry), 0);
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, dcPoly.geometry), 344.197);
        t.end();
    });

    t.test('MultiPolygon', function(t) {
        var multiPolygon = {
            type: 'MultiPolygon',
            coordinates: [dcPoly.geometry.coordinates, torontoPoly.geometry.coordinates]
        };
        t.equal(distanceToGeometry(mapbox, multiPolygon), 0);
        t.equal(distanceToGeometry(dca, multiPolygon), 0.643);
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, multiPolygon), 0);
        t.end();
    });

    t.test('GeometryCollection', function(t) {
        var geometryCollection = {
            type: 'GeometryCollection',
            geometries: [torontoPoly.geometry, dcPoint.geometry]
        };
        t.equal(distanceToGeometry(torontoPoint.geometry.coordinates, geometryCollection), 0);
        t.equal(distanceToGeometry(mapbox, geometryCollection), 1.003);
        t.end();
    });
    t.end();
});
