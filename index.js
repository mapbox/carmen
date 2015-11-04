var path = require('path'),
    EventEmitter = require('events').EventEmitter,
    queue = require('queue-async');

var Cache = require('./lib/util/cxxcache'),
    getContext = require('./lib/context'),
    loader = require('./lib/loader'),
    geocode = require('./lib/geocode'),
    analyze = require('./lib/analyze'),
    loadall = require('./lib/loadall'),
    termops = require('./lib/util/termops'),
    token = require('./lib/util/token'),
    copy = require('./lib/copy'),
    index = require('./lib/index');

require('util').inherits(Geocoder, EventEmitter);
module.exports = Geocoder;

// Initialize and load Geocoder, with a selection of indexes.
function Geocoder(options) {
    if (!options) throw new Error('Geocoder options required.');

    var q = queue(),
        indexes = pairs(options);

    this.indexes = indexes.reduce(toObject, {});
    this.replacer = {};
    this.byname = {};
    this.bytype = {};
    this.byidx = [];
    this.names = [];

    indexes.forEach(function(index) {
        q.defer(loadIndex, index);
    });

    q.awaitAll(function(err, results) {
        var names = [];
        var types = [];
        results.forEach(function(info, i) {
            var id = indexes[i][0];
            var source = indexes[i][1];
            var name = info.geocoder_name || id;
            var type = info.geocoder_type||info.geocoder_name||id;
            if (names.indexOf(name) === -1) {
                names.push(name);
                this.byname[name] = [];
            }
            if (types.indexOf(type) === -1) {
                types.push(type);
                this.bytype[type] = [];
            }
            source._geocoder = source._geocoder || new Cache(name, info.geocoder_cachesize);

            if (info.geocoder_address) {
              source._geocoder.geocoder_address = info.geocoder_address;
            } else {
              source._geocoder.geocoder_address = false;
            }

            if (info.geocoder_version) {
                source._geocoder.version = parseInt(info.geocoder_version, 10);
                if (source._geocoder.version !== 4) {
                    err = new Error('geocoder version is not 4, index: ' + id);
                    return;
                }
            } else {
                source._geocoder.version = 0;
                source._geocoder.shardlevel = info.geocoder_shardlevel || 0;
            }

            var keys = Object.keys(info);
            for (var ix = 0; ix < keys.length; ix ++) {
                if (/geocoder_format_/.test(keys[ix])) source._geocoder[keys[ix]] = info[keys[ix]]||false;
            }

            //Maps all geocoder_tokens to a global list
            var tokens = Object.keys(info.geocoder_tokens||{});
            for (var ix = 0; ix < tokens.length; ix++) {
                if (!this.replacer[tokens[ix]]) {
                    this.replacer[tokens[ix]] = info.geocoder_tokens[tokens[ix]];
                } else if (this.replacer[tokens[ix]] !== info.geocoder_tokens[tokens[ix]]) {
                    throw new Error('Conflicting replacement token ' + tokens[ix]);
                }
            }

            source._geocoder.geocoder_format = info.geocoder_format||false;
            source._geocoder.geocoder_layer = (info.geocoder_layer||'').split('.').shift();
            source._geocoder.geocoder_tokens = info.geocoder_tokens||{};
            source._geocoder.token_replacer = token.createReplacer(info.geocoder_tokens||{});
            source._geocoder.maxzoom = info.maxzoom;
            source._geocoder.zoom = info.maxzoom + parseInt(info.geocoder_resolution||0,10);
            source._geocoder.type = type;
            source._geocoder.name = name;
            source._geocoder.id = id;
            source._geocoder.idx = i;
            source._geocoder.ndx = names.indexOf(name);
            source._geocoder.bounds = info.bounds || [ -180, -85, 180, 85 ];

            // add index idx => name idx lookup
            this.names[i] = names.indexOf(name);

            // add byname index lookup
            this.byname[name].push(source);

            // add bytype index lookup
            this.bytype[type].push(source);

            // add byidx index lookup
            this.byidx[i] = source;
        }.bind(this));

        this.replacer = token.createReplacer(this.replacer);

        // Second pass -- generate bmask (bounds mask) per index.
        // The bmask of an index represents a mask of all indexes that its
        // bounds do not intersect with -- ie. a spatialmatch with any of
        // these indexes should not be attempted as it will fail anyway.
        for (var i = 0; i < this.byidx.length; i++) {
            var bmask = [];
            var a = this.byidx[i]._geocoder;
            for (var j = 0; j < this.byidx.length; j++) {
                var b = this.byidx[j]._geocoder;
                if (boundsIntersect(a.bounds, b.bounds)) {
                    bmask[j] = 0;
                } else {
                    bmask[j] = 1;
                }
            }
            this.byidx[i]._geocoder.bmask = bmask;
        }

        this._error = err;
        this._opened = true;
        this.emit('open', err);
    }.bind(this));

    function loadIndex(sourceindex, callback) {
        var source = sourceindex[1],
            key = sourceindex[0];

        source = source.source ? source.source : source;

        if (source.open === true) return source.getInfo(callback);
        if (typeof source.open === 'function') return source.open(opened);
        return source.once('open', opened);

        function opened(err) {
            if (err) return callback(err);
            source.getInfo(callback);
        }
    }
}

function boundsIntersect(a, b) {
    if (a[2] < b[0]) return false; // a is left of b
    if (a[0] > b[2]) return false; // a is right of b
    if (a[3] < b[1]) return false; // a is below b
    if (a[1] > b[3]) return false; // a is above b
    return true;
}

function pairs(o) {
    var a = [];
    for (var k in o) a.push([k, o[k]]);
    return a;
}

function toObject(mem, s) {
    mem[s[0]] = s[1].source ? s[1].source : s[1];
    return mem;
}

// Ensure that all carmen sources are opened.
Geocoder.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};

// Main geocoding API entry point.
// Returns results across all indexes for a given query.
//
// Actual searches are delegated to `Geocoder.prototype.search` over each
// enabled backend.
//
// `query` is a string of text, like "Chester, NJ"
// `options` is an object with additional parameters
// `callback` is called with (error, results)
Geocoder.prototype.geocode = function(query, options, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        geocode(self, query, options, callback);
    });
};

// Index docs from one source to another.
Geocoder.prototype.index = function(from, to, pointer, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        index(self, from, to, pointer, callback);
    });
};

// Analyze a source's index.
Geocoder.prototype.analyze = function(source, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        analyze(source, callback);
    });
};

// Load all shards for a source.
Geocoder.prototype.loadall = function(source, type, concurrency, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        loadall.loadall(source, type, concurrency, callback);
    });
};

Geocoder.prototype.unloadall = function(source, type, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        loadall.unloadall(source, type, callback);
    });
};

// Copy a source's index to another.
Geocoder.prototype.copy = function(from, to, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        copy(from, to, callback);
    });
};

Geocoder.auto = loader.auto;
Geocoder.autodir = loader.autodir;
Geocoder.setVtCacheSize = getContext.getTile.setVtCacheSize;
