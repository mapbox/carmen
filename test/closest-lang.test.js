const tape = require('tape');
const closestLangLabel = require('../lib/util/closest-lang');

tape('closestLangLabel', t => {
    // English variations:
    t.equal(
        closestLangLabel('en', {
            en: 'English',
            es: 'Spanish'
        }),
        'English'
    );
    t.equal(
        closestLangLabel('en-XX', {
            en: 'English',
            es: 'Spanish'
        }),
        'English'
    );

    // Chinese variations:
    // Is -/_ and case insensitive but will revert to zh for otherwise unmatched
    // country suffixes.
    const zh = '西北部联邦管区';
    const zht = '西北部聯邦管區';
    t.equal(closestLangLabel('zh', { zh: zh, zh_Hant: zht }), zh);
    t.equal(closestLangLabel('zh-xx', { zh: zh, zh_Hant: zht }), zh);
    t.equal(closestLangLabel('zh-hant', { zh: zh, zh_Hant: zht }), zht);
    t.equal(closestLangLabel('zh_hant', { zh: zh, zh_Hant: zht }), zht);
    t.equal(closestLangLabel('zh-Hant', { zh: zh, zh_Hant: zht }), zht);
    t.equal(closestLangLabel('zh_Hant', { zh: zh, zh_Hant: zht }), zht);
    t.equal(closestLangLabel('zh-HANT', { zh: zh, zh_Hant: zht }), zht);
    t.equal(closestLangLabel('zh_HANT', { zh: zh, zh_Hant: zht }), zht);

    t.end();
});

tape('Arabic fallback', t => {
    //Arabic fallback behaviour
    t.equal(
        closestLangLabel('ar', {
            en: 'English'
        }),
        'English'
    );
    t.end();
});

tape('handle nulls', t => {
    const zh = '帝力縣';
    const zhtw = null;

    t.equal(closestLangLabel('zh-TW', { zh: zh, zh_TW: zhtw }), zh);

    t.end();
});

tape('handle nulls w/ prefix', t => {
    const zh = '帝力縣';
    const zhtw = null;

    t.equal(
        closestLangLabel(
            'zh_TW',
            { 'carmen:text_zh': zh, 'carmen:text_zh_TW': zhtw },
            'carmen:text_'
        ),
        zh
    );

    t.end();
});

tape('universal', t => {
    t.equal(
        closestLangLabel('en', {
            universal: '10000'
        }),
        '10000'
    );
    t.equal(
        closestLangLabel('zh', {
            universal: '10000'
        }),
        '10000'
    );
    t.end();
});

tape('getText', t => {
    t.deepEqual(
        closestLangLabel.getText(null, {
            'carmen:text': 'Default',
            'carmen:text_en': 'English',
            'carmen:text_universal': 'Universal'
        }),
        { text: 'Default' }
    );
    t.deepEqual(
        closestLangLabel.getText('en', {
            'carmen:text': 'Default',
            'carmen:text_en': 'English',
            'carmen:text_universal': 'Universal'
        }),
        { text: 'English', language: 'en' }
    );
    t.deepEqual(
        closestLangLabel.getText('zh', {
            'carmen:text': 'Default',
            'carmen:text_en': 'English',
            'carmen:text_universal': 'Universal'
        }),
        { text: 'Universal' }
    );
    t.end();
});

// sr_BA, sr_CS, sr_ME, and sr_RS (regions where serbian is spoken) fall back to `sr_Latn`, then `hr` and `bs`. Other (non-serbian-speaking) regions fall back to `sr`
tape('serbian fallbacks', t => {
    const sr = 'sr';
    const sr_Latn = 'sr_Latn';
    const sr_Cyrl = 'sr_Cyrl';
    const hr = 'hr';
    const bs = 'bs';
    const languageMode = 'strict';

    t.equal(
        closestLangLabel(
            'sr-BA',
            { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl },
            null,
            languageMode
        ),
        sr_Latn,
        'sr-BA falls back to sr_Latn'
    );
    t.equal(
        closestLangLabel(
            'sr-CS',
            { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl },
            null,
            languageMode
        ),
        sr_Latn,
        'sr-CS falls back to sr_Latn'
    );
    t.equal(
        closestLangLabel(
            'sr-ME',
            { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl },
            null,
            languageMode
        ),
        sr_Latn,
        'sr-ME falls back to sr_Latn'
    );
    t.equal(
        closestLangLabel(
            'sr-RS',
            { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl },
            null,
            languageMode
        ),
        sr_Latn,
        'sr-RS falls back to sr_Latn'
    );
    t.equal(
        closestLangLabel(
            'sr-XX',
            { sr: sr, sr_Latn: sr_Latn, sr_Cyrl: sr_Cyrl },
            null,
            languageMode
        ),
        sr_Latn,
        'sr-XX falls back to sr_Latn'
    );
    t.equal(
        closestLangLabel(
            'sr-RS',
            { sr: sr, sr_Cyrl: sr_Cyrl, hr: hr, bs: bs },
            null,
            languageMode
        ),
        hr,
        'use hr if sr_Latn not present'
    );
    t.equal(
        closestLangLabel(
            'sr-RS',
            { sr: sr, sr_Cyrl: sr_Cyrl, bs: bs },
            null,
            languageMode
        ),
        bs,
        'use bs if sr_Latn and hr not present'
    );

    t.equal(
        closestLangLabel(
            'sr-XX',
            { sr: sr, sr_Cyrl: sr_Cyrl, hr: hr, bs: bs },
            null,
            languageMode
        ),
        undefined,
        'no equivalent language matching unless explicitly set'
    );
    t.equal(
        closestLangLabel('sr-Latn', { sr: sr }, null, languageMode),
        undefined,
        'no mixed scripts in strict mode'
    );

    t.end();
});
