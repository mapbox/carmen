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
    // 'S.': 'S'
};

// store an original copy of the tokenList object that we can compare against to
// ensure we don't mutate the tokenList object directly
const tokenClone = JSON.parse(JSON.stringify(tokenList));
const categorized = token.categorizeTokenReplacements(tokenList);

// We use the same tokens object to create both indexer and runtime token replacers.
// Test that indexer-only token replacers don't leak into runtime replacers.
test('create*Replacer', (q) => {
    q.deepEqual(tokenList, tokenClone, 'create*Replacer does not mutate tokenList object');
    q.end();
});

test('replaceTokens - complex', (t) => {
    const complexTokens = token.createComplexReplacer(categorized.complex);
    t.deepEqual(token.replaceToken(complexTokens, termops.tokenize('fargo street, san francisco')), {
        tokens: ['fargo', 'street', 'sf', ''],
        separators: [' ', ', ', ' ', ''],
        owner: [0 , 1, 2, 2],
        lastWord: true
    });
    t.end();

    const replacer = token.createComplexReplacer([
        {
            from: '(.+)(strasse|str|straße)',
            to: { text: '$1 str', skipDiacriticStripping: true, spanBoundaries: 0 },
        },
        {
            from: 'Suite [0-9]+',
            to: { text: '', spanBoundaries: 1 }
        },
        {
            from: 'Lot [0-9]+',
            to: ''
        }
    ]);
    const replaceToken = function(query) {
        return token.replaceToken(replacer, termops.tokenize(query));
    };

    t.deepEqual(replaceToken('talstrasse'), { tokens: ['tal str'], separators: [''], owner: [0], lastWord: true }, 'talstrasse => tal str');
    t.deepEqual(replaceToken('talstraße'), { tokens: ['tal str'], separators: [''], owner: [0], lastWord: true }, 'talstraße => tal str');
    t.deepEqual(replaceToken('talstr'), { tokens: ['tal str'], separators: [''], owner: [0], lastWord: true  }, 'talstr => tal str');
    t.deepEqual(replaceToken('talstrasse 3-5'), { tokens: ['tal str', '3-5'], separators: [' ', ''], owner: [0, 1] }, 'talstrasse 3-5 => tal str 3-5');
    t.deepEqual(replaceToken('talstraße 3-5'), {  tokens: ['tal str', '3-5'], separators: [' ', ''], owner: [0, 1] }, 'talstraße 3-5 => tal str 3-5');
    t.deepEqual(replaceToken('talstr 3-5'), { tokens: ['tal str', '3-5'], separators: [' ', ''], owner: [0, 1] }, 'talstr 3-5 => tal str 3-5');

    t.deepEqual(replaceToken('fake st lot 34 Suite 43'), {
        tokens: ['fake', 'st', '', '', '', ''],
        separators: [' ',' ', ' ',' ', ' ', ''],
        owner: [0, 1, 2, 2, 4, 4],
        lastWord: true
    }, 'Strips tokens');
});

test('replaceTokens - complex, numeric replacement groups', (t) => {
    const replacer = token.createComplexReplacer({
        'abc': 'xyz',
        '(1\\d+)': '@@@$1@@@'
    });
    const replaceToken = function(query) {
        return token.replaceToken(replacer, termops.tokenize(query));
    };
    t.deepEqual(replaceToken('abc 123 def'), { tokens: ['xyz', '@@@123@@@', 'def'], separators: [' ', ' ', ''], owner: [0,1,2] });
    t.deepEqual(replaceToken('abc 123'), { tokens: ['xyz', '@@@123@@@'], separators: [' ', ''], owner: [0,1], lastWord: true });
    t.end();
});

test('replaceTokens - complext, named replacement groups [node 10 only] ', (t) => {
    let tokens;
    try {
        tokens = token.createComplexReplacer({ '(abc)(?<namedgroup>[\\d]+)': '$<namedgroup>' });
        t.deepEqual(token.replaceToken(tokens, 'abc123'), { query: '123', lastWord: false });
    } catch (e) {
        t.ok(true, 'Named tokens are not supported by this version of Node. Skipping test');
    }
    t.end();
});

test('enumerateTokenReplacement', (t) => {

    let replacer = token.createComplexReplacer({
        'San Francisco': 'sf',
        'Northeast': 'ne' // not actually complex so we'd never see this in the wild.
    });
    t.deepEqual(
        token.enumerateTokenReplacements(replacer, termops.tokenize('fargo street northeast, san francisco')),
        [
            'fargo street ne sf',
            'fargo street ne san francisco',
            'fargo street northeast sf',
            'fargo street northeast san francisco'
        ],
        'fargo street northeast, san francisco - correct permutations'
    );
    t.deepEqual(
        token.enumerateTokenReplacements(replacer, termops.tokenize('fargo street ne, sf')),
        [
            'fargo street ne sf'
        ],
        'fargo street ne sf - correct permutations'
    );

    replacer = token.createComplexReplacer({
        'San Francisco': 'sf',
        'Northeast': 'ne' // not actually complex so we'd never see this in the wild.
    }, { includeUnambiguous: true });
    t.deepEqual(
        token.enumerateTokenReplacements(replacer, termops.tokenize('fargo street northeast, san francisco')),
        [
            'fargo street ne sf',
            'fargo street ne san francisco',
            'fargo street northeast sf',
            'fargo street northeast san francisco'
        ],
        'fargo street northeast, san francisco - inverse, correct permutations'
    );
    t.deepEqual(
        token.enumerateTokenReplacements(replacer, termops.tokenize('fargo street ne, sf')),
        [
            'fargo street ne sf',
            'fargo street ne San Francisco',
            'fargo street Northeast sf',
            'fargo street Northeast San Francisco'
        ],
        'fargo street ne sf - inverse, correct permutations'
    );

    replacer = token.createComplexReplacer({
        'abc': 'xyz',
        '(1\\d+)': '@@@$1@@@'
    });
    t.deepEqual(
        token.enumerateTokenReplacements(replacer, termops.tokenize('abc 123 def')),
        [
            'xyz @@@123@@@ def',
            'xyz 123 def',
            'abc @@@123@@@ def',
            'abc 123 def'
        ],
        'numeric capture groups - correct permutations'
    );
    t.end();
});

