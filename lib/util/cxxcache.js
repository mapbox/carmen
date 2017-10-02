var cache = require('@mapbox/carmen-cache');
var uniq = require('./uniq');

// This file wraps the MemoryCache and RocksDBCache objects coming from C++
//
// This object exposes two caches: one to
// store fully materialized data (MemoryCache)
// and another that stores a raw protobuf representation
// of the data (RocksDBCache) which needs extra
// work to decode before being usable.
//
// This object offers to JS these functions:
//
// Gets data for a given id
// Copied to the JS land function 'get'
// - _get(id)
//
// Adds a JS array to the cache for given
// and id. This adds data directly to the fully materialized
// cache and leaves the lazy protobuf cache untouched
// which is in contrast to the load method.
// Copied to the JS land function 'set'
// - _set(id, data)
//
// Writes a rocksdb database to the given filename
// containing the lazy representation of all data in the cache.
// - pack(filename)
//
// Returns the ids for all arrays in the cache.
// Looks in both the memory cache and the lazy cache for
// matches.
// - list()

exports = module.exports = cache;

[cache.MemoryCache, cache.RocksDBCache].forEach(function(Cache) {
    // Store a id->data pair into this cache
    Cache.prototype.set = Cache.prototype._set;

    // Get the data that belongs to a specific `data` member.
    Cache.prototype.get = Cache.prototype._get;

    // # getall
    //
    // @param {String} type
    // @param {Array} ids an array of ids as numbers
    // @param {Function} callback a function invoked with `(error, unique results)`
    Cache.prototype.getall = function(type, ids, callback) {
        var cache = this;
        var result = [];

        for (var i = 0; i < ids.length; i++) {
            var match = cache._get(ids[i]);
            if (match) {
                var j = match.length;
                while (j--) result.push(match[i]);
            }
        }

        result = type === 'grid' ? result : uniq(result);
        callback(null, result);
    };
});
