const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    address: new mem(
        {
            maxzoom: 6,
            geocoder_type: 'address',
            geocoder_name: 'address'
        },
        () => {}
    ),
    poi: new mem(
        {
            maxzoom: 6,
            geocoder_type: 'poi',
            geocoder_name: 'address',
            geocoder_reverse_mode: true
        },
        () => {}
    )
};
const c = new Carmen(conf);

tape('add POIs', t => {
    let poi = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'a',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    };
    queueFeature(conf.poi, poi, t.end);
});

tape('add POIs', t => {
    let poi = {
        id: 2,
        type: 'Feature',
        properties: {
            'carmen:text': 'b',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0.1, -0.1]
        },
        geometry: {
            type: 'Point',
            coordinates: [0.1, -0.1]
        }
    };
    queueFeature(conf.poi, poi, t.end);
});

tape('add POIs', t => {
    let poi = {
        id: 3,
        type: 'Feature',
        properties: {
            'carmen:text': 'c',
            'carmen:score': '10000',
            'carmen:zxy': ['6/32/31'],
            'carmen:center': [1.005, 1.005]
        },
        geometry: {
            type: 'Point',
            coordinates: [1.005, 1.005]
        }
    };
    queueFeature(conf.poi, poi, t.end);
});

tape('add POIs', t => {
    let poi = {
        id: 4,
        type: 'Feature',
        properties: {
            'carmen:text': 'd',
            'carmen:score': '10',
            'carmen:zxy': ['6/32/31'],
            'carmen:center': [1.006, 1.006]
        },
        geometry: {
            type: 'Point',
            coordinates: [1.006, 1.006]
        }
    };
    queueFeature(conf.poi, poi, () => {
        buildQueued(conf.poi, t.end);
    });
});

tape('add address', t => {
    let address = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'e',
            'carmen:score': '1',
            'carmen:zxy': ['6/32/31'],
            'carmen:center': [1.0071, 1.0071]
        },
        geometry: {
            type: 'Point',
            coordinates: [1.006, 1.006]
        }
    };

    queueFeature(conf.address, address, () => {
        buildQueued(conf.address, t.end);
    });
});

tape('invalid', t => {
    c.geocode('0,0', { reverseMode: 'foo' }, (err, res) => {
        t.deepEqual(
            err && err.toString(),
            'Error: foo is not a valid reverseMode. Must be one of: score, distance'
        );
    });

    t.end();
});

tape('reverse distance threshold - close enough', t => {
    c.geocode('0.106,-0.106', {}, (err, res) => {
        t.deepEqual(
            res.features.length,
            1,
            'finds a feature when coords are off by .006'
        );
    });

    t.end();
});

tape('reverse distance threshold - too far', t => {
    c.geocode('0.107,-0.107', {}, (err, res) => {
        t.deepEqual(
            res.features.length,
            0,
            'does not find a feature when coords are off by .007'
        );
    });

    t.end();
});

tape('get the higher-scored, more distant feature first', t => {
    c.geocode('1.007, 1.007', { reverseMode: 'score' }, (err, res) => {
        t.deepEqual(
            res.features[0].id,
            'poi.3',
            'higher-scored feature comes back first'
        );
    });

    t.end();
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
