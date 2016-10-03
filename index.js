var path = require('path'),
    EventEmitter = require('events').EventEmitter,
    queue = require('d3-queue').queue;

var dawgcache = require('./lib/util/dawg');
var Cache = require('./lib/util/cxxcache'),
    getContext = require('./lib/context'),
    loader = require('./lib/loader'),
    geocode = require('./lib/geocode'),
    analyze = require('./lib/analyze'),
    loadall = require('./lib/loadall'),
    termops = require('./lib/util/termops'),
    token = require('./lib/util/token'),
    copy = require('./lib/copy'),
    index = require('./lib/index'),
    merge = require('./lib/merge');

require('util').inherits(Geocoder, EventEmitter);
module.exports = Geocoder;

// Initialize and load Geocoder, with a selection of indexes.
function Geocoder(indexes, options) {
    if (!indexes) throw new Error('Geocoder indexes required.');
    options = options || {};

    var q = queue(10);

    this.indexes = indexes;
    this.replacer = token.createReplacer(options.tokens || {});
    this.byname = {};
    this.bytype = {};
    this.bystack = {};
    this.byidx = [];
    this.names = [];

    for (var k in indexes) {
        indexes[k] = clone(indexes[k]);
        q.defer(loadIndex, k, indexes[k]);
    }

    q.awaitAll(function(err, results) {
        var names = [];
        var types = [];
        var stacks = [];
        if (results) results.forEach(function(data, i) {
            var id = data.id;
            var info = data.info;
            var dictcache = data.dictcache;
            var source = indexes[id];
            var name = info.geocoder_name || id;
            var type = info.geocoder_type||info.geocoder_name||id;
            var stack = info.geocoder_stack || false;
            if (names.indexOf(name) === -1) {
                names.push(name);
                this.byname[name] = [];
            }
            if (types.indexOf(type) === -1) {
                types.push(type);
                this.bytype[type] = [];
            }
            if (typeof stack === 'string') stack = [stack];
            if (stack) {
                for (var j = 0; j < stack.length; j++) {
                    if (stacks.indexOf(stack[j]) === -1) {
                        stacks.push(stack[j]);
                        this.bystack[stack[j]] = [];
                    }
                }
            }

            source._geocoder = source._original._geocoder || new Cache(name, info.geocoder_cachesize);
            source._dictcache = source._original._dictcache || dictcache;

            // Set references to _geocoder, _dictcache on original source to
            // avoid duplication if it's loaded again.
            source._original._geocoder = source._geocoder;
            source._original._dictcache = source._dictcache;

            if (info.geocoder_address) {
              source.geocoder_address = info.geocoder_address;
            } else {
              source.geocoder_address = false;
            }

            if (info.geocoder_version) {
                source.version = parseInt(info.geocoder_version, 10);
                if (source.version !== 6) {
                    err = new Error('geocoder version is not 6, index: ' + id);
                    return;
                }
            } else {
                source.version = 0;
                source.shardlevel = info.geocoder_shardlevel || 0;
            }

            var keys = Object.keys(info);
            for (var ix = 0; ix < keys.length; ix ++) {
                if (/geocoder_format_/.test(keys[ix])) source[keys[ix]] = info[keys[ix]]||false;
            }
            source.geocoder_address_order = info.geocoder_address_order || 'ascending'; // get expected address order from index-level setting
            source.geocoder_format = info.geocoder_format||false;
            source.geocoder_layer = (info.geocoder_layer||'').split('.').shift();
            source.geocoder_tokens = info.geocoder_tokens||{};
            source.token_replacer = token.createReplacer(info.geocoder_tokens||{});

            if(tokenValidator(source.token_replacer)) {
                throw new Error('Using global tokens');
            }

            source.maxzoom = info.maxzoom;
            source.maxscore = info.maxscore;
            source.minscore = info.minscore;
            source.stack = stack;
            source.zoom = info.maxzoom + parseInt(info.geocoder_resolution||0,10);
            source.type = type;
            source.name = name;
            source.id = id;
            source.idx = i;
            source.ndx = names.indexOf(name);
            source.bounds = info.bounds || [ -180, -85, 180, 85 ];

            // add index idx => name idx lookup
            this.names[i] = names.indexOf(name);

            // add byname index lookup
            this.byname[name].push(source);

            // add bytype index lookup
            this.bytype[type].push(source);

            // add bystack index lookup
            for (var j = 0; j < stack.length; j++) {
                this.bystack[stack[j]].push(source);
            }

            // add byidx index lookup
            this.byidx[i] = source;
        }.bind(this));

        // Second pass -- generate bmask (geocoder_stack) per index.
        // The bmask of an index represents a mask of all indexes that their
        // geocoder_stacks do not intersect with -- ie. a spatialmatch with any of
        // these indexes should not be attempted as it will fail anyway.
        for (var i = 0; i < this.byidx.length; i++) {
            var bmask = [];
            var a = this.byidx[i];
            for (var j = 0; j < this.byidx.length; j++) {
                var b = this.byidx[j];
                var a_it = a.stack.length;
                while (a_it--) {
                    var b_it = b.stack.length;
                    while (b_it--) {
                        if (a.stack[a_it] === b.stack[b_it]) {
                            bmask[j] = 0;
                        } else if (bmask[j] !== 0) {
                            bmask[j] = 1;
                        }
                    }
                }
            }
            this.byidx[i].bmask = bmask;
        }

        this._error = err;
        this._opened = true;
        this.emit('open', err);
    }.bind(this));

    function loadIndex(id, source, callback) {
        source.open(function opened(err) {
            if (err) return callback(err);
            var q = queue();
            q.defer(function(done) { source.getInfo(done); });
            q.defer(function(done) {
                if (source._original._dictcache || !source.getGeocoderData) {
                    done();
                } else {
                    source.getGeocoderData('stat', 0, done);
                }
            });
            q.awaitAll(function(err, loaded) {
                if (err) return callback(err);

                // if dictcache is already initialized don't recreate
                if (source._original._dictcache) {
                    callback(null, {
                        id: id,
                        info: loaded[0]
                    });
                // create dictcache at load time to allow incremental gc
                } else {
                    callback(null, {
                        id: id,
                        info: loaded[0],
                        dictcache: new dawgcache(loaded[1])
                    });
                }
            });
        });
    }
}

