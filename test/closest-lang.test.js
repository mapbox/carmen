var tape = require('tape');
var closestLangLabel = require('../lib/util/closest-lang');

tape('closestLangLabel', function(assert) {
    // English variations:
    assert.equal(closestLangLabel('en', {
        'en': 'English',
        'es': 'Spanish'
    }), 'English');
    assert.equal(closestLangLabel('en-XX', {
        'en': 'English',
        'es': 'Spanish'
    }), 'English');

    // Chinese variations:
    // Is -/_ and case insensitive but will revert to zh for otherwise unmatched
    // country suffixes.
    var zh = '西北部联邦管区';
    var zht = '西北部聯邦管區';
    assert.equal(closestLangLabel('zh', { zh: zh, zh_Hant: zht }), zh);
    assert.equal(closestLangLabel('zh-xx', { zh: zh, zh_Hant: zht }), zh);
    assert.equal(closestLangLabel('zh-hant', { zh: zh, zh_Hant: zht }), zht);
    assert.equal(closestLangLabel('zh_hant', { zh: zh, zh_Hant: zht }), zht);
    assert.equal(closestLangLabel('zh-Hant', { zh: zh, zh_Hant: zht }), zht);
    assert.equal(closestLangLabel('zh_Hant', { zh: zh, zh_Hant: zht }), zht);
    assert.equal(closestLangLabel('zh-HANT', { zh: zh, zh_Hant: zht }), zht);
    assert.equal(closestLangLabel('zh_HANT', { zh: zh, zh_Hant: zht }), zht);

    assert.end();
});

tape('handle nulls', function(assert) {

    var zh = '帝力縣';
    var zhtw = null;

    assert.equal(closestLangLabel('zh-TW', { zh: zh, zh_TW: zhtw }), zh);

    assert.end();
});

tape('handle nulls w/ prefix', function(assert) {

    var zh = '帝力縣';
    var zhtw = null;

    assert.equal(closestLangLabel('zh_TW', { 'carmen:text_zh': zh, 'carmen:text_zh_TW': zhtw }, 'carmen:text_'), zh);

    assert.end();
});

tape('universal', function(assert) {
    assert.equal(closestLangLabel('en', {
        'universal': '10000'
    }), '10000');
    assert.equal(closestLangLabel('zh', {
        'universal': '10000'
    }), '10000');
    assert.end();
});

tape('getText', function(assert) {
    assert.deepEqual(closestLangLabel.getText(null, {
        'carmen:text': 'Default',
        'carmen:text_en': 'English',
        'carmen:text_universal': 'Universal'
    }), { text: 'Default' });
    assert.deepEqual(closestLangLabel.getText('en', {
        'carmen:text': 'Default',
        'carmen:text_en': 'English',
        'carmen:text_universal': 'Universal'
    }), { text: 'English', language: 'en' });
    assert.deepEqual(closestLangLabel.getText('zh', {
        'carmen:text': 'Default',
        'carmen:text_en': 'English',
        'carmen:text_universal': 'Universal'
    }), { text: 'Universal' });
    assert.end();
});

// sr_BA, sr_CS, sr_ME, and sr_RS (regions where serbian is spoken) fall back to `sr_Latn`. Other (non-serbian-speaking) regions fall back to `sr`
tape('sr_RS', function(assert) {

    var sr = 'sr';
    var sr_Latn = 'sr_Latn';
    var sr_Cyrl = 'sr_Cyrl';

    assert.equal(closestLangLabel('sr-BA', { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl }), sr_Latn);
    assert.equal(closestLangLabel('sr-CS', { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl }), sr_Latn);
    assert.equal(closestLangLabel('sr-ME', { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl }), sr_Latn);
    assert.equal(closestLangLabel('sr-RS', { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl }), sr_Latn);
    assert.equal(closestLangLabel('sr-XX', { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl }), sr);

    assert.end();
});