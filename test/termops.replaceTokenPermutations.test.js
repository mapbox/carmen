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
    assert.deepEqual(termops.replaceTokenPermutations(replacer, 'North Main Street').sort(), [
        // 0 replacements
        'North Main Street',
        // 1 at a time
        // 100
        // 010
        // 001
        'N Main Street',
        'North Mn Street',
        'North Main St',
        // 2 at a time
        // 110
        // 101
        // 011
        'N Mn Street',
        'N Main St',
        'North Mn St',
        // 3 at a time
        'N Mn St',
    ].sort());
    assert.end();
});

test('4 tokens - all match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N', 'Main':'Mn', 'West': 'W'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, 'North West Main Street').sort(), [
        // 0 replacements
        'North West Main Street',
        // 1 at a time
        // 1000
        // 0100
        // 0010
        // 0001
        'N West Main Street',
        'North W Main Street',
        'North West Mn Street',
        'North West Main St',
        // 2 at a time
        //1100
        //1010
        //1001
        //0110
        //0101
        //0011
        'N W Main Street',
        'N West Mn Street',
        'N West Main St',
        'North W Mn Street',
        'North W Main St',
        'North West Mn St',
        // 3 at a time
        //1110
        //1101
        //1011
        //0111
        'N W Mn Street',
        'N W Main St',
        'N West Mn St',
        'North W Mn St',
        // 4 at a time
        'N W Mn St',
    ].sort());
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