function clone(source) {
    var cloned = {};
    cloned.getInfo = source.getInfo.bind(source);
    cloned.getTile = source.getTile.bind(source);
    cloned.open = function(callback) {
        if (source.open === true) return callback();
        if (typeof source.open === 'function') return source.open(callback);
        return source.once('open', callback);
    };
    // Optional methods
    [
        '_commit',
        'putInfo',
        'putTile',
        'getGeocoderData',
        'putGeocoderData',
        'geocoderDataIterator',
        'startWriting',
        'stopWriting',
        'getIndexableDocs',
        'serialize'
    ].forEach(function(method) {
        if (typeof source[method] === 'function') {
            cloned[method] = source[method].bind(source);
        }
    });
    // Include reference to original
    cloned._original = source;
    return cloned;
}

function boundsIntersect(a, b) {
    if (a[2] < b[0]) return false; // a is left of b
    if (a[0] > b[2]) return false; // a is right of b
    if (a[3] < b[1]) return false; // a is below b
    if (a[1] > b[3]) return false; // a is above b
    return true;
}

function tokenValidator(token_replacer) {
    for (var i = 0; i < token_replacer.length; i++) {
        if (token_replacer[i].from.toString().indexOf(' ') >= 0 || token_replacer[i].to.toString().indexOf(' ') >= 0) {
            return true;
        }
    }
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

// Merge two indexes
Geocoder.prototype.merge = function(from1, from2, to, pointer, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        merge(self, from1, from2, to, pointer, callback);
    });
};

// Merge arbitrarily many indexes
Geocoder.prototype.multimerge = function(froms, to, pointer, callback) {
    var self = this;
    this._open(function(err) {
        if (err) return callback(err);
        merge.multimerge(self, froms, to, pointer, callback);
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
