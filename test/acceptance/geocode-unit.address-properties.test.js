'use strict';
// Address Point Specific Properties

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9B', '10C', '7', '3452'],
                accuracy: 'rooftop',
                'carmen:addressprops': {
                    'accuracy': {
                        1: 'driveway',
                        2: 'parcel',
                        3: 'partial'
                    }
                }
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[1,1],[2,2],[3,3]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('test address index for 9B', (t) => {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'rooftop');
            t.end();
        });
    });

    tape('test address index for 10C', (t) => {
        c.geocode('10C FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'driveway');
            t.end();
        });
    });

    tape('test address index for 7', (t) => {
        c.geocode('7 FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'parcel');
            t.end();
        });
    });

    tape('test address index for 3452 (partial)', (t) => {
        c.geocode('34', {
            proximity: [3, 3]
        }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'partial');
            t.end();
        });
    });

    tape('test address index for 0,0', (t) => {
        c.geocode('0,0', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'rooftop');
            t.end();
        });
    });

    tape('test address index for 1,1', (t) => {
        c.geocode('1,1', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'driveway');
            t.end();
        });
    });

    tape('test address index for 2,2', (t) => {
        c.geocode('2,2', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'parcel');
            t.end();
        });
    });

    tape('test address index for 3,3', (t) => {
        c.geocode('3,3', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'partial');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9B', '10C', '7', '3452'],
                'carmen:addressprops': {
                    'accuracy': {
                        1: 'driveway',
                        2: 'parcel',
                        3: 'partial'
                    }
                }
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[1,1],[2,2],[3,3]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('test address index for 9B', (t) => {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, undefined);
            t.end();
        });
    });

    tape('test address index for 10C', (t) => {
        c.geocode('10C FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'driveway');
            t.end();
        });
    });

    tape('test address index for 7', (t) => {
        c.geocode('7 FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'parcel');
            t.end();
        });
    });

    tape('test address index for 3452 (partial)', (t) => {
        c.geocode('34', {
            proximity: [3, 3]
        }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'partial');
            t.end();
        });
    });

    tape('test address index for 0,0', (t) => {
        c.geocode('0,0', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, undefined);
            t.end();
        });
    });

    tape('test address index for 1,1', (t) => {
        c.geocode('1,1', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'driveway');
            t.end();
        });
    });

    tape('test address index for 2,2', (t) => {
        c.geocode('2,2', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'parcel');
            t.end();
        });
    });

    tape('test address index for 3,3', (t) => {
        c.geocode('3,3', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'partial');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9B', '10C'],
                accuracy: 'driveway',
                'carmen:addressprops': {
                    'accuracy': {
                        1: null
                    }
                }
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[1,1]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('test address index for 9B', (t) => {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'driveway');
            t.end();
        });
    });

    tape('test address index for 10C', (t) => {
        c.geocode('10C FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, undefined);
            t.end();
        });
    });

    tape('test address index for 0,0', (t) => {
        c.geocode('0,0', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, 'driveway');
            t.end();
        });
    });

    tape('test address index for 1,1', (t) => {
        c.geocode('1,1', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].properties.accuracy, undefined);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
