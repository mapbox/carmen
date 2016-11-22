// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({ maxzoom: 6 }, function() {}),
    region: new mem({ maxzoom: 6 }, function() {}),
    place: new mem({ maxzoom: 6 }, function() {}),
    poi_cn: new mem({geocoder_name: 'poi', scoreranges: {landmark: [0.5, 1]}, minscore: 0, maxscore: 500, maxzoom: 14, geocoder_stack: 'cn'}, function() {}),
    poi_au: new mem({geocoder_name: 'poi', scoreranges: {landmark: [0.5, 1]}, minscore: 0, maxscore: 100, maxzoom: 14, geocoder_stack: 'au'}, function() {})
};

var c = new Carmen(conf);
tape('index country', function(t) {
    addFeature(conf.country, {
        id:1,
        properties: {
            'carmen:score':25000,
            'carmen:text':'china',
            'carmen:zxy':['6/52/25'],
            'carmen:center': [113.65, 34.75],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index region', function(t) {
    addFeature(conf.region, {
        id:1,
        properties: {
            'carmen:score':3500,
            'carmen:text':'china',
            'carmen:zxy':['6/52/25'],
            'carmen:center': [113.65, 34.75],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index place', function(t) {
    addFeature(conf.place, {
        id:1,
        properties: {
            'carmen:score':2500,
            'carmen:text':'china',
            'carmen:zxy':['6/52/25'],
            'carmen:center': [113.65, 34.75],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index poi landmark', function(t) {
    addFeature(conf.poi_cn, {
        id:1,
        properties: {
            'carmen:score':500,
            'carmen:text':'china lm',
            'carmen:center': [113.65, 34.75],
            'carmen:geocoder_stack':'cn'
        },
        geometry: {
            type: "Point",
            coordinates: [113.65, 34.75]
        }
    }, t.end);
});
tape('index poi', function(t) {
    addFeature(conf.poi_cn, {
        id:2,
        properties: {
            'carmen:score':5,
            'carmen:text':'china poi',
            'carmen:center': [113.65, 34.75],
            'carmen:geocoder_stack':'cn'
        },
        geometry: {
            type: "Point",
            coordinates: [113.65, 34.75]
        }
    }, t.end);
});
tape('index offset poi', function(t) {
    addFeature(conf.poi_cn, {
        id:3,
        properties: {
            'carmen:score':5,
            'carmen:text':'china poi (offset)',
            'carmen:center': [113.651, 34.75],
            'carmen:geocoder_stack':'cn'
        },
        geometry: {
            type: "Point",
            coordinates: [113.651, 34.75]
        }
    }, t.end);
});

// invalid options.types type
tape('china types: "asdf"', function(t) {
    c.geocode('china', { types: 'asdf' }, function(err, res) {
        t.equal(err && err.toString(), 'Error: options.types must be an array with at least 1 type');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// invalid options.types length
tape('china types: []', function(t) {
    c.geocode('china', { types: [] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: options.types must be an array with at least 1 type');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// invalid options.types[0] value
tape('china types: ["asdf"]', function(t) {
    c.geocode('china', { types: ['asdf'] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Type "asdf" is not a known type. Must be one of: country, region, place, poi, poi.landmark');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

//poi.landmark beats poi
tape('china types: ["poi.landmark"]', function(t) {
    c.geocode('china', { types:['poi.landmark'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].text, 'china lm', 'landmarks beat pois');
        t.end();
    });
});

// poi, poi.landmark returns all poi features
tape('china types:[poi.landmark, poi]', function(t) {
    c.geocode('china', { types:['poi.landmark', 'poi'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 3, '3 results');
        t.deepEqual(res.features[0].text, 'china lm', 'subtypes work');
        t.end();
    });
});

// poi returns poi.landmark features also
tape('china poi returns poi.landmark also', function(t) {
    c.geocode('china', { types:['poi'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 3, '2 results');
        t.deepEqual(res.features[0].text, 'china lm', 'landmark ranks higher than poi.');
        t.end();
    });
});

// place wins without type filter
tape('china', function(t) {
    c.geocode('china', { limit_verify:4 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 4, '4 results');
        t.deepEqual(res.features[0].id, 'place.1', 'place wins');
        t.end();
    });
});

// types: place
tape('china', function(t) {
    c.geocode('china', { limit_verify:3, types:['place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'place.1', 'place wins');
        t.end();
    });
});

// types: region, place
tape('china', function(t) {
    c.geocode('china', { limit_verify:3, types:['region','place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'place.1', 'place #1');
        t.deepEqual(res.features[1].id, 'region.1', 'region #2');
        t.end();
    });
});

// reverse without type filter
tape('reverse', function(t) {
    c.geocode('113.65,34.75', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 4, '4 results, 1 per layer type');
        t.deepEqual(res.features[0].id, 'poi.1', 'poi wins');
        t.end();
    });
});

tape('reverse: country', function(t) {
    c.geocode('113.65,34.75', { types:['country'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'country.1', 'country wins');
        t.end();
    });
});

tape('reverse: country,place', function(t) {
    c.geocode('113.65,34.75', { types:['country','place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'place.1', '1: place');
        t.deepEqual(res.features[0].context, [
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including region)');
        t.deepEqual(res.features[1].id, 'country.1', '2: country');
        t.deepEqual(res.features[1].context, undefined);
        t.end();
    });
});

tape('reverse: poi', function(t) {
    c.geocode('113.65,34.75', { types:['poi'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 results');
        t.deepEqual(res.features[0].context, [
            { id: 'place.1', text: 'china' },
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including place, region, country)');
        t.end();
    });
});

tape('reverse: poi.landmark', function(t) {
    c.geocode('113.65,34.75', { types:['poi.landmark'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 results');
        t.deepEqual(res.features[0].text, 'china lm', 'landmark is top result');
        t.deepEqual(res.features[0].context, [
            { id: 'place.1', text: 'china' },
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including place, region, country)');
        t.end();
    });
});

tape('reverse returns offset point when its location is specified', function(t) {
    c.geocode('113.651,34.75', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 4, '4 results (limit=1 reverse query splits context into features)');
        t.deepEqual(res.features[0].text, 'china poi (offset)', 'found offset point');
        t.end();
    });
});


tape('reverse returns landmark point when offset queried w/ filter=poi.landmark', function(t) {
    c.geocode('113.651,34.75', { types: ['poi.landmark'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 results (types filter suppresses split context features)');
        t.deepEqual(res.features[0].text, 'china lm', 'found landmark');
        t.end();
    });
});

tape('reverse returns offset point when offset location is specified, queried w/ filter=poi,poi.landmark', function(t) {
    c.geocode('113.651, 34.75', { types: ['poi', 'poi.landmark'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].text, 'china poi (offset)', 'found offset point');
        t.end();
    });
});

tape('reverse returns offset point when offset queried location is specified, w/ filter=poi.landmark,poi', function(t) {
    c.geocode('113.651, 34.75', { types: ['poi.landmark', 'poi'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].text, 'china poi (offset)', 'found offset point');
        t.end();
    });
});

tape('reverse: poi (limit 5, expect 3)', function(t) {
    c.geocode('113.65,34.75', { types:['poi'], limit: 5 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 3, '3 results');
        t.deepEqual(res.features[0].context, [
            { id: 'place.1', text: 'china' },
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including place, region, country)');
        t.deepEqual(res.features[1].context, [
            { id: 'place.1', text: 'china' },
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including place, region, country)');
        t.notEqual(res.features[0].id, res.features[1].id, 'returned different features');
        t.end();
    });
});

tape('reverse: poi.landmark (limit 5, expect 1)', function(t) {
    c.geocode('113.65,34.75', { types: ['poi.landmark'], limit: 5 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 results');
        t.deepEqual(res.features[0].text, 'china lm', 'landmark is top result');
        t.deepEqual(res.features[0].context, [
            { id: 'place.1', text: 'china' },
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including place, region, country)');
        t.end();
    });
});

tape('index second poi (nonlandmark)', function(t) {
    addFeature(conf.poi_au, {
        id:3,
        properties: {
            'carmen:score':50,
            'carmen:text':'australia nonlandmark',
            'carmen:zxy':['14/15152/9491'],
            'carmen:center':[152.94, -27.44]
        }
    }, t.end);
});

tape('index second poi (landmark)', function(t) {
    addFeature(conf.poi_au, {
        id:4,
        properties: {
            'carmen:score':51,
            'carmen:text':'australia landmark',
            'carmen:zxy':['14/15152/9491'],
            'carmen:center':[152.94, -27.44]
        }
    }, t.end);
});

tape('index third poi (ambiguous landmark)', function(t) {
    addFeature(conf.poi_au, {
        id:5,
        properties: {
            'carmen:score':51,
            'carmen:text':'china lm',
            'carmen:zxy':['14/15152/9491'],
            'carmen:center':[152.94, -27.44]
        }
    }, t.end);
});

tape('fwd: landmark filtering works w/ diff score ranges', function(t) {
    c.geocode('china lm', { types:['poi.landmark'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.ok(res.features.map(function(x) { return x.text; }).indexOf('china lm') !== -1, 'cn landmark in results');
        t.ok(res.features.map(function(x) { return x.id; }).indexOf('poi.5') !== -1, 'au landmark in results');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});