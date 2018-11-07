'use strict';
// Tests bounds mask generation.

const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const TypedFastBitSet = require('typedfastbitset');

tape('boundsmask', (t) => {
    const conf = {
        small: new mem({ maxzoom:6, geocoder_stack: ['west', 'east'] }, () => {}),
        west: new mem({ maxzoom:6, geocoder_stack: ['west'] }, () => {}),
        east: new mem({ maxzoom:6, geocoder_stack: ['east'] }, () => {})
    };
    const c = new Carmen(conf);
    t.deepEqual(conf.small.bmask, new TypedFastBitSet(), 'small overlaps with all');
    t.deepEqual(conf.west.bmask, new TypedFastBitSet([2]), 'west overlaps with small');
    t.deepEqual(conf.east.bmask, new TypedFastBitSet([1]), 'east overlaps with small');
    t.ok(c);
    t.end();
});

