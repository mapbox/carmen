//Proximity flag

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem({maxzoom: 1}, () => {}),
    province: new mem({maxzoom: 6}, () => {})
};
const c = new Carmen(conf);

tape('index country', (t) => {
    let country = {
        id:1,
        properties: {
            'carmen:text':'country',
            'carmen:zxy':['1/0/0'],
            'carmen:center':[-100,60]
        }
    };
    queueFeature(conf.country, country, t.end);
});
tape('index country', (t) => {
    let country = {
        id:2,
        properties: {
            'carmen:text':'country',
            'carmen:zxy':['1/0/1'],
            'carmen:center':[-60,-20]
        }
    };
    queueFeature(conf.country, country, t.end);
});

//Across layers
tape('index province', (t) => {
    let province = {
        id:1,
        properties: {
            'carmen:text':'province',
            'carmen:zxy':['6/17/24'],
            'carmen:center':[-80,40]
        }
    };
    queueFeature(conf.province, province, t.end);
});
tape('index province', (t) => {
    let country = {
        id:3,
        properties: {
            'carmen:text':'province',
            'carmen:zxy':['1/1/0'],
            'carmen:center':[145,70]
        }
    };
    queueFeature(conf.country, country, t.end);
});
tape('index province', (t) => {
    let province = {
        id:2,
        properties: {
            'carmen:text':'fakeprov',
            'carmen:zxy':['6/14/18'],
            'carmen:center':[-100,60]
        }
    };
    queueFeature(conf.province, province, t.end);
});
tape('index province', (t) => {
    let province = {
        id:3,
        properties: {
            'carmen:text':'fakeprov',
            'carmen:zxy':['6/21/35'],
            'carmen:center':[-60,-20]
        }
    };
    queueFeature(conf.province, province, t.end);
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

tape('error: invalid options.proximity type', (t) => {
    c.geocode('province', { proximity: 'adsf' }, (err, res) => {
        t.equal(err && err.toString(), 'Error: Proximity must be an array in the form [lon, lat]');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity length', (t) => {
    c.geocode('province', { proximity: [0,0,0] }, (err, res) => {
        t.equal(err && err.toString(), 'Error: Proximity must be an array in the form [lon, lat]');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[0] type', (t) => {
    c.geocode('province', { proximity: [{},0] }, (err, res) => {
        t.equal(err && err.toString(), 'Error: Proximity lon value must be a number between -180 and 180');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[0] value', (t) => {
    c.geocode('province', { proximity: [-181,0] }, (err, res) => {
        t.equal(err && err.toString(), 'Error: Proximity lon value must be a number between -180 and 180');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[1] type', (t) => {
    c.geocode('province', { proximity: [0,{}] }, (err, res) => {
        t.equal(err && err.toString(), 'Error: Proximity lat value must be a number between -90 and 90');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('error: invalid options.proximity[1] value', (t) => {
    c.geocode('province', { proximity: [0,-91] }, (err, res) => {
        t.equal(err && err.toString(), 'Error: Proximity lat value must be a number between -90 and 90');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

tape('forward country - single layer - limit', (t) => {
    c.geocode('country', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - proximity - single layer - limit', (t) => {
    c.geocode('country', { limit_verify: 1, proximity: [-60,-20] }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.2', 'found country.2');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - proximity - single layer - limit', (t) => {
    c.geocode('country', { limit_verify: 1, proximity: [-100,60] }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - multi layer - limit', (t) => {
    c.geocode('province', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'province', 'found province');
        t.equals(res.features[0].id, 'country.3', 'found country.3');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - single layer', (t) => {
    c.geocode('country', { }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - proximity - single layer', (t) => {
    c.geocode('country', { proximity: [-60,-20] }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.2', 'found country.2');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - proximity - single layer', (t) => {
    c.geocode('country', { proximity: [-100,60] }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'country', 'found country');
        t.equals(res.features[0].id, 'country.1', 'found country.1');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('forward country - multi layer', (t) => {
    c.geocode('province', { }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'province', 'found province');
        t.equals(res.features[0].id, 'country.3', 'found country.3');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

// Ignores idx hierarchy -- scoredist trumps all
tape('forward country - scoredist wins', (t) => {
    c.geocode('province', { proximity: [-80,40] }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'province, country', 'found province');
        t.equals(res.features[0].id, 'province.1', 'found province.1');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

// Test proximity with multi-part query
tape('forward province - multilayer', (t) => {
    c.geocode('fakeprov country', { proximity: [-100,60], limit_verify:1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'fakeprov, country', 'found province');
        t.equals(res.features[0].id, 'province.2', 'found province.2');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

// Test proximity with multi-part query
tape('forward province - multilayer', (t) => {
    c.geocode('fakeprov country', { proximity: [-60,-20], limit_verify:1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'fakeprov, country', 'found province');
        t.equals(res.features[0].id, 'province.3', 'found province.3');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

