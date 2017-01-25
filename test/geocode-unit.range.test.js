var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    region: new mem({
        maxzoom: 6,
        geocoder_stack: ['ca', 'us', 'mx']
    }, function() {}),
    place: new mem({
        maxzoom: 6,
        geocoder_stack: ['ca', 'us']
    }, function() {}),
    address: new mem({
        maxzoom: 6,
        geocoder_address: true,
        geocoder_stack: ['us']
    }, function() {})
};
var c = new Carmen(conf);

tape('index region', function(t) {
    var region = {
        id:1,
        properties: {
            'carmen:text':'Ontario',
            'carmen:zxy':['6/33/32'],
            'carmen:center':[360/64,0],
            'carmen:geocoder_stack': 'ca',
            'carmen:geocoder_name': 'region'
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index mx region', function(t) {
    var region = {
        id:2,
        properties: {
            'carmen:text':'Veracruz',
            'carmen:zxy':['6/34/34'],
            'carmen:center':[14,-14],
            'carmen:geocoder_stack': 'mx',
            'carmen:geocoder_name': 'region'
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index us place', function(t) {
    var place = {
        id:1,
        properties: {
            'carmen:text':'Springfield',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_name': 'place'
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index ca place', function(t) {
    var place = {
        id:2,
        properties: {
            'carmen:text':'Punkeydoodles Corners',
            'carmen:zxy':['6/33/32'],
            'carmen:center':[8,-2],
            'carmen:geocoder_stack': 'ca',
            'carmen:geocoder_name': 'place'
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index us address', function(t) {
    var address = {
        id:1,
        properties: {
            'carmen:text':'Evergreen Terrace',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_stack': 'us',
            'carmen:geocoder_name': 'address',
            'carmen:addressnumber': ['742']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('reverse - good stack, good type', function(t) {
    c.geocode('8,-2', { stacks: ['ca'], types: ['place']  }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Punkeydoodles Corners, Ontario');
        t.end();
    });
});

tape('reverse - good stack, bad type, limit set', function(t) {
    c.geocode('0,0', { stacks: ['mx'], types: ['place'], limit: 2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 0, 'returns 0 results without error');
        t.end();
    });
});

tape('reverse - bad stack, good type', function(t) {
    c.geocode('0,0', { stacks: ['us'], types: ['region'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 0, 'returns 0 results without error');
        t.end();
    });
});

tape('reverse - good stack, good type, limit set', function(t) {
    c.geocode('0,0', { stacks: ['us'], types: ['place'], limit: 2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 feature returned');
        t.deepEqual(res.features[0].place_name, 'Springfield');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
