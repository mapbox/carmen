#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var merge = require('../lib/merge.js');
var argv = require('minimist')(process.argv, {
    string: ['version', 'config', 'input', 'output'],
    boolean: ['help']
});
var settings = require('../package.json');
var queue = require('d3-queue').queue;

function help() {
    console.log(
        'carmen-merge.js --input=<path>[,<path>,...] --output=<path> [options]'
    );
    console.log('[options]:');
    console.log('  --help                  Prints this message');
    console.log('  --version               Print the carmen version');
    console.log(
        '  --config="<path>"       path to JSON document with index settings'
    );
    console.log(
        '  --input="<path>"        Tilelive path(s) to pull index from, separated by commas'
    );
    console.log(
        '                          (any directories will have all of their .mbtiles files merged)'
    );
    console.log(
        '  --output="<path>"        Tilelive path to output merged index to'
    );
    process.exit(0);
}

if (argv.help) help();

if (argv.version) {
    console.log('carmen@' + settings.version);
    process.exit(0);
}

if (!argv.config) help();

if (!argv.input) throw new Error('--input argument required');
if (!argv.output) throw new Error('--output argument required');

var config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));

var inputs = [];
argv.input.split(',').forEach(function(_input) {
    var conf;
    if (fs.lstatSync(_input).isDirectory()) {
        fs
            .readdirSync(_input)
            .filter(function(fname) {
                return /\.mbtiles$/.exec(fname);
            })
            .forEach(function(fname) {
                inputs.push(path.join(_input, fname));
            });
    } else {
        inputs.push(_input);
    }
});

var outputOptions = JSON.parse(JSON.stringify(config));
merge.multimerge(inputs, argv.output, outputOptions, function(err) {
    if (err) throw err;
    process.exit(0);
});
