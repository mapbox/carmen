const tape = require('tape');
const Carmen = require('..');
// const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_address: 1,
            geocoder_tokens: {"Strasse": "Str", "Straße": "Str", "Street": "St"}
        }, () => {})
    };

    const opts = {
        tokens: {'(?:[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\\'!"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]|^)(.+)(strasse|str|straße)(?:[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\\'!"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]|$)': ' $1 str '}
    }

    const c = new Carmen(conf, opts);

    tape('set opts', (t) => {
        addFeature.setOptions(opts);
        t.end();
    });

    tape('geocoder token strasse test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'Alpenstraße',
                'carmen:center':[0,0],
                'carmen:addressnumber':['48']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('geocoder token test', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text':'main street',
                'carmen:center':[0,0],
                'carmen:addressnumber':['48']
            },
            geometry: {
                type: "MultiPoint",
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address,  () => { buildQueued(conf.address, t.end) });
    });

    tape('test address index for relev', (t) => {
        c.geocode('48 main st', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'token replacement test, main st');
            t.end();
        });
    });

    tape('test strasse address index for relev', (t) => {
        c.geocode('Alpenstraße 48', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'token replacement test, Alpenstraße');
            t.end();
        });
    });
})();
