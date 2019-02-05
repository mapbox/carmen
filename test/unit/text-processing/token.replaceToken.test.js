'use strict';
const token = require('../../../lib/text-processing/token');
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

const tokenList = {
    'First': '1st',
    'Second': '2nd',
    'Third': '3rd',
    'Fourth': '4th',
    'Fifth': '5th',
    'Sixth': '6th',
    'Seventh': '7th',
    'Eigth': '8th',
    'Ninth': '9th',
    'Tenth': '10th',
    'Eleventh': '11th',
    'Twelfth': '12th',
    'Thirteenth': '13th',
    'Fourteenth': '14th',
    'Fifteenth': '15th',
    'Sixteenth': '16th',
    'Seventeenth': '17th',
    'Eighteenth': '18th',
    'Nineteenth': '19th',
    'Twentieth': '20th',
    'Alley': 'Aly',
    'Arcade': 'Arc',
    'Avenue': 'Ave',
    'Bayoo': 'Byu',
    'Beach': 'Bch',
    'Bluff': 'Blf',
    'Bottom': 'Btm',
    'Boulevard': 'Blvd',
    'Branch': 'Br',
    'Bridge': 'Brg',
    'Brook': 'Brk',
    'Brooks': 'Brks',
    'Burg': 'Bg',
    'Burgs': 'Bgs',
    'Bypass': 'Byp',
    'Calle': 'Cll',
    'Camp': 'Cp',
    'Canyon': 'Cyn',
    'Cape': 'Cpe',
    'Causeway': 'Cswy',
    'Center': 'Ctr',
    'Centers': 'Ctrs',
    'Circle': 'Cir',
    'Circles': 'Cirs',
    'Cliff': 'Clf',
    'Cliffs': 'Clfs',
    'Club': 'Clb',
    'Common': 'Cmn',
    'Corner': 'Cor',
    'Course': 'Crse',
    'Court': 'Ct',
    'Courts': 'Cts',
    'Cove': 'Cv',
    'Creek': 'Crk',
    'Crescent': 'Cres',
    'Crest': 'Crst',
    'Crossing': 'Xing',
    'Curve': 'Curv',
    'Dale': 'Dl',
    'Dam': 'Dm',
    'Divide': 'Dv',
    'Drive': 'Dr',
    'Drives': 'Drs',
    'East': 'E',
    'Estate': 'Est',
    'Estates': 'Ests',
    'Expressway': 'Expy',
    'Extension': 'Ext',
    'Extensions': 'Exts',
    'Falls': 'Fls',
    'Ferry': 'Fry',
    'Field': 'Fld',
    'Fields': 'Flds',
    'Flat': 'Flt',
    'Flats': 'Flts',
    'Ford': 'Frd',
    'Forest': 'Frst',
    'Forge': 'Frg',
    'Forges': 'Frgs',
    'Fork': 'Frk',
    'Fort': 'Ft',
    'Freeway': 'Fwy',
    'Grade': 'Grd',
    'Green': 'Grn',
    'Harbor': 'Hbr',
    'Harbors': 'Hbrs',
    'Haven': 'Hvn',
    'Heights': 'Hts',
    'Highway': 'Hwy',
    'Hill': 'Hl',
    'Hills': 'Hls',
    'Hollow': 'Holw',
    'Industrial': 'Ind',
    'Interstate': 'I',
    'Island': 'Is',
    'Islands': 'Iss',
    'Junction': 'Jct',
    'Junctions': 'Jcts',
    'Junior': 'Jr',
    'Key': 'Ky',
    'Keys': 'Kys',
    'Knoll': 'Knl',
    'Knolls': 'Knls',
    'Lake': 'Lk',
    'Lakes': 'Lks',
    'Landing': 'Lndg',
    'Lane': 'Ln',
    'Lieutenant': 'Lt',
    'Light': 'Lgt',
    'Lights': 'Lgts',
    'Loaf': 'Lf',
    'Lock': 'Lck',
    'Locks': 'Lcks',
    'Lodge': 'Ldg',
    'Mall': 'Mal',
    'Manor': 'Mnr',
    'Manors': 'Mnrs',
    'Meadow': 'Mdw',
    'Meadows': 'Mdws',
    'Mill': 'Ml',
    'Mission': 'Msn',
    'Moorhead': 'Mhd',
    'Motorway': 'Mtwy',
    'Mountain': 'Mtn',
    'Mount': 'Mt',
    'Neck': 'Nck',
    'Northeast': 'NE',
    'North': 'N',
    'Northwest': 'NW',
    'Orchard': 'Orch',
    'Overpass': 'Ovps',
    'Parkway': 'Pky',
    'Passage': 'Psge',
    'Place': 'Pl',
    'Plain': 'Pln',
    'Plains': 'Plns',
    'Plaza': 'Plz',
    'Point': 'Pt',
    'Points': 'Pts',
    'Port': 'Prt',
    'Ports': 'Prts',
    'Prairie': 'Pr',
    'Private': 'Pvt',
    'Radial': 'Radl',
    'Ranch': 'Rnch',
    'Rapid': 'Rpd',
    'Rapids': 'Rpds',
    'Rest': 'Rst',
    'Ridge': 'Rdg',
    'Ridges': 'Rdgs',
    'River': 'Riv',
    'Road': 'Rd',
    'Roads': 'Rds',
    'Route': 'Rte',
    'Saint': 'St',
    'Senior': 'Sr',
    'Sergeant': 'Sgt',
    'Shoal': 'Shl',
    'Shoals': 'Shls',
    'Shore': 'Shr',
    'Shores': 'Shrs',
    'Skyway': 'Sky',
    'Southeast': 'SE',
    'South': 'S',
    'Southwest': 'SW',
    'Spring': 'Spg',
    'Springs': 'Spgs',
    'Square': 'Sq',
    'Squares': 'Sqs',
    'Station': 'Sta',
    'Stream': 'Strm',
    'Streets': 'Sts',
    'Street': 'St',
    'Summit': 'Smt',
    'Terrace': 'Ter',
    'Thoroughfare': 'Thfr',
    'Thruway': 'Thwy',
    'Trace': 'Trce',
    'Trafficway': 'Tfwy',
    'Trail': 'Trl',
    'Tunnel': 'Tunl',
    'Turnpike': 'Tpke',
    'Underpass': 'Unp',
    'Unions': 'Uns',
    'Union': 'Un',
    'Valleys': 'Vlys',
    'Valley': 'Vly',
    'Viaduct': 'Via',
    'Views': 'Vws',
    'View': 'Vw',
    'Villages': 'Vlgs',
    'Village': 'Vlg',
    'Ville': 'Vl',
    'Vista': 'Vis',
    'Walkway': 'Wlky',
    'West': 'W',
    'San Francisco': 'sf',
    'Rio': 'R',
    'S.': 'S'
};

