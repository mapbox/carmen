#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var argv = require('minimist')(process.argv, {
    string: [ 'version', 'config', 'input', 'output' ],
    boolean: [ 'help' ]
});
var settings = require('../package.json');
var queue = require('queue-async');

function help() {
    console.log('carmen-merge.js --input=<path>[,<path>,...] --output=<path> [options]');
    console.log('[options]:');
    console.log('  --help                  Prints this message');
    console.log('  --version               Print the carmen version');
    console.log('  --config="<path>"       path to JSON document with index settings');
    console.log('  --input="<path>"        Tilelive path(s) to pull index from, separated by commas');
    console.log('  --output="<path>"        Tilelive path to output merged index to');
    process.exit(0);
}

if (argv.help) help();

if (argv.version) {
    console.log('carmen@'+settings.version);
    process.exit(0);
}

if (!argv.config) help();

if (!argv.input) throw new Error('--input argument required');
if (!argv.output) throw new Error('--output argument required');

var config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));

argv.input = argv.input.split(",");

var inputsLeft = argv.input.length, outputOpen = false, inputCarmens = [], inputConfs = [];

argv.input = argv.input.forEach(function(input) {
    var conf;

    var auto = Carmen.auto(input, function() {
        var conf = {
            from: auto
        };

        var carmen = new Carmen(conf);
        inputCarmens.push(carmen);
        inputConfs.push(conf);

        carmen.on('open', function() {
            inputsLeft--;
            if (inputsLeft == 0 && outputOpen) doMerge();
        });
    });
});


var outputConf, doMerge;
argv.output = Carmen.auto(argv.output, function() {
    outputConf = {
        to: argv.output
    };
    outputConf.to.startWriting(writeMeta);

    function writeMeta(err) {
        if (err) throw err;
        outputConf.to.putInfo(config, stopWriting);
    }

    function stopWriting(err) {
        if (err) throw err;
        outputConf.to.stopWriting(index);
    }

    function index(err) {
        if (err) throw err;
        var carmen = new Carmen(outputConf);
        var outputConfig = JSON.parse(JSON.stringify(config));
        outputConfig.output = process.stdout;

        carmen.on('open', function() {
            outputOpen = true;
            if (inputsLeft == 0 && outputOpen) doMerge();
        });

        doMerge = function(inputCarmens, outputCarmen) {
            carmen.merge(inputConfs[0].from, inputConfs[1].from, outputConf.to, outputConfig , function(err) {
                if (err) throw err;
                process.exit(0);
            });
        }
    }

});