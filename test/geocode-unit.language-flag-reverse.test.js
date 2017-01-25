//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {}),
        place: new mem({ maxzoom:6, geocoder_name: 'place', geocoder_format_zh: '{country._name}{region._name}{place._name}' }, function() {}),
    };
    var c = new Carmen(conf);

    tape('index country', function(t) {
        var country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_zh': '中国',
                'carmen:text': 'China'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        addFeature(conf.country, country, t.end);
    });

    tape('index city', function(t) {
        var place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_zh': '北京市',
                'carmen:text': 'Beijing'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        addFeature(conf.place, place, t.end);
    });

    tape('中国 => China', function(t) {
        c.geocode('中国', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'China');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    tape('北京市 => Beijing', function(t) {
        c.geocode('北京市', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    tape('Beijing, China => 中国北京市', function(t) {
        c.geocode('Beijing, China', { limit_verify:1, language: 'zh'}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, '中国北京市');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    tape('北京市, 中国 => Beijing, China', function(t) {
        c.geocode('北京市, 中国', { limit_verify:1}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    //fails
    tape('北京市中国 (BeijingChina) => Beijing, China', function(t) {
        c.geocode('北京市中国', { limit_verify:1}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    //fails
    tape('中国北京市 (ChinaBeijing) => Beijing, China', function(t) {
        c.geocode('中国北京市', { limit_verify:1}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
