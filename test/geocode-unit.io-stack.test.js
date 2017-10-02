// Unit tests for IO-deduping when loading grid shards during spatialmatch.
// Setups up multiple indexes representing logical equivalents.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Setup includes the api-mem `timeout` option to simulate asynchronous I/O.
const conf = {
    place1: new mem(
        { maxzoom: 6, geocoder_name: 'place', timeout: 10 },
        () => {}
    ),
    place2: new mem(
        { maxzoom: 6, geocoder_name: 'place', timeout: 10 },
        () => {}
    ),
    place3: new mem(
        { maxzoom: 6, geocoder_name: 'place', timeout: 10 },
        () => {}
    ),
    street1: new mem(
        {
            maxzoom: 6,
            geocoder_name: 'street',
            timeout: 10,
            geocoder_address: 1
        },
        () => {}
    ),
    street2: new mem(
        {
            maxzoom: 6,
            geocoder_name: 'street',
            timeout: 10,
            geocoder_address: 1
        },
        () => {}
    ),
    street3: new mem(
        {
            maxzoom: 6,
            geocoder_name: 'street',
            timeout: 10,
            geocoder_address: 1
        },
        () => {}
    )
};
const c = new Carmen(conf);

tape('ready', t => {
    c._open(t.end);
});

[1, 2, 3].forEach(i => {
    tape('index place ' + i, t => {
        queueFeature(
            conf['place' + i],
            {
                id: 1,
                properties: {
                    'carmen:text': 'springfield',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index street ' + i, t => {
        queueFeature(
            conf['street' + i],
            {
                id: 1,
                properties: {
                    'carmen:text': 'winding river rd',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index street ' + i, t => {
        queueFeature(
            conf['street' + i],
            {
                id: 2,
                properties: {
                    'carmen:text': 'river rd',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index street ' + i, t => {
        queueFeature(
            conf['street' + i],
            {
                id: 3,
                properties: {
                    'carmen:text': 'springfield st',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
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
});

function reset() {
    context.getTile.cache.reset();
    [1, 2, 3].forEach(i => {
        conf['place' + i]._original.logs.getGeocoderData = [];
        conf['place' + i]._original.logs.getTile = [];
        conf['street' + i]._original.logs.getGeocoderData = [];
        conf['street' + i]._original.logs.getTile = [];
    });
}

tape('winding river rd springfield', t => {
    reset();
    c.geocode('winding river rd  springfield', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features[0].place_name,
            'winding river rd, springfield'
        );
        t.deepEqual(
            c.indexes.place1._original.logs.getGeocoderData,
            [],
            'place1: loads nothing'
        );
        t.deepEqual(
            c.indexes.place1._original.logs.getTile,
            ['6,32,32'],
            'place1: loads 1 tile'
        );

        t.deepEqual(
            c.indexes.street1._original.logs.getGeocoderData.sort(),
            ['feature,1', 'feature,2'],
            'street1: loads 1 feature per result'
        );
        t.deepEqual(
            c.indexes.street1._original.logs.getTile,
            [],
            'street1: loads no tiles (most specific index)'
        );
        t.end();
    });
});

tape('springfield', t => {
    reset();
    c.geocode('springfield', {}, (err, res) => {
        t.ifError(err);

        t.deepEqual(res.features.length, 2);
        t.deepEqual(res.features[0].place_name, 'springfield');
        t.deepEqual(res.features[0].id, 'place.1');
        t.deepEqual(res.features[1].place_name, 'springfield st, springfield');
        t.deepEqual(res.features[1].id, 'street.3');

        t.deepEqual(
            c.indexes.place1._original.logs.getGeocoderData.sort(),
            ['feature,1'],
            'place1: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.place1._original.logs.getTile,
            ['6,32,32'],
            'place1: loads 1 tile'
        );

        t.deepEqual(
            c.indexes.street1._original.logs.getGeocoderData.sort(),
            ['feature,3'],
            'street1: loads 1 feature per result'
        );
        t.deepEqual(
            c.indexes.street1._original.logs.getTile,
            [],
            'street1: loads no tiles (most specific index)'
        );
        t.end();
    });
});

tape('springfield, types=place', t => {
    reset();
    c.geocode('springfield', { types: ['place'] }, (err, res) => {
        t.ifError(err);

        t.deepEqual(res.features.length, 1);
        t.deepEqual(res.features[0].place_name, 'springfield');
        t.deepEqual(res.features[0].id, 'place.1');

        t.deepEqual(
            c.indexes.place1._original.logs.getGeocoderData.sort(),
            ['feature,1'],
            'place1: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.place1._original.logs.getTile,
            [],
            'place1: loads 0 tiles'
        );

        t.deepEqual(
            c.indexes.street1._original.logs.getGeocoderData.sort(),
            [],
            'street1: no io'
        );
        t.deepEqual(
            c.indexes.street1._original.logs.getTile,
            [],
            'street1: no io'
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
