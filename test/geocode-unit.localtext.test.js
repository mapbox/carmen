//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem(
        { maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] },
        () => {}
    ),
    region: new mem(
        { maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index region with bad language code', t => {
    const conf2 = {
        country: new mem(
            { maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] },
            () => {}
        ),
        region: new mem(
            { maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] },
            () => {}
        )
    };
    const c2 = new Carmen(conf2);
    t.ok(c2);
    let region = {
        type: 'Feature',
        properties: {
            'carmen:center': [0, 0],
            'carmen:zxy': ['6/30/30'],
            'carmen:text_fake': 'beetlejuice',
            'carmen:text':
                'Northwestern Federal District,  Severo-Zapadny federalny okrug'
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [-11.25, 5.615, -5.625, 11.1784]
    };
    queueFeature(conf2.region, region, () => {
        buildQueued(conf2.region, err => {
            t.equal(err.message, 'fake is an invalid language code');
            t.end();
        });
    });
});

tape('index country', t => {
    let country = {
        type: 'Feature',
        properties: {
            'carmen:center': [0, 0],
            'carmen:zxy': ['6/30/30'],
            'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya',
            'carmen:text_ru': 'Российская Федерация',
            'carmen:text_zh_Latn': 'Elousi',
            'carmen:text_es': null
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [-11.25, 5.615, -5.625, 11.1784]
    };
    queueFeature(conf.country, country, t.end);
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

tape('russia => Russian Federation', t => {
    c.geocode('russia', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

tape(
    'Rossiyskaya ==> Russian Federation (synonyms are not available in autoc)',
    t => {
        c.geocode('Rossiyskaya', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation');
            t.deepEqual(res.features[0].id, 'country.2');
            t.deepEqual(res.features[0].id, 'country.2');
            t.equal(
                res.features[0].matching_place_name,
                'Rossiyskaya Federatsiya',
                'matching_place_name contains synonym text'
            );
            t.end();
        });
    }
);

tape(
    'Российская => Russian Federation (autocomplete without language flag)',
    t => {
        c.geocode('Российская', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(res.features[0].place_name, 'Russian Federation');
            t.ok(
                res.features[0].relevance <= 0.9,
                'Relevance penalty was applied for out-of-language match'
            );
            t.deepEqual(res.features[0].id, 'country.2');
            t.deepEqual(res.features[0].id, 'country.2');
            t.end();
        });
    }
);

tape(
    'Российская => Российская Федерация (autocomplete with language flag)',
    t => {
        c.geocode(
            'Российская',
            { limit_verify: 1, language: 'ru' },
            (err, res) => {
                t.ifError(err);
                t.deepEqual(res.features.length, 1, '1 result');
                t.deepEqual(res.features[0].place_name, 'Российская Федерация');
                t.deepEqual(res.features[0].language, 'ru');
                t.ok(
                    res.features[0].relevance > 0.9,
                    'No relevance penalty was applied for in-language match'
                );
                t.deepEqual(res.features[0].id, 'country.2');
                t.deepEqual(res.features[0].id, 'country.2');
                t.end();
            }
        );
    }
);

tape(
    'Российская => Российская Федерация (autocomplete with multilanguage flag uses first)',
    t => {
        c.geocode(
            'Российская',
            { limit_verify: 1, language: 'en,ru' },
            (err, res) => {
                t.ifError(err);
                t.deepEqual(res.features.length, 1, '1 result');
                t.deepEqual(res.features[0].place_name, 'Russian Federation');
                t.ok(
                    res.features[0].relevance <= 0.9,
                    'Relevance penalty was applied for out-of-language match'
                );
                t.deepEqual(
                    res.features[0].place_name_ru,
                    'Российская Федерация'
                );
                t.deepEqual(res.features[0].id, 'country.2');
                t.end();
            }
        );
    }
);

tape('Российская Федерация => Russian Federation', t => {
    c.geocode('Российская Федерация', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

// carmen:text_zh_Latn should be indexed as a synonym for _text since
// as zh_Latn is a valid language code with IETF tag
tape('Elousi => Russian Federation', t => {
    c.geocode('Elousi', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

// carmen:text_fake should not be indexed as a synonym for _text since
// 'fake' is not a valid language code
tape('beetlejuice => [fail]', t => {
    c.geocode('beetlejuice', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.notOk(res.features[0]);
        t.end();
    });
});

//Is not above 0.5 relev so should fail.
tape('fake blah blah => [fail]', t => {
    c.geocode('fake blah blah', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.notOk(res.features[0]);
        t.end();
    });
});
