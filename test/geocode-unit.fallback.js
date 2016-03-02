var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    region: new mem({maxzoom: 6}, function() {}),
    place: new mem({maxzoom: 6}, function() {}),
    postcode: new mem({maxzoom: 6}, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);

var coldCityCenter = [10,0];
var seattleCenter = [0,0];

//Place 1: Cold City
tape('index place "Cold City"', function(t) {
    var place = {
        id:105,
        properties: {
            'carmen:text':'Cold City',
            'carmen:center':coldCityCenter
        },
        geometry: {
            type: 'Point',
            coordinates: coldCityCenter
        }
    };
    addFeature(conf.place, place, t.end);
});

//Address 1 in Cold City
tape('index address "Main St" in "Cold City"', function(t) {
    
    var address = {
        id:100,
        properties: {
            'carmen:text':'Main St',
            'carmen:center':coldCityCenter,
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [coldCityCenter]
        }
    };
    addFeature(conf.address, address, t.end);
});

//Address 2 in Cold City
tape('index address "Market" in "Cold City"', function(t) {
    var address = {
        id:101,
        properties: {
            'carmen:text':'Market',
            'carmen:center':coldCityCenter,
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [coldCityCenter]
        }
    };
    addFeature(conf.address, address, t.end);
});

//Place 2: Seattle
tape('index place Seattle', function(t) {

    var place = {
        id:100,
        properties: {
            'carmen:text':'Seattle',
            'carmen:center':seattleCenter
        },
        geometry: {
            type: 'Point',
            coordinates: seattleCenter
        }
    };
    addFeature(conf.place, place, t.end);
});

//Postcode 1: Centered to line up with Seattle
tape('index postcode "12345" in Seattle', function(t) {
    var postcode = {
        id:100,
        properties: {
            'carmen:text':'12345',
            'carmen:center': seattleCenter
        },
        geometry: {
            type: 'Point',
            coordinates: seattleCenter
        }
    };
    addFeature(conf.postcode, postcode, t.end);
});

//Region 1: Centered to line up with Seattle 
tape('index region "Washington" lines up with Seattle', function(t) {
    var region = {
        id:100,
        properties: {
            'carmen:text':'Washington',
            'carmen:center': seattleCenter
        },
        geometry: {
            type: 'Point',
            coordinates: seattleCenter
        }
    };
    addFeature(conf.region, region, t.end);
});

//Make a mismatched query with a street(100 Main St - containing 3 tokens) in Cold City and postcode, place and region layers lining up with Seattle, Washington
tape('3(Cold City) vs 3(Seattle): 100 Main St, 12345 Seattle, Washington', function(t) {
    c.geocode('100 Main St, 12345 Seattle, Washington', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        // console.log(JSON.stringify(res));
        t.equals(res.features[0].place_name, '12345, Seattle, Washington', 'matches Seattle instead of address');
        t.equals(res.features.length, 1);
        t.equals(res.features[0].id, 'postcode.100', 'found postcode.id');
        t.end();
    });
});

//Make a mismatched query with a street(100 Market - containing 2 tokens) in Cold City and postcode, place and region layers lining up with Seattle, Washington
tape('2(Cold City) vs 3(Seattle): 100 Market 12345 Seattle Washington', function(t) {
    c.geocode('100 Market 12345 Seattle Washington', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '12345, Seattle, Washington');
        t.equals(res.features.length, 1);
        t.equals(res.features[0].id, 'postcode.100', 'found address.id');
        t.end();
    });
});

//Make a mismatched query with a street(100 Main St - containing 3 tokens) in Cold City and place and region layers lining up with Seattle, Washington
tape('3(Cold City) vs 2(Seattle): 100 Main St, Seattle Washington', function(t) {
    c.geocode('100 Main St, Seattle Washington', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 Main St, Cold City');
        t.equals(res.features.length, 1);
        t.equals(res.features[0].id, 'address.100', 'found address.id');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});
