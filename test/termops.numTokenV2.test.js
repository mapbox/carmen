const termops = require('../lib/util/termops');
const test = require('tape');

test('numTokenV2', t => {
    t.deepEqual(termops.numTokenV2(''), '', 'no digits');
    t.deepEqual(termops.numTokenV2('1'), '#', '1 digit');
    t.deepEqual(termops.numTokenV2('12'), '##', '2 digit');
    t.deepEqual(termops.numTokenV2('123'), '###', '3 digit');
    t.deepEqual(termops.numTokenV2('1234'), '####', '4 digit');
    t.deepEqual(termops.numTokenV2('12345'), '#####', '5 digit');
    t.end();
});