test('enumerateTokenReplacement cascades', (t) => {
    // Demonstrate that replacements can cascade, but our current behavior is
    // quite non-deterministic because token order matters very much for the
    // variants that will actually get hit.
    let ubTokens;
    ubTokens = token.createComplexReplacer({
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        '(.+)(straße)': '$1 str'
    });
    t.deepEqual(
        token.enumerateTokenReplacements(ubTokens, termops.tokenize('Jüdenstraße 17')),
        [
            'jüden str 17',
            'jueden str 17',
            'juedenstraße 17',
            'jüdenstraße 17'
        ],
        'Jüdenstraße 17 - correct permutations'
    );

    ubTokens = token.createComplexReplacer({
        '(.+)(straße)': '$1 str',
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    });
    t.deepEqual(
        token.enumerateTokenReplacements(ubTokens, termops.tokenize('Jüdenstraße 17')),
        [
            'juedenstraße 17',
            'jueden str 17',
            'jüden str 17',
            'jüdenstraße 17'
        ],
        'Jüdenstraße 17 - correct permutations, reversed replacement order'
    );

    ubTokens = token.createComplexReplacer({
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        '(.+)(straße)': '$1 str'
    });
    t.deepEqual(
        token.enumerateTokenReplacements(ubTokens, termops.tokenize('Kölnerstraße 27 40211 Düsseldorf')),
        [
            'kölner str 27 40211 duesseldorf',
            'kölner str 27 40211 düsseldorf',
            'koelner str 27 40211 duesseldorf',
            'koelner str 27 40211 düsseldorf',
            'koelnerstraße 27 40211 duesseldorf',
            'koelnerstraße 27 40211 düsseldorf',
            'kölnerstraße 27 40211 duesseldorf',
            'kölnerstraße 27 40211 düsseldorf'
        ],
        'Kölnerstraße 27 40211 Düsseldorf - correct permutations'
    );
    t.end();
});

test('enumerateTokenReplacement - inverse behavior', (t) => {
    let replacers = token.createComplexReplacer({
        'street term': 'st',
        'saint': 'st'
    }, { includeUnambiguous: true });
    t.deepEqual(
        token.enumerateTokenReplacements(replacers, termops.tokenize('saint street term')),
        [
            'st st',
            'st street term',
            'saint st',
            'saint street term'
        ],
        'correct permutations for replacement with identical output'
    );
    t.deepEqual(
        token.enumerateTokenReplacements(replacers, termops.tokenize('st street term')),
        [
            'st st',
            'st street term'
        ],
        'correct permutations for replacement with identical output'
    );

    replacers = token.createComplexReplacer({
        'street term': 'st',
    }, { includeUnambiguous: true });
    t.deepEqual(
        token.enumerateTokenReplacements(replacers, termops.tokenize('saint street term')),
        [
            'saint st',
            'saint street term'
        ],
        'replaced terms are not re-expanded by inverse replacers'
    );
    t.deepEqual(
        token.enumerateTokenReplacements(replacers, termops.tokenize('st street term')),
        [
            'st st',
            'st street term',
            'street term st',
            'street term street term'
        ],
        'inverse replacement are used on input, but do not re-expanded previous replacement'
    );
    t.end();
});

test('enumerateTokenReplacement limits', (t) => {
    const replacements = token.createComplexReplacer({
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        '(.+)(straße)': '$1 str'
    });
    let query, enumerated;

    query = new Array(1).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 4, '1 double replaced input');

    query = new Array(2).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 16, '2 double replaced inputs');

    query = new Array(3).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 64, '3 double replaced inputs');

    query = new Array(4).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 64, '4 double replaced inputs');

    query = new Array(8).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 64, '8 double replaced inputs');

    query = new Array(20).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 64, '20 double replaced inputs');

    query = new Array(40).fill('Kölnerstraße').join(' ');
    enumerated = token.enumerateTokenReplacements(replacements, termops.tokenize(query));
    t.deepEqual(enumerated.length, 64, '40 double replaced inputs');

    t.end();
});

test('replaceTokens - global', (t) => {
    const replacer = token.createGlobalReplacer({
        '(?:\\b|^)(.+)(strasse|str|straße)(?:\\b|$)': '$1 str'
    });
    t.deepEqual(token.replaceGlobalTokens(replacer, 'talstrasse'), 'tal str', 'talstrasse => tal str');
    t.deepEqual(token.replaceGlobalTokens(replacer, 'talstraße'), 'tal str', 'talstraße => tal str');
    t.deepEqual(token.replaceGlobalTokens(replacer, 'talstr'), 'tal str', 'talstr => tal str');
    t.deepEqual(token.replaceGlobalTokens(replacer, 'talstrasse 3-5'), 'tal str 3-5', 'talstrasse 3-5 => tal str 3-5');
    t.deepEqual(token.replaceGlobalTokens(replacer, 'talstraße 3-5'), 'tal str 3-5', 'talstraße 3-5 => tal str 3-5');
    t.deepEqual(token.replaceGlobalTokens(replacer, 'talstr 3-5'), 'tal str 3-5', 'talstr 3-5 => tal str 3-5');
    t.end();

});
