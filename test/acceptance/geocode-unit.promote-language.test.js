'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// Tests New York (place), New York (region), USA (country)
// identically-named features should reverse the gappy penalty and
// instead prioritize the highest-index feature
const conf = {
    country: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es'] }, () => {}),
    region: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es'] }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es'], geocoder_inherit_score: true }, () => {})
};

const c = new Carmen(conf);

tape('index country', (t) => {
    queueFeature(conf.country, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'usa',
            'carmen:text_en':'usa'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index region', (t) => {
    queueFeature(conf.region, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'state of new york, new york',
            'carmen:text_es':'nueva york'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index place', (t) => {
    queueFeature(conf.place, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'new york',
            'carmen:text_es':'nueva york'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('find new york', (t) => {
    c.geocode('new york usa', {}, (err, res) => {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 1);
        t.end();
    });
});

tape('find nueva york, language=es', (t) => {
    c.geocode('nueva york usa', { language: 'es' }, (err, res) => {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 0.986667, "query has penalty applied because 'usa' has no es translation");
        t.end();
    });
});

tape('find nueva york, language=ca', (t) => {
    c.geocode('nueva york', { language: 'ca' }, (err, res) => {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 1.00, "query has full relevance because 'nueva york' has no ca translation but es falls back");
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

// Simulate a case where carmen:text has a discrepancy but carmen:text_en
// allows a text match to occur.
const conf2 = {
    country: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es'] }, () => {}),
    region: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es'] }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es'], geocoder_inherit_score: true }, () => {})
};

const c2 = new Carmen(conf2);

tape('index country', (t) => {
    queueFeature(conf2.country, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'saudi arabia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index region', (t) => {
    queueFeature(conf2.region, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text': 'مكة',
            'carmen:text_en':'Makkah'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index place', (t) => {
    queueFeature(conf2.place, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'Makkah Al Mukarramah',
            'carmen:text_en':'Makkah'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf2).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf2[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('find makkah', (t) => {
    c2.geocode('makkah', {}, (err, res) => {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

