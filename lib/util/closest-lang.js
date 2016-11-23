/* model-un data proprocessing */
var munLanguages = require("model-un/data/languages");
var munLanguageRef = require("model-un/data/languageref")
var languageOnlyRef = {};
var nonLanguageRef = {};
Object.keys(munLanguageRef).forEach(function(k) {
    if (munLanguages[munLanguageRef[k]].type == "language") {
        languageOnlyRef[k] = munLanguageRef[k];
    } else if (munLanguages[munLanguageRef[k]].type != "redundant") {
        // leave out the redundant ones; they introduce weird behavior
        nonLanguageRef[k] = munLanguageRef[k];
    }
});
[languageOnlyRef, nonLanguageRef].forEach(function(ref) {
    Object.keys(ref).forEach(function(k) {
        if (k.search(/[A-Z]/) != -1) {
            var lk = k.toLowerCase();
            if (typeof ref[lk] === "undefined") {
                ref[lk] = ref[k];
            }
        }
    });
});

var fallback = require('./fallback.json');
// handle case-insensitive language fallback lookups
Object.keys(fallback).forEach(function(lang) {
    if (!fallback[lang.toLowerCase()])
        fallback[lang.toLowerCase()] = fallback[lang];
});

/* this is an alternate implementation of model-un.getLanguage that differs as follows:
    * the first token is always assumed to be a language
    * subsequent tokens are assumed to be non-languages
    * in both cases, matching is quasi-case-insensitive: where an exact case match is not
      found, an all-lowercase match is attempted
*/

var getLanguage = function(str) {
    str = str || "";

    var match;
    match = languageOnlyRef[str] || languageOnlyRef[str.toLowerCase()];
    if (match) return munLanguages[match];

    str = str.replace(/_/g, '-').split('-');
    if (str.length > 1) {
        match = [];
        str.forEach(function(d, i) {
            var obj = munLanguages[i == 0 ? languageOnlyRef[d] : nonLanguageRef[d]];
            if (!obj && d.search(/[A-Z]/) != -1) {
                var ld = d.toLowerCase();
                obj = munLanguages[i == 0 ? languageOnlyRef[ld] : nonLanguageRef[ld]];
            }
            if (obj) match.push(obj);
        });
        return match;
    }
    return false;
}

/* alternative implementation of model-un.hasLanguage that's more permissive:
   if getLanguage returns a language, return true */

var hasLanguage = function(str) {
    var language = getLanguage(str);
    return (language && (Array.isArray(language) ? language[0].type == "language" : language.type == "language"));
}

/* from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex */
var escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var getScriptComponent = function(mLang) {
    // check if there's a script subtag
    var scripts = mLang.filter(function(item) { return item.type == "script"; });
    if (scripts.length) return scripts[0].subtag;

    // check if there's a language subtag with a suppress-script property
    for (var i = 0; i < mLang.length; i++) {
        if (mLang[i].type == "language" && mLang[i]["suppress-script"]) {
            return mLang[i]["suppress-script"];
        }
    }
}

var getLanguageComponent = function(mLang) {
    var languages = mLang.filter(function(item) { return item.type == "language" });
    if (languages.length) return languages[0].subtag;
}

var getLanguageArray = function(lang) {
    var munLang = getLanguage(lang);
    return {"code": lang, "subtags": Array.isArray(munLang) ? munLang : [munLang]};
}

// these are languages that are particularly common or familiar for a given script
// so they get tiebreaker bonuses; inspired by language speaker counts in
// https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
var languageBonuses = {
    'ru': 2, // Russian is the most common for Cyrillic
    'en': 2, // English is the most common for Latin
    'ar': 2, // Arabic is the most common language for Arabic script
    'hi': 2 // Hindi is the most common language for Devanagari script
}
var scriptBonuses = {
    'Hans': 2, // for Chinese text, prefer simplified to either Latin or traditional
    'Latn': 1  // in general, prefer Latin to other scripts where multiple options
               // are resent and no script is specified (most likely to come up with Serbian)
}
var closestLangLabel = function(target, candidates, prefix) {
    prefix = prefix || "";
    target = target.replace("-", "_");

    // first check if there's an exact match
    if (candidates[prefix + target]) return target;

    var regexCandidates;
    if (prefix) {
        var regexPrefix = new RegExp("^" + escapeRegExp(prefix));
        regexCandidates = Object.keys(candidates)
            .filter(function(item) { return regexPrefix.exec(item); })
            .map(function(item) { return item.replace(regexPrefix, ""); });
    } else {
        regexCandidates = Object.keys(candidates);
    }
    // then check if there's a case-insensitive, but otherwise exact match
    for (var i = 0; i < regexCandidates.length; i++) {
        if (regexCandidates[i].toLowerCase() == target.toLowerCase()) return regexCandidates[i];
    }

    // then check if there's a fallback
    var fb = fallback[target.toLowerCase()] || fallback[target.split('_')[0].toLowerCase()] || [];
    for (var fb_i = 0; fb_i < fb.length; fb_i++)
        if (candidates[prefix + fb[fb_i]])
            return fb[fb_i];

    // now try heuristics to get something close
    var munTarget = getLanguageArray(target);
    var munCandidates = regexCandidates.map(function(item) { return getLanguageArray(item); });

    if (!munCandidates.length) return;

    var targetLanguage = getLanguageComponent(munTarget.subtags);
    if (!targetLanguage) return;

    var targetScript = getScriptComponent(munTarget.subtags);

    munCandidates.forEach(function(candidate) {
        candidate.score = 0;

        var candidateLanguage = getLanguageComponent(candidate.subtags);
        var candidateScript = getScriptComponent(candidate.subtags);

        // language match is worth the most
        if (candidateLanguage && candidateLanguage == targetLanguage) {
            candidate.score += 100;
        }

        // script matches are worth something
        if (candidateScript && candidateScript == targetScript) {
            if (candidateScript == "Latn") {
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
    })

    // sort the candidates backwards by score
    munCandidates.sort(function(a, b) { return b.score - a.score; });
    var winner = munCandidates[0];

    // require at least a score of 50 (so, at a minimum either a language match or non-Latin script match) to win
    if (winner.score < 50) return;
    return winner.code;
}

var closestLang = function(target, candidates, prefix) {
    var label = closestLangLabel(target, candidates, prefix);
    return label ? candidates[(prefix || "") + label] : label;
}

module.exports = closestLang;
module.exports.getLanguage = getLanguage;
module.exports.hasLanguage = hasLanguage;
module.exports.closestLangLabel = closestLangLabel;