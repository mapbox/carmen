const filter = require('../lib/util/filter');
const tape = require('tape');

tape('filter.sourceMatchesStacks', t => {
    t.ok(
        filter.sourceMatchesStacks(
            {
                stack: undefined
            },
            {
                stacks: ['us', 'ca']
            }
        ),
        'allowed: source without stack'
    );
    t.ok(
        filter.sourceMatchesStacks(
            {
                stack: ['ca']
            },
            {
                stacks: ['us', 'ca']
            }
        ),
        'allowed: stack intersect'
    );
    t.notOk(
        filter.sourceMatchesStacks(
            {
                stack: ['de']
            },
            {
                stacks: ['us', 'ca']
            }
        ),
        'disallowed: stack disjoint'
    );
    t.end();
});

tape('filter.sourceMatchesTypes', t => {
    t.ok(
        filter.sourceMatchesTypes(
            {
                types: ['region']
            },
            {
                types: ['region', 'place']
            }
        ),
        'allowed: source with matching type'
    );
    t.ok(
        filter.sourceMatchesTypes(
            {
                types: ['region'],
                scoreranges: { a: [], b: [] }
            },
            {
                types: ['region.a', 'region.d']
            }
        ),
        'allowed: source with matching subtype'
    );
    t.ok(
        filter.sourceMatchesTypes(
            {
                types: ['region'],
                scoreranges: { a: [], b: [] }
            },
            {
                types: ['region.b', 'region.d']
            }
        ),
        'allowed: source with matching subtype'
    );
    t.notOk(
        filter.sourceMatchesTypes(
            {
                types: ['region'],
                scoreranges: { a: [], b: [] }
            },
            {
                types: ['region.c', 'region.d']
            }
        ),
        'disallowed: source with non-matched subtype'
    );
    t.end();
});

tape('filter.featureMatchesStacks', t => {
    t.ok(
        filter.featureMatchesStacks(
            {
                properties: { 'carmen:geocoder_stack': undefined }
            },
            {
                stacks: ['us', 'ca']
            }
        ),
        'allowed: source without stack'
    );
    t.ok(
        filter.featureMatchesStacks(
            {
                properties: { 'carmen:geocoder_stack': 'ca' }
            },
            {
                stacks: ['us', 'ca']
            }
        ),
        'allowed: stack intersect'
    );
    t.notOk(
        filter.featureMatchesStacks(
            {
                properties: { 'carmen:geocoder_stack': 'de' }
            },
            {
                stacks: ['us', 'ca']
            }
        ),
        'disallowed: stack disjoint'
    );
    t.end();
});

tape('filter.featureMatchesTypes', t => {
    const source = {
        scoreranges: { popular: [0.5, 1.0] },
        maxscore: 10
    };

    t.ok(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region'] }
            },
            {
                types: ['region']
            }
        ),
        'allowed: feature with matching type'
    );

    t.ok(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region', 'place'] }
            },
            {
                types: ['place']
            }
        ),
        'allowed: feature with matching type'
    );

    t.ok(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region'] }
            },
            {
                types: ['place', 'region']
            }
        ),
        'allowed: feature with matching type'
    );

    t.ok(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region'], 'carmen:score': 8 }
            },
            {
                types: ['place', 'region.popular']
            }
        ),
        'allowed: feature with matching subtype'
    );

    t.notOk(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region'] }
            },
            {
                types: ['place']
            }
        ),
        'disallowed: feature without matching type'
    );

    t.notOk(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region'], 'carmen:score': 2 }
            },
            {
                types: ['region.popular']
            }
        ),
        'disallowed: feature without matching subtype'
    );

    t.notOk(
        filter.featureMatchesTypes(
            source,
            {
                properties: { 'carmen:types': ['region'] }
            },
            {
                types: ['region.popular']
            }
        ),
        'disallowed: feature without matching subtype'
    );

    t.end();
});

tape('filter.featureMatchesLanguage', t => {
    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: { 'carmen:text': 'New York' }
            },
            {
                language: ['en']
            }
        ),
        'allowed: languageMode !== strict'
    );

    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: { 'carmen:text': 'New York' }
            },
            {
                languageMode: 'strict'
            }
        ),
        'allowed: language is not defined'
    );

    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: { 'carmen:text_en': 'New York' }
            },
            {
                language: ['en'],
                languageMode: 'strict'
            }
        ),
        'allowed: matching language text'
    );

    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: { 'carmen:text_zh': '纽约州' }
            },
            {
                language: ['zh_TW'],
                languageMode: 'strict'
            }
        ),
        'allowed: matching language text'
    );

    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: {
                    'carmen:text_en': 'New York',
                    'carmen:text_es': 'Nueva York'
                }
            },
            {
                language: ['es'],
                languageMode: 'strict'
            }
        ),
        'allowed: matching fallback language text'
    );

    t.notOk(
        filter.featureMatchesLanguage(
            {
                properties: { 'carmen:text_en': 'New York' }
            },
            {
                language: ['es'],
                languageMode: 'strict'
            }
        ),
        'disallowed: matching fallback language text'
    );

    t.notOk(
        filter.featureMatchesLanguage(
            {
                properties: { 'carmen:text': 'New York' }
            },
            {
                language: ['en'],
                languageMode: 'strict'
            }
        ),
        'disallowed: no matching text'
    );

    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: {
                    'carmen:text': 'New York',
                    'carmen:text_universal': 'New York'
                }
            },
            {
                language: ['en'],
                languageMode: 'strict'
            }
        ),
        'allowed: text_universal'
    );

    t.ok(
        filter.featureMatchesLanguage(
            {
                properties: {
                    'carmen:text': 'Zagreb',
                    'carmen:text_hr': 'Zagrebačka'
                }
            },
            {
                language: ['sr'],
                languageMode: 'strict'
            }
        ),
        'allowed: sr/hr equivalency'
    );

    t.end();
});

tape('filter.equivalentLanguages', t => {
    t.ok(filter.equivalentLanguages('sr_Latn', 'hr'));

    t.end();
});
