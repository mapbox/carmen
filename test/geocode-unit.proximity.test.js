//Proximity flag

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({maxzoom: 1}, function() {}),
    province: new mem({maxzoom: 6}, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'country',
            'carmen:zxy':['1/0/0'],
            'carmen:center':[-100,60]
        }
    };
    addFeature(conf.country, country, t.end);
});
tape('index country', function(t) {
    var country = {
        id:2,
        properties: {
            'carmen:text':'country',
            'carmen:zxy':['1/0/1'],
            'carmen:center':[-60,-20]
        }
    };
    addFeature(conf.country, country, t.end);
});

//Across layers
tape('index province', function(t) {
    var province = {
        id:1,
        properties: {
            'carmen:text':'province',
            'carmen:zxy':['6/17/24'],
            'carmen:center':[-80,40]
        }
    };
    addFeature(conf.province, province, t.end);
});
tape('index province', function(t) {
    var country = {
        id:3,
        properties: {
            'carmen:text':'province',
            'carmen:zxy':['1/1/0'],
            'carmen:center':[145,70]
        }
    };
    addFeature(conf.country, country, t.end);
});
tape('index province', function(t) {
    var province = {
        id:2,
        properties: {
            'carmen:text':'fakeprov',
            'carmen:zxy':['6/14/18'],
            'carmen:center':[-100,60]
        }
    };
    addFeature(conf.province, province, t.end);
});
tape('index province', function(t) {
    var province = {
        id:3,
        properties: {
            'carmen:text':'fakeprov',
            'carmen:zxy':['6/21/35'],
            'carmen:center':[-60,-20]
        }
    };
    addFeature(conf.province, province, t.end);
});

tape('error: invalid options.proximity type', function(t) {
    c.geocode('province', { proximity: 'adsf' }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Proximity must be an array in the form [lon, lat]');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity length', function(t) {
    c.geocode('province', { proximity: [0,0,0] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Proximity must be an array in the form [lon, lat]');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[0] type', function(t) {
    c.geocode('province', { proximity: [{},0] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Proximity lon value must be a number between -180 and 180');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[0] value', function(t) {
    c.geocode('province', { proximity: [-181,0] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Proximity lon value must be a number between -180 and 180');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[1] type', function(t) {
    c.geocode('province', { proximity: [0,{}] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Proximity lat value must be a number between -90 and 90');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[1] value', function(t) {
    c.geocode('province', { proximity: [0,-91] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Proximity lat value must be a number between -90 and 90');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('forward country - single layer - limit', function(t) {
    c.geocode('country', { limit_verify: 1, }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - proximity - single layer - limit', function(t) {
    c.geocode('country', { limit_verify: 1, proximity: [-60,-20] }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.2', 'found country.2');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - proximity - single layer - limit', function(t) {
    c.geocode('country', { limit_verify: 1, proximity: [-100,60] }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - multi layer - limit', function(t) {
    c.geocode('province', { limit_verify: 1, }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'province', 'found province');
        t.equals(res.features[0].id, 'country.3', 'found country.3');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - single layer', function(t) {
    c.geocode('country', { }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - proximity - single layer', function(t) {
    c.geocode('country', { proximity: [-60,-20] }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.2', 'found country.2');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - proximity - single layer', function(t) {
    c.geocode('country', { proximity: [-100,60] }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('forward country - multi layer', function(t) {
    c.geocode('province', { }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'province', 'found province');
        t.equals(res.features[0].id, 'country.3', 'found country.3');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

// Ignores idx hierarchy -- scoredist trumps all
tape('forward country - scoredist wins', function(t) {
    c.geocode('province', { proximity: [-80,40] }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'province, country', 'found province');
        t.equals(res.features[0].id, 'province.1', 'found province.1');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

// Test proximity with multi-part query
tape('forward province - multilayer', function(t) {
    c.geocode('fakeprov country', { proximity: [-100,60], limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'fakeprov, country', 'found province');
        t.equals(res.features[0].id, 'province.2', 'found province.2');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

// Test proximity with multi-part query
tape('forward province - multilayer', function(t) {
    c.geocode('fakeprov country', { proximity: [-60,-20], limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'fakeprov, country', 'found province');
        t.equals(res.features[0].id, 'province.3', 'found province.3');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

