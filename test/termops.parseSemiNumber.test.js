const termops = require('../lib/util/termops');
const test = require('tape');

test('termops.parseSemiNumber', t => {
    t.equal(termops.parseSemiNumber('320'), 320);
    t.equal(termops.parseSemiNumber('320th'), 320);
    t.equal(termops.parseSemiNumber('LS24 8EG'), 248);
    t.equal(termops.parseSemiNumber('Anything With 1 Number'), 1);
    t.equal(termops.parseSemiNumber('no numbers'), null);
    t.end();
});
