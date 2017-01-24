var test = require('tape');
var termops = require('../lib/util/termops');

test('encode', function(t) {
    var term = 0;
    term = termops.encode3BitLogScale(3566,180000);
    t.equal(term, 5);

    t.equal(termops.encode3BitLogScale(-1,10), 0);
    t.equal(termops.encode3BitLogScale(0,10), 0);
    t.equal(termops.encode3BitLogScale(1,10), 1);
    t.equal(termops.encode3BitLogScale(2,10), 3);
    t.equal(termops.encode3BitLogScale(3,10), 4);
    t.equal(termops.encode3BitLogScale(4,10), 5);
    t.equal(termops.encode3BitLogScale(5,10), 5);
    t.equal(termops.encode3BitLogScale(6,10), 6);
    t.equal(termops.encode3BitLogScale(7,10), 6);
    t.equal(termops.encode3BitLogScale(8,10), 7);
    t.equal(termops.encode3BitLogScale(9,10), 7);
    t.equal(termops.encode3BitLogScale(10,10), 7);

    t.end();
});

test('decode', function(t) {
    var term = 0;
    term = termops.decode3BitLogScale(5,180000);
    t.equal(term, 5672);

    t.equal(termops.decode3BitLogScale(0,10), 0);
    t.equal(termops.decode3BitLogScale(1,10), 1);
    t.equal(termops.decode3BitLogScale(2,10), 2);
    t.equal(termops.decode3BitLogScale(3,10), 3);
    t.equal(termops.decode3BitLogScale(4,10), 4);
    t.equal(termops.decode3BitLogScale(5,10), 5);
    t.equal(termops.decode3BitLogScale(6,10), 7);
    t.equal(termops.decode3BitLogScale(7,10), 10);

    t.end();
});

