var tape = require('tape');
var feature = require('../lib/util/feature.js');

tape('seek', function(assert) {
    var shardString = JSON.stringify({
        1: JSON.stringify({ id: 1 }),
        2: JSON.stringify({ id: 2 }),
    });
    var shardBuffer = new Buffer(shardString);
    assert.deepEqual(feature.seek(shardString, 3), false);
    assert.deepEqual(feature.seek(shardString, 2), { id: 2 });
    assert.deepEqual(feature.seek(shardBuffer, 3), false);
    assert.deepEqual(feature.seek(shardBuffer, 2), { id: 2 });
    assert.end();
});

tape('shard', function(assert) {
    for (var level = 0; level < 7; level++) {
        var shards = {};
        for (var i = 0; i < Math.pow(2,20); i++) {
            var shard = feature.shard(level, i);
            shards[shard] = shards[shard] || 0;
            shards[shard]++;
        }
        var expected = Math.min(Math.pow(2,20), Math.pow(16, level + 1));
        assert.equal(Object.keys(shards).length, expected, 'shardlevel=' + level + ', shards=' + expected);
    }
    assert.end();
});

tape('transform', function(assert) {

    assert.test('transform - basic feature', function(t) {
        var feat = feature.transform({
            _id: 7654,
            _text: "Main Street",
            _geometry: {
                type: "MultiPoint",
                coordinates: [[ -97, 37 ], [ -97.2, 37 ]]
            }
        });
        t.deepEquals(feat, {
            id: 7654,
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street'
            },
            geometry: {
                coordinates: [ [ -97, 37 ], [ -97.2, 37 ] ],
                type: 'MultiPoint'
            }
        });
        t.end();
    });

    assert.test('transform - zxy feature', function(t) {
        var feat = feature.transform({
            _id: 7654,
            _text: "Main Street",
            _zxy: ['6/32/32']
        });
        t.deepEquals(feat, {
            id:7654,
            type: "Feature",
            properties: {
                "carmen:zxy": ['6/32/32'],
                "carmen:text": "Main Street"
            },
            bbox: [ 0, -5.615985819155337, 5.625, 0 ],
            geometry: {
                type:"MultiPolygon",
                coordinates: [[[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]]
            }
        });
        t.end();
    });

    assert.test('transform - cluster', function(t) {
        var feat = feature.transform({
            _id: 7654,
            _text: 'Main Street',
            _cluster: { 2: { type: "Point", coordinates: [0,0] } }
        });
        t.deepEquals(feat, {
            id: 7654,
            type: "Feature",
            properties: {
                'carmen:addressnumber': [[ '2' ]],
                'carmen:text': 'Main Street'
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiPoint',
                    coordinates: [[0,0]]
                }]
            }
        });
        t.end();
    });

    assert.test('transform - range', function(t) {
        var feat = feature.transform({
            _id: "7654",
            _text: "Main Street",
            _center: [ -97.1, 37 ],
            _score: 99,
            _rangetype: "tiger",
            _lfromhn: [ "100", "200" ],
            _ltohn: ["198", "298"],
            _rfromhn: ["101", "201"],
            _rtohn: ["199", "299"],
            _parityl: ["E", "E"],
            _parityr: ["O", "B"],
            _geometry: {
                type: "MultiLineString",
                coordinates: [
                    [[ -97, 37 ],[ -97.2, 37 ],[ -97.2, 37.2 ]],
                    [[ -97.2, 37.2 ],[ -97.4, 37.2 ],[ -97.4, 37.4 ]]
                ]
            }
        });
        t.deepEquals(feat, {
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    coordinates: [ [ [ -97, 37 ], [ -97.2, 37 ], [ -97.2, 37.2 ] ], [ [ -97.2, 37.2 ], [ -97.4, 37.2 ], [ -97.4, 37.4 ] ] ],
                    type: 'MultiLineString'
                }]
            },
            id: '7654',
            properties: {
                'carmen:center': [ -97.1, 37 ],
                'carmen:lfromhn': [[ '100', '200' ]],
                'carmen:ltohn': [[ '198', '298' ]],
                'carmen:parityl': [[ 'E', 'E' ]],
                'carmen:parityr': [[ 'O', 'B' ]],
                'carmen:rangetype': 'tiger',
                'carmen:rfromhn': [[ '101', '201' ]],
                'carmen:rtohn': [[ '199', '299' ]],
                'carmen:score': 99,
                'carmen:text': 'Main Street'
            },
            type: 'Feature' });
        t.end();
    });

    assert.test('transform - range2', function(t) {
        var feat = feature.transform({
            _id: "7654",
            _text: "Main Street",
            _center: [ -97.1, 37 ],
            _score: 99,
            _rangetype: "tiger",
            _lfromhn: "100",
            _ltohn: "198",
            _rfromhn: "201",
            _rtohn: "299",
            _parityl: "E",
            _parityr: "B",
            _geometry: {
                type: "LineString",
                coordinates: [[ -97.2, 37.2 ],[ -97.4, 37.2 ],[ -97.4, 37.4 ]]
            }
        });

        t.deepEquals(feat, {
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    coordinates: [ [ [ -97.2, 37.2 ], [ -97.4, 37.2 ], [ -97.4, 37.4 ] ] ],
                    type: 'MultiLineString'
                }]
            },
            id: '7654',
            properties: {
                'carmen:center': [ -97.1, 37 ],
                'carmen:lfromhn': [[ '100' ]],
                'carmen:ltohn': [[ '198' ]],
                'carmen:parityl': [[ 'E' ]],
                'carmen:parityr': [[ 'B' ]],
                'carmen:rangetype': 'tiger',
                'carmen:rfromhn': [[ '201' ]],
                'carmen:rtohn': [[ '299' ]],
                'carmen:score': 99,
                'carmen:text': 'Main Street'
            },
            type: 'Feature' });
        t.end();
    });

    assert.end();
});
