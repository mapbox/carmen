const Cache = require('../lib/util/cxxcache').MemoryCache;
const RocksDBCache = require('../lib/util/cxxcache').RocksDBCache;
const test = require('tape');
const fs = require('fs');

const tmpdir =
    require('os').tmpdir() +
    '/temp.' +
    Math.random()
        .toString(36)
        .substr(2, 5);
fs.mkdirSync(tmpdir);
let tmpidx = 0;
const tmpfile = () => {
    return tmpdir + '/' + tmpidx++ + '.dat';
};

const sortedInverse = arr => {
    return [].concat(arr).sort((a, b) => {
        return b - a;
    });
};

test('#get', t => {
    const cache = new Cache('a');
    cache.set('5', [0, 1, 2]);
    t.deepEqual(sortedInverse([0, 1, 2]), cache.get('5'));
    t.throws(
        () => {
            cache.get();
        },
        Error,
        'throws on misuse'
    );
    t.end();
});

test('#list', t => {
    const cache = new Cache('a');
    cache.set('5', [0, 1, 2]);
    t.deepEqual([['5', null]], cache.list());
    t.end();
});

test('#get', t => {
    const cache = new Cache('a');
    cache.set('5', [0, 1, 2]);
    t.deepEqual(sortedInverse([0, 1, 2]), cache.get('5'));
    t.equal(undefined, cache._get('9'));
    t.end();
});

test('#pack', t => {
    const cache = new Cache('a');
    cache.set('5', [0, 1, 2]);
    //s.deepEqual(2065, cache.pack(34566).length);
    // set should replace data
    cache.set('5', [0, 1, 2, 4]);
    //s.deepEqual(2066, cache.pack(34566).length);
    // throw on invalid grid
    t.throws(
        cache.set.bind(null, 'grid', '5', []),
        'cache.set throws on empty grid value'
    );
    // now test packing data created via load
    const packer = new Cache('a');
    const array = [];
    for (let i = 0; i < 10000; ++i) {
        array.push(0);
    }
    packer.set('5', array);
    const packed = tmpfile();
    packer.pack(packed);
    t.ok(new RocksDBCache('a', packed));
    t.end();
});

test('#load', t => {
    const cache = new Cache('a');
    t.equal('a', cache.id);

    t.equal(undefined, cache.get('5'));
    t.deepEqual([], cache.list());

    cache.set('5', [0, 1, 2]);
    t.deepEqual(sortedInverse([0, 1, 2]), cache.get('5'));
    t.deepEqual([['5', null]], cache.list());

    cache.set('21', [5, 6]);
    t.deepEqual(sortedInverse([5, 6]), cache.get('21'));
    t.deepEqual([['21', null], ['5', null]], cache.list(), 'keys in cache');

    // cache A serializes data, cache B loads serialized data.
    const pack = tmpfile();
    cache.pack(pack);
    const loader = new RocksDBCache('b', pack);
    t.deepEqual(sortedInverse([6, 5]), loader.get('21'));
    t.deepEqual([['21', null], ['5', null]], loader.list(), 'keys in cache');
    t.end();
});
