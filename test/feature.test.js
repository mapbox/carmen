const tape = require('tape');
const feature = require('../lib/util/feature.js');

tape('shard', t => {
    for (let level = 0; level < 7; level++) {
        let shards = {};
        for (let i = 0; i < Math.pow(2, 20); i++) {
            let shard = feature.shard(level, i);
            shards[shard] = shards[shard] || 0;
            shards[shard]++;
        }
        const expected = Math.min(Math.pow(2, 20), Math.pow(16, level + 1));
        t.equal(
            Object.keys(shards).length,
            expected,
            'shardlevel=' + level + ', shards=' + expected
        );
    }
    t.end();
});
