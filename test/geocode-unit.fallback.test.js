const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    region: new mem({ maxzoom: 6 }, () => {}),
    place: new mem({ maxzoom: 6 }, () => {}),
    postcode: new mem({ maxzoom: 6 }, () => {}),
    address: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    )
};
const c = new Carmen(conf);

const coldCityCenter = [10, 0];
const seattleCenter = [0, 0];

//Place 1: Cold City
tape('index place "Cold City"', t => {
    let place = {
        id: 105,
        properties: {
            'carmen:text': 'Cold City',
            'carmen:center': coldCityCenter
        },
        geometry: {
            type: 'Point',
            coordinates: coldCityCenter
        }
    };
    queueFeature(conf.place, place, t.end);
});

//Address 1 in Cold City
tape('index address "Main St" in "Cold City"', t => {
    let address = {
        id: 100,
        properties: {
            'carmen:text': 'Main St',
            'carmen:center': coldCityCenter,
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [coldCityCenter]
        }
    };
    queueFeature(conf.address, address, t.end);
});

//Address 2 in Cold City
tape('index address "Market" in "Cold City"', t => {
    let address = {
        id: 101,
        properties: {
            'carmen:text': 'Market',
            'carmen:center': coldCityCenter,
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [coldCityCenter]
        }
    };
    queueFeature(conf.address, address, t.end);
});

//Place 2: Seattle
tape('index place Seattle', t => {
    let place = {
        id: 100,
        properties: {
            'carmen:text': 'Seattle',
            'carmen:center': seattleCenter
        },
        geometry: {
            type: 'Point',
            coordinates: seattleCenter
        }
    };
    queueFeature(conf.place, place, t.end);
});

//Postcode 1: Centered to line up with Seattle
tape('index postcode "12345" in Seattle', t => {
    let postcode = {
        id: 100,
        properties: {
            'carmen:text': '12345',
            'carmen:center': seattleCenter
        },
        geometry: {
            type: 'Point',
            coordinates: seattleCenter
        }
    };
    queueFeature(conf.postcode, postcode, t.end);
});

//Region 1: Centered to line up with Seattle
tape('index region "Washington" lines up with Seattle', t => {
    let region = {
        id: 100,
        properties: {
            'carmen:text': 'Washington',
            'carmen:center': seattleCenter
        },
        geometry: {
            type: 'Point',
            coordinates: seattleCenter
        }
    };
    queueFeature(conf.region, region, t.end);
});
tape('build queued features', t => {
    const q = queue();
    Object.keys(conf).forEach(c => {
        q.defer(cb => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

//Make a mismatched query with a street(100 Main St - containing 3 tokens) in Cold City and postcode, place and region layers lining up with Seattle, Washington
tape(
    '3(Cold City) vs 3(Seattle): 100 Main St, 12345 Seattle, Washington',
    t => {
        c.geocode(
            '100 Main St, 12345 Seattle, Washington',
            { limit_verify: 1 },
            (err, res) => {
                t.ifError(err);
                t.equals(
                    res.features[0].place_name,
                    '12345, Seattle, Washington',
                    'matches Seattle instead of address'
                );
                t.equals(res.features.length, 1);
                t.equals(
                    res.features[0].id,
                    'postcode.100',
                    'found postcode.id'
                );
                t.end();
            }
        );
    }
);

//Make a mismatched query with a street(100 Market - containing 2 tokens) in Cold City and postcode, place and region layers lining up with Seattle, Washington
tape('2(Cold City) vs 3(Seattle): 100 Market 12345 Seattle Washington', t => {
    c.geocode(
        '100 Market 12345 Seattle Washington',
        { limit_verify: 1 },
        (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '12345, Seattle, Washington');
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'postcode.100', 'found address.id');
            t.end();
        }
    );
});

//Make a mismatched query with a street(100 Main St - containing 3 tokens) in Cold City and place and region layers lining up with Seattle, Washington
tape('3(Cold City) vs 2(Seattle): 100 Main St, Seattle Washington', t => {
    c.geocode(
        '100 Main St, Seattle Washington',
        { limit_verify: 1 },
        (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Seattle, Washington');
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.100', 'found place.id');
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
