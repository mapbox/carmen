var Carmen = require('../index.js');
var queue = require('d3-queue').queue;
var merge = require('../lib/merge.js');

process.on('message', function(data) {
    // resolve sources
    var q = queue();
    var inputConfs = [];
    var outputConf;
    [data.from1File, data.from2File].forEach(function(input) {
        q.defer(function(input, callback) {
            var auto = Carmen.auto(input, function() {
                var conf = {
                    from: auto
                };

                inputConfs.push(conf);
                callback();
            });
        }, input);
    });
    q.defer(function(callback) {
        merge.getOutputConf(data.mergeToFile, data.options, function(_oc) {
            outputConf = _oc;
            callback();
        });
    });
    q.awaitAll(function() {
        var carmens = [new Carmen(inputConfs[0]), new Carmen(inputConfs[1]), new Carmen(outputConf)];
        var openq = queue();
        carmens.forEach(function(carmen) { openq.defer(function(callback) {
            carmen.on('open', callback);
        })})
        openq.awaitAll(function() {
            console.log("# starting merge of " + inputConfs[0].from._original.filename + " and " +
                inputConfs[1].from._original.filename + " into " + outputConf.to._original.filename
            );
            carmens[2].merge(inputConfs[0].from, inputConfs[1].from, outputConf.to, data.options, function(err) {
                if (err) throw err;

                console.log("# completed merge of " + inputConfs[0].from._original.filename + " and " +
                    inputConfs[1].from._original.filename + " into " + outputConf.to._original.filename
                );

                process.exit(0);
            });
        });
    });
});