var termops = require('../lib/util/termops');
var test = require('tape');
var token = require('../lib/util/token');
var fixture = require('./fixtures/tokens.json')

test('2 tokens - all match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, ['north', 'main', 'street']), 
        [['north', 'main', 'street'], ['n', 'main', 'st'], ['north', 'main', 'st'], ['n', 'main', 'street']]);
    assert.end();
});

test('3 tokens - all match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N', 'Main':'Mn'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, ['north', 'main', 'street']).sort(), [
        // 0 replacements
        ['north', 'main', 'street'],
        // 1 at a time
        // 100
        // 010
        // 001
        ['n', 'main', 'street'],
        ['north', 'mn', 'street'],
        ['north', 'main', 'st'],
        // 2 at a time
        // 110
        // 101
        // 011
        ['n', 'mn', 'street'],
        ['n', 'main', 'st'],
        ['north', 'mn', 'st'],
        // 3 at a time
        ['n', 'mn', 'st']
    ].sort());
    assert.end();
});

test('4 tokens - all match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N', 'Main':'Mn', 'West': 'W'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, ['north', 'west', 'main', 'street']).sort(), [
        // 0 replacements
        ['north', 'west', 'main', 'street'],
        // 1 at a time
        // 1000
        // 0100
        // 0010
        // 0001
        ['n', 'west', 'main', 'street'],
        ['north', 'w', 'main', 'street'],
        ['north', 'west', 'mn', 'street'],
        ['north', 'west', 'main', 'st'],
        // 2 at a time
        //1100
        //1010
        //1001
        //0110
        //0101
        //0011
        ['n', 'w', 'main', 'street'],
        ['n', 'west', 'mn', 'street'],
        ['n', 'west', 'main', 'st'],
        ['north', 'w', 'mn', 'street'],
        ['north', 'w', 'main', 'st'],
        ['north', 'west', 'mn', 'st'],
        // 3 at a time
        //1110
        //1101
        //1011
        //0111
        ['n', 'w', 'mn', 'street'],
        ['n', 'w', 'main', 'st'],
        ['n', 'west', 'mn', 'st'],
        ['north', 'w', 'mn', 'st'],
        // 4 at a time
        ['n', 'w', 'mn', 'st']
    ].sort());
    assert.end();
});

test('Tokens with regexp', function(assert) {
    var tokens = token.createReplacer(
        {'Street':'St',
         'North':'N',
         'Main':'Mn',
         'Thirteenth':'13th',
         "(?<number>2\\d+)": "###${number}###"
        });
    var replaced = token.tokenReplacerFilter(tokens, termops.tokenize('243 North Main Street'));

    assert.deepEqual(replaced[0].named, false);
    assert.deepEqual(replaced[0].from, /^Street$/gi);
    assert.deepEqual(replaced[0].to, 'St');

    assert.deepEqual(replaced[1].named, false);
    assert.deepEqual(replaced[1].from, /^North$/gi);
    assert.deepEqual(replaced[1].to, 'N');

    assert.deepEqual(replaced[2].named, false);
    assert.deepEqual(replaced[2].from, /^Main$/gi);
    assert.deepEqual(replaced[2].to, 'Mn');

    assert.deepEqual(replaced[3].named, true);
    assert.deepEqual(replaced[3].from.toString(), /^(2\d+)$/gi.toString());

    assert.end();
});

test('Tokens for CJK characters', function(assert) {
    var tokens = token.createReplacer(fixture);
    assert.deepEqual(termops.replaceTokenPermutations(tokens, ['9丁目']), [ ['9丁目'], ['九丁目'] ], 'should be equivalent');
    assert.end();
});

test('Word boundaries an unicode characters', function(assert) {
    var replacer = token.createReplacer({'North':'N'});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, ['general', 'pirán', 'argentina']),
        [['general', 'pirán', 'argentina']]);
    assert.end();
});
