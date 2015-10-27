var fork = require('child_process').fork;
var cpus = require('os').cpus().length;
var TIMER = process.env.TIMER;
var workers = [];
module.exports = indexdocs;
module.exports.teardown = teardown;

function indexdocs(docs, freq, zoom, replacer, callback) {
    if (typeof zoom != 'number')
        return callback(new Error('index has no zoom'));
    if (zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was '+zoom));
    if (zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was '+zoom));

    var remaining = docs.length;
    var full = { grid: {}, docs:[] };
    var types = Object.keys(full);
    var patches = [];

    function error(err) {
        if (!callback) return;
        callback(err);
        callback = false;
    }

    // Setup workers.
    if (TIMER) console.time('indexdocs:setup');
    for (var i = 0; i < cpus; i++) {
        workers[i] = workers[i] || fork(__dirname + '/indexdocs-worker.js');
        workers[i].send({
            freq:freq,
            zoom:zoom,
            replacer: replacer
        });
        workers[i].removeAllListeners('exit');
        workers[i].on('exit', exit);
        workers[i].removeAllListeners('message');
        workers[i].on('message', function(patch) {
            if (typeof patch === 'string') return error(new Error(patch));

            patches.push(patch);
            if (patches.length >= 10000) {
                if (TIMER) console.time('indexdocs:processPatch');
                while (patches.length) processPatch(patches.shift(), types, full);
                if (TIMER) console.timeEnd('indexdocs:processPatch');
            }
            remaining = remaining - patch.docs.length;
            if (!remaining) {
                while (patches.length) processPatch(patches.shift(), types, full);
                callback && callback(null, full);
            }
        });
    }
    if (TIMER) console.timeEnd('indexdocs:setup');

    // Send docs to workers.
    if (TIMER) console.time('indexdocs:send');
    for (var i = 0; i < docs.length; i = i + 10) {
        workers[i%cpus].send(docs.slice(i, i+10));
    }
    if (TIMER) console.timeEnd('indexdocs:send');
}

function exit(code) {
    if (!code) return;
    console.warn('Index worker exited with ' + code);
    process.exit(code);
}

function processPatch(patch, types, full) {
    full.docs.push.apply(full.docs, patch.docs);

    for (var i = 0; i < types.length; i++) {
        var type = types[i];
        for (var k in patch[type]) {
            if (type !== 'docs') {
                full[type][k] = full[type][k] || [];
                full[type][k].push.apply(full[type][k], patch[type][k]);
            }
        }
    }
}

function teardown() {
    while (workers.length) {
        workers.shift().kill('SIGHUP');
    }
}

