var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.getIndexableText', function(assert) {
    var freq = { 0:[2] };
    var replacer;
    var doc;
    var texts;

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        [ 'main', 'street' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, doc), texts, 'creates indexableText');

    replacer = token.createReplacer({'Street':'St'});
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        [ 'main', 'street' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, doc), texts, 'creates contracted phrases using geocoder_tokens');

    replacer = token.createReplacer({'Street':'St'});
    doc = { properties: { 'carmen:text': 'Main Street, main st' } };
    texts = [
        ['main', 'street'], ['main', 'st']
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(JSON.stringify(termops.getIndexableText(replacer, doc)), JSON.stringify(texts), 'dedupes phrases');

    replacer = token.createReplacer({'Street':'St', 'Lane':'Ln'});
    doc = { properties: { 'carmen:text': 'Main Street Lane' } };
    texts = [
        [ 'main', 'street', 'lane' ]
    ];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, doc), texts, 'dedupes phrases');

    replacer = token.createReplacer({'dix-huitième':'18e'});
    doc = { properties: { 'carmen:text': 'Avenue du dix-huitième régiment' } };
    texts = [[ 'avenue', 'du', 'dix', 'huitième', 'régiment' ]];
    texts[0].indexDegens = true;
    assert.deepEqual(termops.getIndexableText(replacer, doc), texts, 'hypenated replacement');

    replacer = token.createReplacer({});
    doc = {
        properties: {
            'carmen:text':'Main Street', 
            'carmen:addressnumber': [1, 10, 100, 200]
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
    assert.deepEqual(termops.getIndexableText(replacer, doc), texts, 'with range');

    // sets indexDegens to false for translated text
    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Main Street', 'carmen:text_es': 'El Main Street' } };
    texts = [
        [ 'main', 'street' ],
        [ 'el', 'main', 'street' ]
    ];
    texts[0].indexDegens = true;
    texts[1].indexDegens = false;
    assert.deepEqual(termops.getIndexableText(replacer, doc), texts, 'creates indexableText, sets indexDegens to false for translations');

    assert.end();
});

