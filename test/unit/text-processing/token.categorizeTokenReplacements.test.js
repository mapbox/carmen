'use strict';
const token = require('../../../lib/text-processing/token');
const test = require('tape');

test('categorizeTokenReplacements', (t) => {
    t.deepEqual(
        token.categorizeTokenReplacements({
            'Street': 'St',
            'lane': 'ln',
            'Piazza': 'P.zza',
            'three': '3',
            '([a-z]+)väg': '$1v',
            'Résidence': 'Res',
            'San': 'S.'
        }),
        {
            simple: [
                { from: 'street', to: 'st' },
                { from: 'lane', to: 'ln' },
                { from: 'three', to: '3' },
                { from: 'residence', to: 'res' },
                { from: 'san', to: 's.' } // TODO why is the period new?
            ],
            complex: [
                { from: 'Piazza', to: 'P.zza' },
                { from: '([a-z]+)väg', to: '$1v' }
            ]
        }
    );
    t.end();
});
