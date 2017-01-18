// Test multitype behavior when multitype spans across another existing index

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    region: new mem({maxzoom:6, geocoder_types:['region','place']}, function() {}),
    district: new mem({maxzoom:6}, function() {}),
    place: new mem({maxzoom:6}, function() {}),
};
var c = new Carmen(conf);

tape('index region', function(t) {
    addFeature(conf.region, {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:types': ['region', 'place'],
            'carmen:text': 'capital',
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('index district', function(t) {
    addFeature(conf.district, {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:text': 'district 1',
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('index district', function(t) {
    addFeature(conf.district, {
        id:2,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:text': 'district 2',
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('index place', function(t) {
    addFeature(conf.place, {
        id:2,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:text': 'smallplace',
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('multitype reverse', function(assert) {
    assert.comment('query:  0,0');
    assert.comment('result: capital');
    assert.comment('note:   shifted reverse');
    c.geocode('0,0', {}, function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.features[0].place_name, 'smallplace, district 1, capital');
        assert.deepEqual(res.features[0].id, 'place.2');
        assert.deepEqual(res.features[0].context, [
            { id: 'district.1', text: 'district 1' },
            { id: 'region.1', text: 'capital' }
        ]);
        assert.end();
    });
});

tape('multitype forward, q=capital', function(assert) {
    assert.comment('query:  capital');
    assert.comment('result: capital');
    assert.comment('note:   shifted forward');
    c.geocode('capital', {}, function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.features[0].place_name, 'capital');
        assert.deepEqual(res.features[0].id, 'place.1');
        assert.deepEqual(res.features[0].context, undefined);
        assert.end();
    });
});
tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

