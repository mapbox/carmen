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

test('4 tokens - one does not match', function(assert) {
    var replacer = token.createReplacer({'Street':'St', 'North':'N', 'Main':'Mn', 'Thirteenth':'13th', "(?<number>1\\d+)": "###${number}###"});
    assert.deepEqual(termops.replaceTokenPermutations(replacer, '123 North Main Street'), [
        '123 North Main Street', '###123### N Mn St', '123 N Mn St', '###123### N Mn Street', '123 N Main St', '123 N Mn Street', '###123### North Mn Street', '123 North Main St', '123 N Main Street', '123 North Mn Street', '###123### North Main Street']
    );
    assert.end();
});