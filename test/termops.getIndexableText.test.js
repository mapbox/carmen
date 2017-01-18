var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.getIndexableText', function(assert) {
    var replacer;
    var doc;
    var texts;

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        [ 'main', 'street' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates indexableText');

    replacer = token.createReplacer({'Street':'St'});
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        [ 'main', 'st' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates contracted phrases using geocoder_tokens');

    replacer = token.createReplacer({'Street':'St'});
    doc = { properties: { 'carmen:text': 'Main Street, main st' } };
    texts = [
        [ 'main', 'st' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'dedupes phrases');

    replacer = token.createReplacer({'Street':'St', 'Lane':'Ln'});
    doc = { properties: { 'carmen:text': 'Main Street Lane' } };
    texts = [
        [ 'main', 'st', 'ln' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'dedupes phrases');

    replacer = token.createReplacer({'dix-huitième':'18e'});
    doc = { properties: { 'carmen:text': 'Avenue du dix-huitième régiment' } };
    texts = [[ 'avenue', 'du', '18e', 'régiment' ]];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'hypenated replacement');

    replacer = token.createReplacer({});
    doc = {
        properties: {
            'carmen:text':'Main Street',
            'carmen:addressnumber': [[1, 10, 100, 200]]
        }
    };
    texts = [
        ['2##', 'main', 'street' ],
        ['1##', 'main', 'street' ],
        ['##', 'main', 'street' ],
        ['#', 'main', 'street' ],
    ];
    texts[0].indexDegens = true;
    texts[1].indexDegens = true;
    texts[2].indexDegens = true;
    texts[3].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, [],  doc), texts, 'with range');

    // sets indexDegens to false for translated text
    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Main Street', 'carmen:text_es': 'El Main Street' } };
    texts = [
        [ 'main', 'street' ],
        [ 'el', 'main', 'street' ]
    ];
    texts[0].indexDegens = true;
    texts[1].indexDegens = false;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates indexableText, sets indexDegens to false for translations');

    // doesn't indexDegens for synonyms
    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Latveria,Republic of Latveria' } };
    texts = [
        [ 'latveria' ],
        [ 'republic', 'of', 'latveria' ]
    ];
    texts[0].indexDegens = true;
    texts[1].indexDegens = false;
    assert.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates indexableText w/ synonyms, sets indexDegens to false for synonyms after first');

    assert.end();
});

