var Cache = require('../lib/util/cxxcache');
var test = require('tape');

test('.shard', function(s) {
    s.equal(0, Cache.shard('grid', 0));
    s.equal(0, Cache.shard('grid', 1), 'level0 => 0 shard for all ids');

    s.equal(0, Cache.shard('grid', 0));
    s.equal(0, Cache.shard('grid', 1));
    s.equal(1, Cache.shard('grid', 68719476736));
    s.equal(1, Cache.shard('grid', 68719476736 + 1), 'lower bits do not affect shard');
    s.equal(2, Cache.shard('grid', 68719476736 * 2));
    s.equal(3, Cache.shard('grid', 68719476736 * 3));
    s.equal(15, Cache.shard('grid', 68719476736 * 15));
    s.equal(false, Cache.shard('grid'));
    s.end();
});

test('#get', function(r) {
    var cache = new Cache('a');
    cache.set('grid', 5, [0,1,2]);
    r.deepEqual([0, 1, 2], cache.get('grid', 5));
    r.throws(function() { cache.get('grid'); }, Error, 'throws on misuse');
    r.end();
});

test('#list', function(s) {
    var cache = new Cache('a');
    cache.set('grid', 5, [0,1,2]);
    s.deepEqual([0], cache.list('grid'));
    s.end();
});

test('#has', function(s) {
    var cache = new Cache('a');
    cache.set('grid', 5, [0,1,2]);
    s.deepEqual(true, cache.has('grid', 0));
    s.end();
});

test('#get', function(s) {
    var cache = new Cache('a');
    cache.set('grid', 5, [0,1,2]);
    s.deepEqual([0, 1, 2], cache._get('grid', 0, 5));
    s.deepEqual([0, 1, 2], cache.get('grid', 5));
    s.equal(undefined, cache._get('grid', 5, 9));
    s.end();
});

test('#pack', function(s) {
    var cache = new Cache('a');
    cache.set('grid', 5, [0,1,2]);
    s.deepEqual(9, cache.pack('grid', 0).length);
    // set should replace data
    cache.set('grid', 5, [0,1,2,4]);
    s.deepEqual(10, cache.pack('grid', 0).length);
    // throw on invalid grid
    s.throws(cache.set.bind(null, 'grid', 5, []), 'cache.set throws on empty grid value');
    // now test packing data created via load
    var packer = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    packer.set('grid', 5, array);
    var loader = new Cache('a');
    loader.loadSync(packer.pack('grid',0), 'grid', 0);
    // grab data right back out
    s.deepEqual(10008, loader.pack('grid', 0).length);
    // try to grab data that does not exist
    s.throws(function() { loader.pack('grid', 99999999999999) });
    s.end();
});

test('#load', function(s) {
    var cache = new Cache('a');
    s.equal('a', cache.id);

    s.equal(undefined, cache.get('grid', 5));
    s.deepEqual([], cache.list('grid'));

    cache.set('grid', 5, [0,1,2]);
    s.deepEqual([0,1,2], cache.get('grid', 5));
    s.deepEqual([0], cache.list('grid'));

    cache.set('grid', 21, [5,6]);
    s.deepEqual([5,6], cache.get('grid', 21));
    s.deepEqual([0], cache.list('grid'), 'single shard');
    s.deepEqual(['5', '21'], cache.list('grid', 0), 'keys in shard');

    // cache A serializes data, cache B loads serialized data.
    var pack = cache.pack('grid', 0);
    var loader = new Cache('b');
    loader.loadSync(pack, 'grid', 0);
    s.deepEqual([6,5], loader.get('grid', 21));
    s.deepEqual([0], loader.list('grid'), 'single shard');
    s.deepEqual(['5', '21'], loader.list('grid', 0), 'keys in shard');
    s.end();
});

test('#unload on empty data', function(s) {
    var cache = new Cache('a');
    s.equal(false,cache.unload('grid',5));
    s.deepEqual(false, cache.has('grid', 5));
    s.end();
});

test('#unload after set', function(s) {
    var cache = new Cache('a');
    cache.set('grid', 0, [0,1,2]);
    s.deepEqual(true, cache.has('grid', 0));
    s.equal(true,cache.unload('grid',0));
    s.deepEqual(false, cache.has('grid', 0));
    s.end();
});

test('#unload after load', function(s) {
    var cache = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('grid', 5, array);
    var pack = cache.pack('grid', 0);
    var loader = new Cache('b');
    loader.loadSync(pack, 'grid', 0);
    s.deepEqual(array, loader.get('grid', 5));
    s.deepEqual([0], loader.list('grid'), 'single shard');
    s.deepEqual(true, loader.has('grid', 0));
    s.equal(true,loader.unload('grid',0));
    s.deepEqual(false, loader.has('grid', 0));
    s.end();
});

test('#unloadall', function(s) {
    var cache = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('grid', 5, array);
    var pack = cache.pack('grid', 0);

    var loader = new Cache('b');
    loader.loadSync(pack, 'grid', 0);
    loader.loadSync(pack, 'grid', 1);
    loader.loadSync(pack, 'grid', 2);
    loader.loadSync(pack, 'grid', 3);
    loader.loadSync(pack, 'grid', 4);
    s.deepEqual(array, loader.get('grid', 5));
    s.deepEqual([0,1,2,3,4], loader.list('grid'), 'many shards');
    s.deepEqual(true, loader.has('grid', 0));
    s.equal(true,loader.unloadall('grid'));
    s.deepEqual(false, loader.has('grid', 0));
    s.deepEqual([], loader.list('grid'), 'no shards');
    s.end();
});

test('#loadall', function(assert) {
    var cache = new Cache('a');
    cache.set('grid', 1, [0]);
    cache.set('grid', 68719476736, [1]);

    var packs = [];
    packs[0] = cache.pack('grid', 0);
    packs[1] = cache.pack('grid', 1);

    function getter(type, shard, callback) {
        return callback(null, packs[shard]);
    }

    var loader = new Cache('b');
    assert.equal(loader.has('grid', 0), false);
    assert.equal(loader.has('grid', 1), false);
    load1();

    function load1() {
        loader.loadall(getter, 'grid', [1,68719476736], function(err, shards, queue) {
            assert.ifError(err);
            assert.deepEqual(loader.get('grid', 1), [0]);
            assert.deepEqual(loader.get('grid', 68719476736), [1]);
            load2();
        });
    }
    function load2() {
        loader.loadall(getter, 'grid', [1,68719476736], function(err, shards, queue) {
            assert.ifError(err);
            assert.deepEqual(loader.get('grid', 1), [0]);
            assert.deepEqual(loader.get('grid', 68719476736), [1]);
            get1();
        });
    }
    function get1() {
        loader.getall(getter, 'grid', [1,68719476736], function(err, loaded) {
            assert.ifError(err);
            assert.deepEqual(loaded, [1,0]);
            get2();
        });
    }
    function get2() {
        loader.getall(getter, 'grid', [1,68719476736], function(err, loaded) {
            assert.ifError(err);
            assert.deepEqual(loaded, [1,0]);
            assert.end();
        });
    }
});

