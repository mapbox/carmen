const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
const fs = require('fs');

const conf = {
    country: new mem(
        { maxzoom: 6, geocoder_languages: ['ru', 'zh'] },
        () => {}
    ),
    region: new mem({ maxzoom: 6, geocoder_languages: ['ru', 'zh'] }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_languages: ['ru', 'zh'] }, () => {})
};
const c = new Carmen(conf);

tape('index country', t => {
    let country = {
        id: 1,
        geometry: {
            type: 'Polygon',
            coordinates: [
                [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
            ]
        },
        properties: {
            'carmen:text': 'Canada',
            'carmen:score': 100,
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.country, country, t.end);
});

tape('index region', t => {
    let region = {
        id: 1,
        geometry: {
            type: 'Polygon',
            coordinates: [
                [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
            ]
        },
        properties: {
            'carmen:text': 'Ontario',
            'carmen:score': 10,
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index place', t => {
    let place = {
        id: 1,
        geometry: {
            type: 'Polygon',
            coordinates: [
                [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
            ]
        },
        properties: {
            // Public properties
            wikidata: 'Q172',
            // Internal text properties
            'carmen:text': 'Toronto',
            'carmen:text_ru': 'Торонто',
            'carmen:text_zh': '多伦多',
            // Internal score property
            'carmen:score': 1,
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.place, place, t.end);
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

tape('Toronto', t => {
    c.geocode('Toronto', {}, (err, res) => {
        t.ifError(err);
        const filepath = __dirname + '/fixtures/output.default.geojson';
        if (process.env.UPDATE)
            fs.writeFileSync(filepath, JSON.stringify(res, null, 4));
        t.deepEqual(
            JSON.parse(JSON.stringify(res)),
            JSON.parse(fs.readFileSync(filepath))
        );
        t.end();
    });
});

tape('Toronto (dev mode)', t => {
    c.geocode('Toronto', { debug: true }, (err, res) => {
        t.ifError(err);
        const filepath = __dirname + '/fixtures/output.dev.geojson';
        if (process.env.UPDATE)
            fs.writeFileSync(filepath, JSON.stringify(res, null, 4));
        t.deepEqual(
            JSON.parse(JSON.stringify(res)),
            JSON.parse(fs.readFileSync(filepath))
        );
        t.end();
    });
});

tape('0,0 (dev mode)', t => {
    c.geocode('0,0', { debug: true }, (err, res) => {
        t.ifError(err);
        const filepath = __dirname + '/fixtures/output.reverse-dev.geojson';
        if (process.env.UPDATE)
            fs.writeFileSync(filepath, JSON.stringify(res, null, 4));
        t.deepEqual(
            JSON.parse(JSON.stringify(res)),
            JSON.parse(fs.readFileSync(filepath))
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
