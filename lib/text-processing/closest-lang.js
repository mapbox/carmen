'use strict';
/* model-un data proprocessing */
const munLanguages = require('model-un/data/languages');
const munLanguageRef = require('model-un/data/languageref');
const languageOnlyRef = {};
const nonLanguageRef = {};
Object.keys(munLanguageRef).forEach((k) => {
    if (munLanguages[munLanguageRef[k]].type === 'language') {
        languageOnlyRef[k] = munLanguageRef[k];
    } else if (munLanguages[munLanguageRef[k]].type !== 'redundant') {
        // leave out the redundant ones; they introduce weird behavior
        nonLanguageRef[k] = munLanguageRef[k];
    }
});
[languageOnlyRef, nonLanguageRef].forEach((ref) => {
    Object.keys(ref).forEach((k) => {
        if (k.search(/[A-Z]/) !== -1) {
            const lk = k.toLowerCase();
            if (typeof ref[lk] === 'undefined') {
                ref[lk] = ref[k];
            }
        }
    });
});

const fallbackDisplay = require('./fallback-display.json');
const fallbackIndexer = require('./fallback-indexer.json');

// handle case-insensitive language fallback lookups
Object.keys(fallbackDisplay).forEach((lang) => {
    fallbackDisplay[lang.toLowerCase()] = fallbackDisplay[lang];
});
Object.keys(fallbackIndexer).forEach((lang) => {
    fallbackIndexer[lang.toLowerCase()] = fallbackIndexer[lang];
});

/* this is an alternate implementation of model-un.getLanguage that differs as follows:
    * the first token is always assumed to be a language
    * subsequent tokens are assumed to be non-languages
    * in both cases, matching is quasi-case-insensitive: where an exact case match is not
      found, an all-lowercase match is attempted
*/

const getLanguage = function(str) {
    str = str || '';

    let match;
    match = languageOnlyRef[str] || languageOnlyRef[str.toLowerCase()];
    if (match) return munLanguages[match];

    str = str.replace(/_/g, '-').split('-');
    if (str.length > 1) {
        match = [];
        str.forEach((d, i) => {
            let obj = munLanguages[i === 0 ? languageOnlyRef[d] : nonLanguageRef[d]];
            if (!obj && d.search(/[A-Z]/) !== -1) {
                const ld = d.toLowerCase();
                obj = munLanguages[i === 0 ? languageOnlyRef[ld] : nonLanguageRef[ld]];
            }
            if (obj) match.push(obj);
        });
        if (match.length > 0) {
            return match;
        } else {
            // there was a string with a hyphen in it but it still didn't match anything
            return false;
        }
    }
    return false;
};

/* alternative implementation of model-un.hasLanguage that's more permissive:
   if the 'language' is actually our universal text, return true
   if getLanguage returns a language, return true
*/

const hasLanguage = function(str) {
    if (str === 'universal') return true;
    const language = getLanguage(str);
    return (language && (Array.isArray(language) ? language[0].type === 'language' : language.type === 'language'));
};

/* from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex */
const escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

const getScriptComponent = function(mLang) {
    // check if there's a script subtag
    const scripts = mLang.filter((item) => { return item.type === 'script'; });
    if (scripts.length) return scripts[0].subtag;

    // check if there's a language subtag with a suppress-script property
    for (let i = 0; i < mLang.length; i++) {
        if (mLang[i].type === 'language' && mLang[i]['suppress-script']) {
            return mLang[i]['suppress-script'];
        }
    }
};

const getLanguageComponent = function(mLang) {
    const languages = mLang.filter((item) => { return item.type === 'language'; });
    if (languages.length) return languages[0].subtag;
};

const getLanguageArray = function(lang) {
    const munLang = getLanguage(lang);
    return { 'code': lang, 'subtags': Array.isArray(munLang) ? munLang : [munLang] };
};

