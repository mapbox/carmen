const tape = require('tape');
const fallbackDisplay = require('../lib/util/fallback-display');
const fallbackIndexer = require('../lib/util/fallback-indexer');

tape('fallback lists', assert => {
    assert.deepEqual(
        Object.keys(fallbackDisplay),
        Object.keys(fallbackIndexer),
        'same language codes between display/indexer'
    );

    Object.keys(fallbackDisplay).forEach(langcode => {
        const display = fallbackDisplay[langcode] || [];
        const indexer = fallbackIndexer[langcode] || [];
        assert.ok(
            indexer.every(lang => {
                return display.indexOf(lang) !== -1;
            }),
            `${langcode} indexer languages are a subset of display languages`
        );
    });
    assert.end();
});
