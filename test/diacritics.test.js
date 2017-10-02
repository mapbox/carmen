const tape = require('tape');
const removeDiacritics = require('../lib/util/remove-diacritics');

tape('removeDiacritics', t => {
    t.equal(
        removeDiacritics(
            'Hérê àrë søme wöřdš, including diacritics and puncatuation!'
        ),
        'Here are some words, including diacritics and puncatuation!',
        'diacritics are removed from latin text'
    );
    t.equal(
        removeDiacritics(
            'Cranberries are low, creeping shrubs or vines up to 2 metres (7 ft)'
        ),
        'Cranberries are low, creeping shrubs or vines up to 2 metres (7 ft)',
        'nothing happens to latin text with no diacritic marks'
    );
    t.equal(
        removeDiacritics('堪《たま》らん！」と片息《かたいき》になつて、喚《わめ》'),
        '堪《たま》らん！」と片息《かたいき》になつて、喚《わめ》',
        'nothing happens to Japanese text'
    );
    t.equal(
        removeDiacritics('किसी वर्ण के मूल चिह्न के ऊपर, नीचे, अलग-बगल लगने'),
        'किसी वर्ण के मूल चिह्न के ऊपर, नीचे, अलग-बगल लगने',
        'nothing happens to Hindi text'
    );
    t.equal(
        removeDiacritics('άΆέΈήΉίΊόΌύΎ αΑεΕηΗιΙοΟυΥ'),
        'αΑεΕηΗιΙοΟυΥ αΑεΕηΗιΙοΟυΥ',
        'greek diacritics are removed and other characters stay the same'
    );
    t.equal(
        removeDiacritics('ўЎёЁѐЀґҐйЙ уУеЕеЕгГиИ'),
        'уУеЕеЕгГиИ уУеЕеЕгГиИ',
        'cyrillic diacritics are removed and other characters stay the same'
    );
    t.equal(
        removeDiacritics('ي,ی ى'),
        'ى,ى ى',
        'arabic diacritics are removed and other characters stay the same'
    );

    t.end();
});
