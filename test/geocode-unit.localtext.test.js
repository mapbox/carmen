//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({ maxzoom:6 }, function() {}),
    region: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        type: 'Feature',
        properties: {
            'carmen:center': [ 0, 0 ],
            'carmen:zxy': [ '6/30/30' ],
            'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya',
            'carmen:text_ru': 'Российская Федерация',
            'carmen:text_zh_Latn': 'Elousi',
            'carmen:text_es': null
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [ -11.25, 5.615, -5.625, 11.1784 ]
    };
    addFeature(conf.country, country, t.end);
});

tape('index region with bad language code', function(t) {
    var region = {
        type: 'Feature',
        properties: {
            'carmen:center': [ 0, 0 ],
            'carmen:zxy': [ '6/30/30' ],
            'carmen:text_fake': 'beetlejuice',
            'carmen:text': 'Northwestern Federal District,  Severo-Zapadny federalny okrug'
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [ -11.25, 5.615, -5.625, 11.1784 ]
    };
    addFeature(conf.region, region, function(err) {
        t.equal(err.message, 'fake is an invalid language code');
        t.end();
    });
});

tape('russia => Russian Federation', function(t) {
    c.geocode('russia', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

tape('Rossiyskaya =/=> Russian Federation (synonyms are not available in autoc)', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 0, 'No results');
        t.end();
    });
});

tape('Российская => x (no autocomplete)', function(t) {
    c.geocode('Российская', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 0, 'No results');
        t.end();
    });
});

tape('Российская Федерация => Russian Federation', function(t) {
    c.geocode('Российская Федерация', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

// carmen:text_zh_Latn should be indexed as a synonym for _text since
// as zh_Latn is a valid language code with IETF tag
tape('Elousi => Russian Federation', function(t) {
    c.geocode('Elousi', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

// carmen:text_fake should not be indexed as a synonym for _text since
// 'fake' is not a valid language code
tape('beetlejuice => [fail]', function(t) {
    c.geocode('beetlejuice', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.notOk(res.features[0]);
        t.end();
    });
});

//Is not above 0.5 relev so should fail.
tape('fake blah blah => [fail]', function(t) {
    c.geocode('fake blah blah', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.notOk(res.features[0]);
        t.end();
    });
});

