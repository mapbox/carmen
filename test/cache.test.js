var Cache = require('../lib/util/cxxcache').MemoryCache;
var RocksDBCache = require('../lib/util/cxxcache').RocksDBCache;
var test = require('tape');
var fs = require('fs');

var tmpdir = require('os').tmpdir() + "/temp." + Math.random().toString(36).substr(2, 5);
fs.mkdirSync(tmpdir);
var tmpidx = 0;
var tmpfile = function() { return tmpdir + "/" + (tmpidx++) + ".dat"; };

test('#get', function(r) {
    var cache = new Cache('a');
    cache.set('5', [0,1,2]);
    r.deepEqual([0, 1, 2], cache.get('5'));
    r.throws(function() { cache.get(); }, Error, 'throws on misuse');
    r.end();
});

test('#list', function(s) {
    var cache = new Cache('a');
    cache.set('5', [0,1,2]);
    s.deepEqual(['5'], cache.list());
    s.end();
});

test('#get', function(s) {
    var cache = new Cache('a');
    cache.set('5', [0,1,2]);
    s.deepEqual([0, 1, 2], cache.get('5'));
    s.equal(undefined, cache._get('9'));
    s.end();
});

test('#pack', function(s) {
    var cache = new Cache('a');
    cache.set('5', [0,1,2]);
    //s.deepEqual(2065, cache.pack(34566).length);
    // set should replace data
    cache.set('5', [0,1,2,4]);
    //s.deepEqual(2066, cache.pack(34566).length);
    // throw on invalid grid
    s.throws(cache.set.bind(null, 'grid', '5', []), 'cache.set throws on empty grid value');
    // now test packing data created via load
    var packer = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    packer.set('5', array);
    var packed = tmpfile();
    packer.pack(packed);
    s.ok(new RocksDBCache('a', packed));
    s.end();
});

test('#load', function(s) {
    var cache = new Cache('a');
    s.equal('a', cache.id);

    s.equal(undefined, cache.get('5'));
    s.deepEqual([], cache.list());

    cache.set('5', [0,1,2]);
    s.deepEqual([0,1,2], cache.get('5'));
    s.deepEqual([ '5' ], cache.list());

    cache.set('21', [5,6]);
    s.deepEqual([5,6], cache.get('21'));
    s.deepEqual([ '21', '5' ], cache.list(), 'keys in cache');

    // cache A serializes data, cache B loads serialized data.
    var pack = tmpfile();
    cache.pack(pack);
    var loader = new RocksDBCache('b', pack);
    s.deepEqual([6,5], loader.get('21'));
    s.deepEqual([ '21', '5'], loader.list(), 'keys in cache');
    s.end();
});

