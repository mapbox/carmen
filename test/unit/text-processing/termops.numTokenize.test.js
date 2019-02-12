'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('numTokenize', (t) => {
    t.deepEqual(termops.numTokenize(['foo-bar'],3), [], 'no numbers');
    t.deepEqual(termops.numTokenize(['69-150'],3), [['69###']], 'only numbers');
    t.deepEqual(termops.numTokenize(['500', 'main', 'street', '20009'],3), [
        ['5##', 'main', 'street', '20009'],
        ['500', 'main', 'street', '20###'],
    ], 'two numbers');
    t.end();
});

