#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var argv = require('minimist')(process.argv, {
    string: [ 'version', 'config', 'index', 'tokens' ],
    boolean: [ 'help' ]
});
var settings = require('../package.json');

function help() {
    console.log('carmen-copy.js --config=<path> --index=<path> [options]');
    console.log('[options]:');
    console.log('  --help                  Prints this message');
    console.log('  --version               Print the carmen version');
    console.log('  --config="<path>"       path to JSON document with index settings');
    console.log('  --tokens=<tokens.json>  Load global token file');
    console.log('  --index="<path>"        Tilelive path to output index to');
    process.exit(0);
}

if (argv.help) help();

if (argv.version) {
    console.log('carmen@'+settings.version);
    process.exit(0);
}

if (!argv.config) help();
if (!argv.index) throw new Error('--index argument required');

var tokens = {};
if (argv.tokens) {
    tokens = require(path.resolve(argv.tokens));
}

var conf;
var config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));

argv.index = Carmen.auto(argv.index, function() {
    conf = {
        to: argv.index
    };
    conf.to.startWriting(writeMeta);
});

function writeMeta(err) {
    if (err) throw err;
    conf.to.putInfo(config, stopWriting);
}

function stopWriting(err) {
    if (err) throw err;
    conf.to.stopWriting(index);
}

function index(err) {
    if (err) throw err;

    config.tokens = tokens;

    var carmen = new Carmen(conf, {
        tokens: tokens
    });
    config.output = process.stdout;

    var last = +new Date;
    carmen.on('index', function(num) {
        console.error('Indexed %s docs @ %s/s', num, Math.floor(num * 1000 / (+new Date - last)));
        last = +new Date;
    });

    carmen.on('open', function() {
        carmen.index(process.stdin, conf.to, config, function(err) {
            if (err) throw err;
            process.exitCode = 0;
        });
    });
}
