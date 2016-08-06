var termops = require('../lib/util/termops');
var test = require('tape');
var token = require('../lib/util/token');

test('2 tokens - all match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, 'North Main Street'), ['North Main Street', 'N Main St', 'North Main St', 'N Main Street']
    );
    assert.end();
});

test('3 tokens - all match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N', 'Main':'Mn'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, 'North Main Street'), ['North Main Street',
         'N Mn St',
         'N Main St',
         'N Mn Street',
         'North Main St',
         'N Main Street',
         'North Mn Street']);
    assert.end();
});

test('filter tokens', function(assert) {
    var tokens = token.createReplacer(
        {'Street':'St',
         'North':'N',
         'Main':'Mn',
         'Thirteenth':'13th',
         "(?<number>2\\d+)": "###${number}###"
        });
    assert.deepEqual(JSON.stringify(token.tokenReplacerFilter(tokens, '243 North Main Street')), '[{"named":false,"from":{},"to":"$1St$2"},{"named":false,"from":{},"to":"$1N$2"},{"named":false,"from":{},"to":"$1Mn$2"},{"named":true,"from":{"xregexp":{"captureNames":["tokenBeginning","number","tokenEnding"],"source":"(?<tokenBeginning>\\\\W|^)(?<number>2\\\\d+)(?<tokenEnding>\\\\W|$)","flags":"gi"}},"to":"${tokenBeginning}###${number}###${tokenEnding}"}]');

    assert.end();
});