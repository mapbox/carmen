#!/usr/bin/env node

if (!process.argv[2]) {
    console.log('Usage: carmen.js [file|dir] --query="<query>"');
    process.exit(1);
}

var fs = require('fs');
var path = require('path');
var Carmen = require('../index');
var settings = require('../package.json');
var argv = require('minimist')(process.argv, {
    string: [ 'config', 'proximity', 'query', 'debug', 'types', 'version' ],
    boolean: [ 'geojson', 'stats', 'help' ]
});

if (argv.help) {
    console.log('carmen.js --query="<query>" [options]');
    console.log('[options]:');
    console.log('  --version               Print the carmen version');
    console.log('  --config=<file.js>      Load index config from js (module)');
    console.log('  --limit="{limit}"       Customize the number of results returned');
    console.log('  --proximity="lat,lng"   Favour results by proximity');
    console.log('  --types="{type},..."    Only return results of a given type');
    console.log('  --stacks="{stack},..."  Only return results of a given stack');
    console.log('  --geojson               Return a geojson object');
    console.log('  --language={ISO code}   Return responses in specified language (if available in index)');
    console.log('  --stats                 Generate Stats on the query');
    console.log('  --debug="feat id"       Follows a feature through geocode"');
    console.log('  --help                  Print this report');
    process.exit(0);
}

if (argv.version) {
    console.log('carmen@'+settings.version);
    process.exit(0);
}

if (!argv.query) throw new Error('--query argument required');

var opts = {};
if (argv.config) {
    opts = require(path.resolve(argv.config));
} else if (argv._.length > 2) { //Given Tile Source
    var src = path.resolve(argv._[argv._.length-1]);
    var stat = fs.statSync(src);
    if (stat.isDirectory()) {
        opts = Carmen.autodir(src);
    } else {
        opts[path.basename(src)] = Carmen.auto(src);
    }
} else { //Default Tile Source
    opts = Carmen.autodir(path.resolve(__dirname + '/../tiles'));
}

var carmen = new Carmen(opts);

if (argv.proximity) {
    if (argv.proximity.indexOf(',') === -1)
        throw new Error("Proximity must be LNG,LAT");
    argv.proximity = [ Number(argv.proximity.split(',')[0]), Number(argv.proximity.split(',')[1]) ];
}

if (argv.types) {
    argv.types = argv.types.split(',');
}

if (argv.stacks) {
    argv.stacks = argv.stacks.split(',');
}

if (argv.debug) argv.debug = parseInt(argv.debug);

if (argv.limit) argv.limit = parseInt(argv.limit);

var load = +new Date();

carmen.geocode(argv.query, {
    'limit': argv.limit,
    'stacks': argv.stacks,
    'types': argv.types,
    'proximity': argv.proximity,
    'debug': argv.debug,
    'stats': true,
    'language': argv.language,
    'indexes': true
}, function(err, data) {
    if (err) throw err;
    if (data.features.length && !argv.geojson) {
        console.log('Tokens');
        console.log('------');
        console.log(data.query.join(', '));
        console.log('');
        console.log('Features');
        console.log('--------');
        data.features.forEach(function(f) {
            console.log('- %s %s (%s)', f.relevance.toFixed(2), f.place_name, f.id);
        });
        console.log('');
        console.log('Indexes');
        console.log('--------');
        data.indexes.forEach(function(i) {
            console.log('- %s', i);
        });
        console.log('');
    }
    if (data.features.length && argv.geojson) {
        console.log(JSON.stringify(data, null, 2));
    }

    if (argv.debug) {
        console.log('Debug\n-----');
        console.log(data.debug);
        console.log();
    }

    if (!argv.stats) return;
    console.log('Stats');
    console.log('-----');
    console.log('- warmup:       %sms', load);
    console.log('- phrasematch:  %sms', data.stats.phrasematch.time);
    console.log('- spatialmatch: %sms', data.stats.spatialmatch.time);
    console.log('- verifymatch:  %sms', data.stats.verifymatch.time);
    console.log('- totaltime:    %sms', data.stats.time);
});

function rpad(str, len) {
    if (typeof str !== 'string') str = str.toString();
    while (str.length < len) str = str + ' ';
    return str;
}