// these are languages that are particularly common or familiar for a given script
// so they get tiebreaker bonuses; inspired by language speaker counts in
// https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
const languageBonuses = {
    'ru': 2, // Russian is the most common for Cyrillic
    'en': 2, // English is the most common for Latin
    'ar': 2, // Arabic is the most common language for Arabic script
    'hi': 2 // Hindi is the most common language for Devanagari script
};
const scriptBonuses = {
    'Hans': 1, // for Chinese text, prefer simplified
    'Latn': 1  // in general, prefer Latin to other scripts where multiple options
    // are resent and no script is specified (most likely to come up with Serbian)
};

// sub-types of these languages use different scripts and should not be combined in strict languageMode
const digraphic = [
    'sr'
];

const getScoredCandidates = function(target, candidateList) {
    const munTarget = getLanguageArray(target);
    const munCandidates = candidateList.map((item) => { return getLanguageArray(item); });

    if (!munCandidates.length) return;

    const targetLanguage = getLanguageComponent(munTarget.subtags);
    if (!targetLanguage) return;

    const targetScript = getScriptComponent(munTarget.subtags);

    munCandidates.forEach((candidate) => {
        candidate.score = 0;

        const candidateLanguage = getLanguageComponent(candidate.subtags);
        const candidateScript = getScriptComponent(candidate.subtags);

        // language match is worth the most
        if (candidateLanguage && candidateLanguage === targetLanguage) {
            candidate.score += 100;
        }

        // script matches are worth something
        if (candidateScript && candidateScript === targetScript) {
            if (candidateScript === 'Latn') {
                // matches on Latin are worth something, but are very common and
                // not that interesting, so they're worth less than other script matches
                candidate.score += 25;
            } else {
                candidate.score += 50;
            }
        }

        // script and language bonuses
        if (candidateLanguage && languageBonuses[candidateLanguage]) candidate.score += languageBonuses[candidateLanguage];
        if (candidateScript && scriptBonuses[candidateScript]) candidate.score += scriptBonuses[candidateScript];

        // final tiebreaker: all else being equal, prefer shorter codes to longer ones
        if (candidate.subtags.length > 1) {
            candidate.score -= 0.5 * (candidate.subtags.length - 1);
        }
    });

    // sort the candidates backwards by score
    munCandidates.sort((a, b) => { return b.score - a.score; });

    return munCandidates;
};

const closestLangLabel = function(target, candidates, prefix, languageMode) {
    prefix = prefix || '';
    target = target.replace('-', '_');
    languageMode = languageMode || '';
    const primary = target.split('_')[0].toLowerCase(); // e.g., the `en` part of `en_US`

    // first check if there's an exact match
    if (candidates[prefix + target]) return target;

    let regexCandidates, fb, fb_i, i;

    if (prefix) {
        const regexPrefix = new RegExp('^' + escapeRegExp(prefix));
        regexCandidates = Object.keys(candidates)
            .filter((item) => { return !!candidates[item]; })
            .filter((item) => { return regexPrefix.exec(item); })
            .map((item) => { return item.replace(regexPrefix, ''); });
    } else {
        regexCandidates = Object.keys(candidates)
            .filter((item) => { return !!candidates[item]; });
    }

    // then check if there's a case-insensitive, but otherwise exact match
    for (i = 0; i < regexCandidates.length; i++) {
        if (regexCandidates[i].toLowerCase() === target.toLowerCase()) return regexCandidates[i];
    }

    // then check if there's a fallback
    fb = fallbackDisplay[target.toLowerCase()];
    if (fb) for (fb_i = 0; fb_i < fb.length; fb_i++)
        if (candidates[prefix + fb[fb_i]])
            return fb[fb_i];

    // then check if there's a language-only match
    for (i = 0; i < regexCandidates.length; i++) {
        if (regexCandidates[i].toLowerCase() === primary) {
            if (languageMode === 'strict' && digraphic.indexOf(primary) > -1) {
                continue;
            } else {
                return regexCandidates[i];
            }
        }
    }

    // then check if there's a language-only fallback
    if (languageMode !== 'strict' && digraphic.indexOf(primary) === -1) fb = fallbackDisplay[primary];
    if (fb) for (fb_i = 0; fb_i < fb.length; fb_i++)
        if (candidates[prefix + fb[fb_i]])
            return fb[fb_i];

    // final fallback to universal text if present
    if (candidates[prefix + 'universal']) return 'universal';

    // now try heuristics to get something close
    const scoredCandidates = getScoredCandidates(target, regexCandidates);
    if (!scoredCandidates) return;

    const winner = scoredCandidates[0];

    // require at least a score of 50 (so, at a minimum either a language match or non-Latin script match) to win
    if (winner.score < 50 || (languageMode === 'strict' && digraphic.indexOf(winner.code) > -1)) return;
    return winner.code;
};

