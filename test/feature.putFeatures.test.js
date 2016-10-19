var tape = require('tape');
var feature = require('../lib/util/feature.js');
var Memsource = require('../lib/api-mem.js');
var Carmen = require('../index.js');

var source = new Memsource(null, function() {});
var conf = { source: source };
var carmen = new Carmen(conf);

tape('putFeatures', function(assert) {
    assert.ok(carmen);
    feature.putFeatures(conf.source, [
        {
            _id: 1,
            _text: 'a',
            _center: [ 0, 0 ],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
        {
            _id: 2,
            _text: 'b',
            _center: [ 0, 0 ],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
        {
            _id: Math.pow(2,20) + 1,
            _text: 'c',
            _center: [360/64+0.001,0],
            _zxy: ['6/33/32']
        },
    ], function(err) {
        assert.ifError(err);
        assert.equal(source._shards.feature[1], '{"1":"Cg1jYXJtZW46Y2VudGVyCgtjYXJtZW46dGV4dAoKY2FybWVuOnp4eRgAKjMKCAgAGgIAAHoAYAJqBzIFWzAsMF1qAwoBYWoNMgtbIjYvMzIvMzIiXXIGAAABAQICegA=","1048577":"CgpjYXJtZW46enh5Cg1jYXJtZW46Y2VudGVyCgtjYXJtZW46dGV4dAoEYmJveCp3Ch0IBRoX0NKuBePFrQUA5MWtBdDSrgUAAOPFrQV6AGCCgIABag0yC1siNi8zMy8zMiJdagsyCVs1LjYyNiwwXWoDCgFjcgYAAAEBAgJqJDIiWzUuNjI1LC01LjYxNTk4NTgxOTE1NTMzNywxMS4yNSwwXXoCAwA="}', 'has feature shard 1');
        assert.equal(source._shards.feature[2], '{"2":"Cg1jYXJtZW46Y2VudGVyCgtjYXJtZW46dGV4dAoKY2FybWVuOnp4eRgAKjMKCAgAGgIAAHoAYARqBzIFWzAsMF1qAwoBYmoNMgtbIjYvMzIvMzIiXXIGAAABAQICegA="}', 'has feature shard 2');
        assert.end();
    });
});

tape('getFeatureByCover', function(assert) {
    feature.getFeatureByCover(conf.source, { id:1, x:32, y:32 }, function(err, data) {
        assert.equal(data.id, 1);
        assert.end();
    });
});

tape('getFeatureByCover', function(assert) {
    feature.getFeatureByCover(conf.source, { id:1, x:33, y:32 }, function(err, data) {
        assert.equal(data.id, 1048577);
        assert.end();
    });
});

tape('getFeatureById', function(assert) {
    feature.getFeatureById(conf.source, 1, function(err, data) {
        assert.equal(data.id, 1);
        assert.end();
    });
});

