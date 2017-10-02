const termops = require('../lib/util/termops');
const test = require('tape');

test('numTokenV3', t => {
    t.deepEqual(termops.numTokenV3(''), '', 'no digits');
    t.deepEqual(termops.numTokenV3('1'), '#', '1 digit');
    t.deepEqual(termops.numTokenV3('12'), '##', '2 digit');
    t.deepEqual(termops.numTokenV3('123'), '1##', '3 digit');
    t.deepEqual(termops.numTokenV3('1234'), '12##', '4 digit');
    t.deepEqual(termops.numTokenV3('12345'), '12###', '5 digit');
    t.deepEqual(termops.numTokenV3('123456'), '12####', '6 digit');
    t.deepEqual(termops.numTokenV3('1234567'), '12#####', '7 digit');
    t.deepEqual(termops.numTokenV3('12345678'), '12######', '8 digit');
    t.end();
});
