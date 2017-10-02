const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');

(() => {
    const conf = {
        address: new mem(
            {
                maxzoom: 6,
                geocoder_tokens: {
                    Street: 'St',
                    Arcade: 'Arc',
                    Apartments: 'Apts',
                    'Village Post Office': 'Vpo'
                }
            },
            () => {}
        )
    };
    tape('test invalid tokens', t => {
        t.throws(() => {
            const c = new Carmen(conf);
            t.t(c);
        });
        t.end();
    });
})();
