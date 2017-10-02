// Tests bounds mask generation.

const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');

tape('boundsmask', t => {
    const conf = {
        small: new mem(
            { maxzoom: 6, geocoder_stack: ['west', 'east'] },
            () => {}
        ),
        west: new mem({ maxzoom: 6, geocoder_stack: ['west'] }, () => {}),
        east: new mem({ maxzoom: 6, geocoder_stack: ['east'] }, () => {})
    };
    const c = new Carmen(conf);
    t.deepEqual(conf.small.bmask, [0, 0, 0], 'small overlaps with all');
    t.deepEqual(conf.west.bmask, [0, 0, 1], 'west overlaps with small');
    t.deepEqual(conf.east.bmask, [0, 1, 0], 'east overlaps with small');
    t.ok(c);
    t.end();
});