// store an original copy of the tokenList object that we can compare against to
// ensure we don't mutate the tokenList object directly
const tokenClone = JSON.parse(JSON.stringify(tokenList));

const categorized = token.categorizeTokenReplacements(tokenList);
const simpleTokens = token.createSimpleReplacer(categorized.simple);
const complexTokensR = token.createComplexReplacer(categorized.complex, { includeUnambiguous: true });

// this function simulates the current typical usage, which is to enumerate
// using complex replacements, and then perform simple substitution using the
// simple ones
const applySimpleAndComplex = function(str) {
    return token.enumerateTokenReplacements(complexTokensR, str).map((s) => {
        return termops.tokenize(s).tokens.map((word) => simpleTokens.tokens.get(word) || word).join(' ');
    });
};

// We use the same tokens object to create both indexer and runtime token replacers.
// Test that indexer-only token replacers don't leak into runtime replacers.
test('create*Replacer', (q) => {
    q.deepEqual(tokenList, tokenClone, 'create*Replacer does not mutate tokenList object');
    q.end();
});

test('token replacement', (t) => {
    const complexTokens = token.createComplexReplacer(categorized.complex);

    // lastWord is false because the final replacement is complex
    t.deepEqual(token.replaceToken(complexTokens, 'fargo street, san francisco'), { query: 'fargo street, sf', lastWord: false });

    t.deepEqual(
        token.enumerateTokenReplacements(complexTokensR, 'fargo street northeast, san francisco'),
        [
            'fargo street northeast, sf',
            'fargo street northeast, san francisco'
        ]
    );
    t.deepEqual(
        applySimpleAndComplex('fargo street northeast, san francisco'),
        [
            'fargo st ne sf',
            'fargo st ne san francisco'
        ]
    );
    t.deepEqual(applySimpleAndComplex('main st street st st milwaukee lane ln wtf ln'), [
        'main st st st st milwaukee ln ln wtf ln'
    ]);
    t.deepEqual(applySimpleAndComplex('main st street st st milwaukee lane ln wtf ln'), [
        'main st st st st milwaukee ln ln wtf ln'
    ]);

    // Demonstrate that replacements can cascade, but our current behavior is
    // quite non-deterministic because token order matters very much for the
    // variants that will actually get hit.
    let ubTokens;
    ubTokens = token.createComplexReplacer({
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        'uber': 'üb',
    });
    t.deepEqual(token.enumerateTokenReplacements(ubTokens, 'uber cat'),['üb cat', 'uber cat'], 'does not cascade replacements');
    ubTokens = token.createComplexReplacer({
        'uber': 'üb',
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
    });
    t.deepEqual(token.enumerateTokenReplacements(ubTokens, 'uber cat'),['ueb cat', 'üb cat', 'uber cat'], 'hits all permutations');

    t.end();
});

