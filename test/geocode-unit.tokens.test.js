// Test geocoder_tokens

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {"Street": "St"}
        }, () => {})
    };
    const c = new Carmen(conf);
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('test address index for relev', (t) => {
        c.geocode('fake st', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token replacement test, fake st');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6
        }, () => {})
    };
    const opts = {
        tokens: {"dix-huitième": "18e"}
    };
    const c = new Carmen(conf, opts);
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'avenue du 18e régiment',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('test address index for relev', (t) => {
        c.geocode('avenue du 18e régiment', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'avenue du 18e');
            t.end();
        });
    });
    tape('test address index for relev', (t) => {
        c.geocode('avenue du dix-huitième régiment', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'avenue du dix-huitième régiment');
            t.end();
        });
    });
})();

// RegExp captures have been put on hiatus per https://github.com/mapbox/carmen/pull/283.
(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {'q([a-z])([a-z])([a-z])': "$3$2$1"}
        }, () => {})
    };
    const c = new Carmen(conf);
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'cba',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('test token replacement', (t) => {
        c.geocode('qabc', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token regex numbered group test, qabc => qcba');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                "Road": "Rd",
                "Street": "St"
            }
        }, () => {})
    };
    const opts = {
        tokens: {
            'Suite [0-9]+': '',
            'Lot [0-9]+': ''
        }
    }
    const c = new Carmen(conf, opts);
    tape('set opts', (t) => {
        addFeature.setOptions(opts);
        t.end();
    });
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('geocoder token test', (t) => {
        let address = {
            id:2,
            properties: {
                'carmen:text':'main road lot 42 suite 432',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('unset opts', (t) => {
        addFeature.setOptions({});
        t.end();
    });
    tape('test address index for relev', (t) => {
        c.geocode('fake st lot 34 Suite 43', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.query, ['fake', 'st'], 'global tokens removed');
            t.equals(res.features[0].place_name, 'fake street');
            t.end();
        });
    });
    tape('test address index for relev', (t) => {
        c.geocode('main road lot 34 Suite 43', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.query, ['main', 'road'], 'global tokens removed');
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });

    tape('test address index autocomplete + tokens (full)', (t) => {
        c.geocode('main road', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
    tape('test address index autocomplete + tokens (abbrev)', (t) => {
        c.geocode('main rd', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
    tape('test address index autocomplete + tokens (auto)', (t) => {
        c.geocode('main roa', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                "Road": "Rd",
                "Street": "St"
            },
            use_normalization_cache: true
        }, () => {})
    };
    const opts = {
        tokens: {
            'Suite [0-9]+': '',
            'Lot [0-9]+': ''
        }
    }
    const c = new Carmen(conf, opts);
    tape('set opts', (t) => {
        addFeature.setOptions(opts);
        t.end();
    });
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('geocoder token test', (t) => {
        let address = {
            id:2,
            properties: {
                'carmen:text':'main road lot 42 suite 432',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('unset opts', (t) => {
        addFeature.setOptions({});
        t.end();
    });
    tape('test address index for relev', (t) => {
        c.geocode('fake st lot 34 Suite 43', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.query, ['fake', 'st'], 'global tokens removed');
            t.equals(res.features[0].place_name, 'fake street');
            t.end();
        });
    });
    tape('test address index for relev', (t) => {
        c.geocode('main road lot 34 Suite 43', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.query, ['main', 'road'], 'global tokens removed');
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });

    tape('test address index autocomplete + tokens (full)', (t) => {
        c.geocode('main road', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
    tape('test address index autocomplete + tokens (abbrev)', (t) => {
        c.geocode('main rd', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
    tape('test address index autocomplete + tokens (auto)', (t) => {
        c.geocode('main roa', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
    tape('test address index autocomplete + tokens (auto)', (t) => {
        c.geocode('main road', { limit_verify: 1, autocomplete: false }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {'strasse':'str'},
            use_normalization_cache: true
        }, () => {})
    };
    const opts = {
        tokens: {
            '\\b(.+)(strasse|str)\\b': "$1 str"
        }
    };

    const c = new Carmen(conf, opts);
    tape('set opts', (t) => {
        addFeature.setOptions(opts);
        t.end();
    });
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'Talstrasse ',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('test token replacement', (t) => {
        c.geocode('Talstrasse', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token replacement for str -> strasse');
            t.end();
        });
    });
    tape('test token replacement', (t) => {
        c.geocode('Talstr ', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token replacement for str -> strasse');
            t.end();
        });
    });
    tape('test token replacement', (t) => {
        c.geocode('Tal str ', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token replacement for str -> strasse');
            t.end();
        });
    });
    tape('test token replacement', (t) => {
        c.geocode('Talst ', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token replacement for str -> strasse');
            t.end();
        });
    });
    tape('test token replacement', (t) => {
        c.geocode('Tal st ', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00, 'token replacement for str -> strasse');
            t.end();
        });
    });
    tape('test token replacement', (t) => {
        c.geocode('Talstrassesomthing', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features, [], 'strasse token is not replaced when present in between a word');
            t.end();
        });
    });
    tape('unset opts', (t) => {
        addFeature.setOptions({});
        t.end();
    });
})();

// Tests dawg text normalizer token replacement (ä/ö/ü) functionally
(() => {
    // Index-specific tokens
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                'ä': {skipBoundaries: true, skipDiacriticStripping: true, text: 'ae'},
                'ö': {skipBoundaries: true, skipDiacriticStripping: true, text: 'oe'},
                'ü': {skipBoundaries: true, skipDiacriticStripping: true, text: 'ue'}
            },
            use_normalization_cache: true
        }, () => {})
    };
    // Global tokens
    const opts = {
        tokens: {
            '\\b(.+)(strasse|str|straße)\\b': '$1 str'
        }
    };
    const c = new Carmen(conf, opts);
    tape('set opts', (t) => {
        addFeature.setOptions(opts);
        t.end();
    });
    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'Phoenixstraße',
                'carmen:center':[0,0],
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    [
        'phönixstraße',
        'phönixstrasse',
        'phoenixstraße',
        'phoenixstrasse',
        'phö',
        'phönixstraß',
        'phönixstras',
        'phoe',
        'phoenixstraß',
        'phoenixstras',
    ].forEach((query) => {
        tape(`finds by ${query}`, (t) => {
            c.geocode(query, { limit_verify: 1 }, (err, res) => {
                t.equals(res.features[0].place_name, 'Phoenixstraße');
                t.end();
            });
        });
    });
    tape('unset opts', (t) => {
        addFeature.setOptions({});
        t.end();
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
