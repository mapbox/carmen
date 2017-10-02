const termops = require('../lib/util/termops');
const test = require('tape');

test('tokenizes basic strings', t => {
    t.deepEqual(termops.tokenize('foo'), ['foo']);
    t.deepEqual(termops.tokenize('foo bar'), ['foo', 'bar']);
    t.deepEqual(
        termops.tokenize('foo-bar'),
        ['foo', 'bar'],
        'splits on - (non-numeric)'
    );
    t.deepEqual(termops.tokenize('foo+bar'), ['foo', 'bar'], 'splits on +');
    t.deepEqual(termops.tokenize('foo_bar'), ['foo', 'bar'], 'splits on _');
    t.deepEqual(termops.tokenize('foo:bar'), ['foo', 'bar'], 'splits on :');
    t.deepEqual(termops.tokenize('foo;bar'), ['foo', 'bar'], 'splits on ;');
    t.deepEqual(termops.tokenize('foo|bar'), ['foo', 'bar'], 'splits on |');
    t.deepEqual(termops.tokenize('foo}bar'), ['foo', 'bar'], 'splits on }');
    t.deepEqual(termops.tokenize('foo{bar'), ['foo', 'bar'], 'splits on {');
    t.deepEqual(termops.tokenize('foo[bar'), ['foo', 'bar'], 'splits on [');
    t.deepEqual(termops.tokenize('foo]bar'), ['foo', 'bar'], 'splits on ]');
    t.deepEqual(termops.tokenize('foo(bar'), ['foo', 'bar'], 'splits on (');
    t.deepEqual(termops.tokenize('foo)bar'), ['foo', 'bar'], 'splits on )');
    t.deepEqual(termops.tokenize('foo b.a.r'), ['foo', 'bar'], 'collapses .');
    t.deepEqual(
        termops.tokenize("foo's bar"),
        ['foos', 'bar'],
        'collapses apostraphe'
    );
    t.deepEqual(termops.tokenize('69-150'), ['69-150']);
    t.deepEqual(termops.tokenize('4-10'), ['4-10']);
    t.deepEqual(termops.tokenize('5-02A'), ['5-02a']);
    t.deepEqual(termops.tokenize('23-'), ['23']);
    t.deepEqual(termops.tokenize('San José'), ['san', 'josé']);
    t.deepEqual(termops.tokenize('Chamonix-Mont-Blanc'), [
        'chamonix',
        'mont',
        'blanc'
    ]);
    t.deepEqual(termops.tokenize('Москва'), ['москва']);
    t.deepEqual(termops.tokenize('京都市'), ['京', '都', '市']);
    t.end();
});
test('tokenizes lonlat', t => {
    t.deepEqual(termops.tokenize('40,0', true), [40, 0]);
    t.deepEqual(termops.tokenize('40.00000,-40.31200', true), [40, -40.312]);
    t.deepEqual(termops.tokenize('-120.9129102983109, 45.312312', true), [
        -120.9129102983109,
        45.312312
    ]);
    // Housenumber like pairs are left alone
    t.deepEqual(termops.tokenize('1400 15', true), ['1400', '15']);
    t.deepEqual(termops.tokenize('14th 15th', true), ['14th', '15th']);

    // ParseFloat can think a string is a reverse query as `9 Street` is a valid Float - enforce numeric input
    t.deepEqual(
        termops.tokenize('9 rue Alphonse Penaud Paris, 75020 France', true),
        ['9', 'rue', 'alphonse', 'penaud', 'paris', '75020', 'france']
    );
    t.deepEqual(termops.tokenize('9 a, 10 b', true), ['9', 'a', '10', 'b']);
    t.deepEqual(termops.tokenize('9 a, 10', true), ['9', 'a', '10']);
    t.deepEqual(termops.tokenize('9,10 b', true), ['9', '10', 'b']);

    t.end();
});
test('edge cases - empty string', t => {
    t.deepEqual(termops.tokenize(''), []);
    t.end();
});

test('tokenize Japanese strings with numeric component', t => {
    t.deepEqual(
        termops.tokenize('中津川市馬籠4571-1'),
        ['中', '津', '川', '市', '馬', '籠', '4571', '-', '1'],
        'dashed number at end'
    );
    t.deepEqual(
        termops.tokenize('中津川市4571-1馬籠'),
        ['中', '津', '川', '市', '4571', '-', '1', '馬', '籠'],
        'dashed number in middle'
    );
    t.deepEqual(
        termops.tokenize('中津川市4571馬籠'),
        ['中', '津', '川', '市', '4571', '馬', '籠'],
        'number in middle'
    );
    t.deepEqual(
        termops.tokenize('中津川市4571馬籠123'),
        ['中', '津', '川', '市', '4571', '馬', '籠', '123'],
        'numbers in middle and at end'
    );
    t.deepEqual(
        termops.tokenize('123中津川市4571馬籠'),
        ['123中津川市4571馬籠'],
        'does not split strings that begin with numbers'
    );
    t.end();
});

test('tokenize excludes un-unidecodable characters', t => {
    t.deepEqual(
        termops.tokenize(
            decodeURIComponent(
                '%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82'
            )
        ),
        [],
        '20 sobbies = 0 tokens'
    );
    t.deepEqual(
        termops.tokenize(
            decodeURIComponent(
                'new+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+york'
            )
        ),
        ['new', 'york'],
        'intermediate emojis removed'
    );
    t.end();
});