const closestLang = function(target, candidates, prefix, languageMode) {
    const label = closestLangLabel(target, candidates, prefix, languageMode);
    return label ? candidates[(prefix || '') + label] : label;
};

const fallbackRanking = function(target, candidateList) {
    target = target.replace('-', '_');
    const primary = target.split('_')[0].toLowerCase(); // e.g., the `en` part of `en_US`
    const candidateSet = new Set(candidateList);

    const output = new Set();

    // check if there's a fallback
    let fb = fallbackIndexer[target.toLowerCase()], fb_i;
    if (fb) for (fb_i = 0; fb_i < fb.length; fb_i++) {
        if (candidateSet.has(fb[fb_i])) output.add(fb[fb_i]);
    }

    // then check if there's a language-only match
    for (let i = 0; i < candidateList.length; i++) {
        if (candidateList[i].toLowerCase() === primary && candidateList[i].toLowerCase() !== target) {
            output.add(candidateList[i]);
        }
    }

    // then check if there's a language-only fallback
    fb = fallbackIndexer[primary];
    if (fb) for (fb_i = 0; fb_i < fb.length; fb_i++) {
        if (candidateSet.has(fb[fb_i])) output.add(fb[fb_i]);
    }

    // now try heuristics to get something close
    const scoredCandidates = getScoredCandidates(target, candidateList);
    if (scoredCandidates) {
        scoredCandidates.forEach((cand) => {
            if (cand.score >= 50) {
                output.add(cand.code);
            }
        });
    }

    // languages shouldn't fall back to themselves
    if (output.has(target)) output.delete(target);

    return Array.from(output);
};

const fallbackMatrix = function(candidateList) {
    const output = new Map();
    for (const candidate of candidateList) {
        output.set(candidate, fallbackRanking(candidate, candidateList));
    }
    return output;
};

/**
 * Takes a language string and return the language component:
 * e.g. zh-Hans => zh
 *
 * @param {string} str A language string
 * @return {string}
 */
function getLanguageCode(str) {
    if (str === 'universal') return 'universal';
    if (!hasLanguage(str)) return false;
    return getLanguageComponent(getLanguageArray(str).subtags);
}

/**
 * Takes a language string and feature properties object and returns a text
 * object with `text` and optional `language` properties.
 *
 * @param {string} language A language string
 * @param {object} properties A feature properties object
 * @return {object}
 */
function getText(language, properties) {
    if (!properties['carmen:text']) throw new Error('Feature has no carmen:text');
    if (!language) return { text: properties['carmen:text'].split(',')[0].trim() };
    const languageLabel = closestLang.closestLangLabel(language, properties, 'carmen:text_');
    const languageText = languageLabel ? properties['carmen:text_' + languageLabel] : false;
    const text = {
        text: (languageText || properties['carmen:text'] || '').split(',')[0].trim()
    };
    if (languageText && languageLabel !== 'universal') {
        text.language = languageLabel.replace('_', '-');
    }
    return text;
}

module.exports = closestLang;
module.exports.getLanguage = getLanguage;
module.exports.getLanguageCode = getLanguageCode;
module.exports.hasLanguage = hasLanguage;
module.exports.closestLangLabel = closestLangLabel;
module.exports.getText = getText;
module.exports.fallbackRanking = fallbackRanking;
module.exports.fallbackMatrix = fallbackMatrix;