test('named/numbered group replacement', (t) => {
    const tokens = token.createComplexReplacer({
        'abc': 'xyz',
        '(1\\d+)': '@@@$1@@@'
    });
    t.deepEqual(token.replaceToken(tokens, 'abc 123 def'), { query: 'xyz @@@123@@@ def', lastWord: false });
    t.deepEqual(token.replaceToken(tokens, 'abc 123'), { query: 'xyz @@@123@@@', lastWord: false });
    t.deepEqual(token.enumerateTokenReplacements(tokens, 'abc 123 def'), ['xyz @@@123@@@ def', 'xyz 123 def', 'abc @@@123@@@ def', 'abc 123 def']);

    t.end();
});

test('[node 10] named replacement groups', (t) => {
    let tokens;
    try {
        tokens = token.createComplexReplacer({ '(abc)(?<namedgroup>[\\d]+)': '$<namedgroup>' });
        t.deepEqual(token.replaceToken(tokens, 'abc123'), { query: '123', lastWord: false });
    } catch (e) {
        t.ok(true, 'Named tokens are not supported by this version of Node. Skipping test');
    }
    t.end();
});

test('replace complex global tokens', (t) => {
    const replacer = token.createGlobalReplacer({
        '\\b(.+)(strasse|str|straße)\\b': '$1 str'
    });
    t.deepEqual(token.replaceToken(replacer, 'talstrasse'), { query: 'tal str', lastWord: false }, 'talstrasse => tal str');
    t.deepEqual(token.replaceToken(replacer, 'talstraße'), { query: 'tal str', lastWord: false }, 'talstraße => tal str');
    t.deepEqual(token.replaceToken(replacer, 'talstr'), { query: 'tal str', lastWord: false }, 'talstr => tal str');
    t.deepEqual(token.replaceToken(replacer, 'talstrasse 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstrasse 3-5 => tal str 3-5');
    t.deepEqual(token.replaceToken(replacer, 'talstraße 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstraße 3-5 => tal str 3-5');
    t.deepEqual(token.replaceToken(replacer, 'talstr 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstr 3-5 => tal str 3-5');
    t.end();
});
