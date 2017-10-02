const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    region: new mem(
        {
            maxzoom: 6,
            geocoder_stack: ['ca', 'us', 'mx']
        },
        () => {}
    ),
    place: new mem(
        {
            maxzoom: 6,
            geocoder_stack: ['ca', 'us']
        },
        () => {}
    ),
    address: new mem(
        {
            maxzoom: 6,
            geocoder_address: true,
            geocoder_stack: ['us']
        },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index region', t => {
    let region = {
        id: 1,
        properties: {
            'carmen:text': 'Ontario',
            'carmen:zxy': ['6/33/32'],
            'carmen:center': [360 / 64, 0],
            'carmen:geocoder_stack': 'ca',
            'carmen:geocoder_name': 'region'
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index mx region', t => {
    let region = {
        id: 2,
        properties: {
            'carmen:text': 'Veracruz',
            'carmen:zxy': ['6/34/34'],
            'carmen:center': [14, -14],
            'carmen:geocoder_stack': 'mx',
            'carmen:geocoder_name': 'region'
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index us place', t => {
    let place = {
        id: 1,
        properties: {
            'carmen:text': 'Springfield',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:geocoder_name': 'place'
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index ca place', t => {
    let place = {
        id: 2,
        properties: {
            'carmen:text': 'Punkeydoodles Corners',
            'carmen:zxy': ['6/33/32'],
            'carmen:center': [8, -2],
            'carmen:geocoder_stack': 'ca',
            'carmen:geocoder_name': 'place'
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index us address', t => {
    let address = {
        id: 1,
        properties: {
            'carmen:text': 'Evergreen Terrace',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:geocoder_stack': 'us',
            'carmen:geocoder_name': 'address',
            'carmen:addressnumber': ['742']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0]]
        }
    };
    queueFeature(conf.address, address, t.end);
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

tape('reverse - good stack, good type', t => {
    c.geocode('8,-2', { stacks: ['ca'], types: ['place'] }, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features[0].place_name,
            'Punkeydoodles Corners, Ontario'
        );
        t.end();
    });
});

tape('reverse - good stack, bad type, limit set', t => {
    c.geocode(
        '0,0',
        { stacks: ['mx'], types: ['place'], limit: 2 },
        (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features.length,
                0,
                'returns 0 results without error'
            );
            t.end();
        }
    );
});

tape('reverse - bad stack, good type', t => {
    c.geocode('0,0', { stacks: ['us'], types: ['region'] }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 0, 'returns 0 results without error');
        t.end();
    });
});

tape('reverse - good stack, good type, limit set', t => {
    c.geocode(
        '0,0',
        { stacks: ['us'], types: ['place'], limit: 2 },
        (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 feature returned');
            t.deepEqual(res.features[0].place_name, 'Springfield');
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
