const uniq = require('../lib/util/uniq');
const test = require('tape');

test('.uniq', t => {
    t.deepEqual([5, 4, 3, 2, 1], uniq([5, 3, 1, 2, 5, 4, 3, 1, 4, 2]));
    t.end();
});
