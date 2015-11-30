var tape = require('tape');
var zlib = require('zlib');
var encodePhrase = require('../lib/util/termops').encodePhrase;
var Bitcache = require('../lib/util/dictcache').bitcache;

tape('create (30 bit)', function(assert) {
    var dict = new Bitcache(null, 30);
    assert.equal(dict.cache.length, 4, 'created 128MiB cache');
    for (var i = 0; i < Bitcache.shardLength; i++) {
        if (dict.cache[0][i] !== 0) {
            assert.fail('buffer filled with 0s');
        }
    }
    assert.end();
});

tape('create (31 bit)', function(assert) {
    var dict = new Bitcache(null, 31);
    assert.equal(dict.cache.length, 8, 'created 256MiB cache');
    for (var i = 0; i < Bitcache.shardLength; i++) {
        if (dict.cache[0][i] !== 0) {
            assert.fail('buffer filled with 0s');
        }
    }
    assert.end();
});

tape('create (128 MiB buffer)', function(assert) {
    var dict = new Bitcache(new Buffer(134217728));
    assert.equal(dict.cache.length * Bitcache.shardLength, 134217728, 'created 128MiB cache');
    assert.equal(dict.size, Math.pow(2,30), 'created 30 bitsize cache');
    assert.end();
});

tape('create (256 MiB buffer)', function(assert) {
    var dict = new Bitcache(new Buffer(268435456));
    assert.equal(dict.cache.length * Bitcache.shardLength, 268435456, 'created 256MiB cache');
    assert.equal(dict.size, Math.pow(2,31), 'created 31 bitsize cache');
    assert.end();
});

tape('create (err: size)', function(assert) {
    assert.throws(function() {
        var dict = new Bitcache(null, 34);
    });
    assert.end();
});

tape('create (err: bufferlength)', function(assert) {
    assert.throws(function() {
        var dict = new Bitcache(new Buffer(50));
    });
    assert.end();
});

tape('dump/load', function(assert) {
    assert.throws(function() {
        var foo = new Bitcache(new Buffer(200));
    }, 'throws with bad length buffer');

    var dict = new Bitcache();
    dict.setId(1);
    dict.setId(2);
    dict.setId(3);
    dict.setId(4);

    zlib.gzip(dict.dump(), function(err, zdata) {
        assert.ifError(err);
        assert.ok(zdata.length < 200e3, 'gzipped dictcache < 200k');
        zlib.gunzip(zdata, function(err, data) {
            assert.ifError(err);
            var loaded = new Bitcache(data);
            assert.equal(dict.hasId(1), true, 'has 1');
            assert.equal(dict.hasId(2), true, 'has 2');
            assert.equal(dict.hasId(3), true, 'has 3');
            assert.equal(dict.hasId(4), true, 'has 4');
            assert.equal(dict.hasId(5), false, 'not 5');
            assert.end();
        });
    });
});

tape('set/has/del', function(assert) {
    var dict = new Bitcache();

    assert.equal(dict.cache.length, 4, '4 shards');

    // initial state
    assert.equal(dict.hasId(0), false, 'has 0 = false');
    // set 0
    assert.equal(dict.setId(0), undefined, 'set 0');
    assert.equal(dict.cache[0][0], 1, 'sets buffer[0] === 1');
    assert.equal(dict.hasId(0), true, 'has 0 = true');
    // del 0
    assert.equal(dict.delId(0), undefined, 'del 0');
    assert.equal(dict.cache[0][0], 0, 'sets buffer[0] === 0');
    assert.equal(dict.hasId(0), false, 'has 0 = true');

    // initial state
    var last = dict.size - 1;
    assert.equal(dict.hasId(last), false);
    // set 0
    assert.equal(dict.setId(last), undefined);
    assert.equal(dict.cache[3][dict.cache[3].length-1], 128, 'sets last byte === 128');
    assert.equal(dict.hasId(last), true);
    // del 0
    assert.equal(dict.delId(last), undefined, 'del biggest');
    assert.equal(dict.cache[3][dict.cache[3].length-1], 0, 'sets last byte === 0');
    assert.equal(dict.hasId(last), false, 'has biggest = false');

    // test within byte bounds
    for (var id = 0; id < 8; id++) {
        assert.equal(dict.hasId(id), false, 'has ' + id + ' = false');
        assert.equal(dict.setId(id), undefined, 'set ' + id);
        assert.equal(dict.hasId(id), true, 'has ' + id + ' = true');
    }
    for (var id = 0; id < 8; id++) {
        assert.equal(dict.delId(id), undefined, 'del ' + id);
        assert.equal(dict.hasId(id), false, 'has ' + id + ' = false');
    }

    // test within byte bounds
    for (var id = 0; id < 8; id++) {
        assert.equal(dict.hasId(id), false, 'has ' + id + ' = false');
        assert.equal(dict.setId(id), undefined, 'set ' + id);
        assert.equal(dict.hasId(id), true, 'has ' + id + ' = true');
    }
    for (var id = 0; id < 8; id++) {
        assert.equal(dict.delId(id), undefined, 'del ' + id);
        assert.equal(dict.hasId(id), false, 'has ' + id + ' = false');
    }

    assert.end();
});

tape('auto', function(assert) {
    assert.equal(Bitcache.auto(1e5), 30, '100 thous => 30 bit');
    assert.equal(Bitcache.auto(1e6), 30, '1 million => 30 bit');
    assert.equal(Bitcache.auto(2e6), 31, '2 million => 31 bit');
    assert.equal(Bitcache.auto(100e6), 32, '100 million => 32 bit (capped at 32 bits)');
    assert.end();
});

// fuzz test
[10000, 100000, 1000000].forEach(function(ids) {
    var size = Bitcache.auto(ids);
    tape('fuzz auto: ' + ids + ' = ' + size, function(assert) {
        var dict = new Bitcache(null, size);
        var used = {};
        var count = 0;
        for (var i = 0; i < ids; i++) {
            var id = encodePhrase([Math.random().toString()]).id;
            if (dict.hasId(id) !== false) continue;
            if (dict.setId(id) !== undefined) assert.fail('fuzz test set(): ' + id)
            if (dict.hasId(id) !== true) assert.fail('fuzz test post has(): ' + id)
            count++;
        }
        assert.ok(true, 'fuzz test x' + count);

        assert.end();
    });
});

// fuzz test
[32,31,30].forEach(function(bitSize) {
    tape('fuzz: ' + bitSize, function(assert) {
        var dict = new Bitcache(null, bitSize);
        var used = {};
        var count = 0;
        for (var i = 0; i < 100000; i++) {
            var id = encodePhrase([Math.random().toString()]);
            if (dict.hasId(id) !== false) continue;
            if (dict.setId(id) !== undefined) assert.fail('fuzz test set(): ' + id)
            if (dict.hasId(id) !== true) assert.fail('fuzz test post has(): ' + id)
            count++;
        }
        assert.ok(true, 'fuzz test x' + count);

        assert.end();
    });
});

