var termops = require('../lib/util/termops');
var test = require('tape');

test('tokenizes basic strings', function(assert) {
    assert.deepEqual(termops.tokenize('foo'), ['foo']);
    assert.deepEqual(termops.tokenize('foo bar'), ['foo', 'bar']);
    assert.deepEqual(termops.tokenize('foo-bar'), ['foo', 'bar'], 'splits on - (non-numeric)');
    assert.deepEqual(termops.tokenize('foo+bar'), ['foo', 'bar'], 'splits on +');
    assert.deepEqual(termops.tokenize('foo_bar'), ['foo', 'bar'], 'splits on _');
    assert.deepEqual(termops.tokenize('foo:bar'), ['foo', 'bar'], 'splits on :');
    assert.deepEqual(termops.tokenize('foo;bar'), ['foo', 'bar'], 'splits on ;');
    assert.deepEqual(termops.tokenize('foo|bar'), ['foo', 'bar'], 'splits on |');
    assert.deepEqual(termops.tokenize('foo}bar'), ['foo', 'bar'], 'splits on }');
    assert.deepEqual(termops.tokenize('foo{bar'), ['foo', 'bar'], 'splits on {');
    assert.deepEqual(termops.tokenize('foo[bar'), ['foo', 'bar'], 'splits on [');
    assert.deepEqual(termops.tokenize('foo]bar'), ['foo', 'bar'], 'splits on ]');
    assert.deepEqual(termops.tokenize('foo(bar'), ['foo', 'bar'], 'splits on (');
    assert.deepEqual(termops.tokenize('foo)bar'), ['foo', 'bar'], 'splits on )');
    assert.deepEqual(termops.tokenize('foo b.a.r'), ['foo', 'bar'], 'collapses .');
    assert.deepEqual(termops.tokenize('foo\'s bar'), ['foos', 'bar'], 'collapses apostraphe');
    assert.deepEqual(termops.tokenize('69-150'), ['69-150']);
    assert.deepEqual(termops.tokenize('4-10'), ['4-10']);
    assert.deepEqual(termops.tokenize('5-02A'), ['5-02a']);
    assert.deepEqual(termops.tokenize('23-'), ['23']);
    assert.deepEqual(termops.tokenize('San José'), ['san', 'josé']);
    assert.deepEqual(termops.tokenize('Chamonix-Mont-Blanc'), ['chamonix','mont','blanc']);
    assert.deepEqual(termops.tokenize('Москва'), ['москва']);
    assert.deepEqual(termops.tokenize('京都市'), ['京都市']);
    assert.deepEqual(termops.tokenize('市都京'), ['市', '都', '京']);
    assert.deepEqual(termops.tokenize('岐阜県中津'), ['岐阜県','中津']);
    assert.end();
});
test('tokenizes lonlat', function(assert) {
    assert.deepEqual(termops.tokenize('40,0', true), [40,0]);
    assert.deepEqual(termops.tokenize('40.00000,-40.31200', true), [40,-40.312]);
    assert.deepEqual(termops.tokenize('-120.9129102983109, 45.312312', true), [-120.9129102983109,45.312312]);
    // Housenumber like pairs are left alone
    assert.deepEqual(termops.tokenize('1400 15', true), ['1400','15']);
    assert.deepEqual(termops.tokenize('14th 15th', true), ['14th','15th']);

    // ParseFloat can think a string is a reverse query as `9 Street` is a valid Float - enforce numeric input
    assert.deepEqual(termops.tokenize('9 rue Alphonse Penaud Paris, 75020 France', true), [ '9', 'rue', 'alphonse', 'penaud', 'paris', '75020', 'france' ]);
    assert.deepEqual(termops.tokenize('9 a, 10 b', true), [ '9', 'a', '10', 'b' ]);
    assert.deepEqual(termops.tokenize('9 a, 10', true), [ '9', 'a', '10' ]);
    assert.deepEqual(termops.tokenize('9,10 b', true), [ '9', '10', 'b']);

    assert.end();
});
test('edge cases - empty string', function(assert) {
    assert.deepEqual(termops.tokenize(''), []);
    assert.end();
});

test('tokenize Japanese strings with numeric component', function(assert) {
    assert.deepEqual(termops.tokenize('岐阜県中津川市馬籠4571-1'),  ['岐阜県', '中津', '川市', '馬', '籠', '4571', '-', '1'], 'dashed number at end');
    assert.deepEqual(termops.tokenize('岐阜県中津川市4571-1馬籠'),  ['岐阜県', '中津', '川市', '4571','-','1','馬','籠'], 'dashed number in middle');
    assert.deepEqual(termops.tokenize('岐阜県中津川市4571馬籠'),    ['岐阜県', '中津', '川市', '4571', '馬','籠'], 'number in middle');
    assert.deepEqual(termops.tokenize('岐阜県中津川市4571馬籠123'), ['岐阜県', '中津', '川市', '4571', '馬','籠','123'], 'numbers in middle and at end');
    assert.deepEqual(termops.tokenize('123中津川市4571馬籠'), ['123中津川市4571馬籠'], 'does not split strings that begin with numbers');
    assert.end();
});

test('tokenize excludes un-unidecodable characters', function(assert) {
    assert.deepEqual(termops.tokenize(decodeURIComponent('%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82')), [], '20 sobbies = 0 tokens');
    assert.deepEqual(termops.tokenize(decodeURIComponent('new+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+york')), ['new', 'york'], 'intermediate emojis removed');
    assert.end();
});
