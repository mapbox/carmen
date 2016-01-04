# Changelog

## 11.2.2

- Fix wasteful duplicate I/O when loading grid cache shards.

## 11.2.1

- Stop addFeature() in unit tests from overwiting VT. Instead decode and append to it.

## 11.2.0

- Add support for feature/index level `geocoder_stack` parameter. This parameter allows for stack based filtering (as opposed to type filtering)
- Also uses stack for building stackable phrase list instead of bounds

## 11.1.0

- Drop `mmap` dependency.
- Reintroduce `XRegExp` dependency for limited circumstances where named capture groups are necessary.

## 11.0.0

- Carmen's dict cache now uses [directed acyclic word graphs](https://en.wikipedia.org/wiki/Deterministic_acyclic_finite_state_automaton) instead of the bit array cache introduced in carmen 9.0.0. As before, they are generated at index time and stored and can be dumped and loaded in a single contiguous-memory chunk, so fast start times should be preserved as compared to bit cache, but with more memory compactness and lower collision rates.

## 10.0.0

- CJK characters in an indexable word or phrase are now indexed individually to support the practice of addresses being written from largest -> smallest geographical entity and without delimeters.

## 9.0.1

- Bugfixes to multiconf approach.

## 9.0.0

- Refactored dict cache using bit arrays and `mmap` for lower runtime memory profile.
- Refactored index loading to cleanly handle multiple configurations from the same source instances.
- Supported `geocoder_version` is now 5.

## 8.7.1

- Catch more unhandled error cases for debugging.

## 8.7.0

- Expose custom feature properties in `context` entries.

## 8.5.4

- Clean up context handling of various feature encoding methods from VTs.

## 8.5.3

- Catch unhandled error case for debugging purposes.

## 8.5.2

- Update to locking@2.0.2.

## 8.5.1

- Perform type filtering for reverse geocodes at the context.js level instead of after the context stack has been generated.

## 8.5.0

- Add `geocoder_type` flag which allows non-similiar indexes to compete for the lowest result in a reverse geocode.

## 8.3.2
- Set better text templating failovers for localization support.

## 8.3.1
- Fail index builds with bad language codes.

## 8.3.0
- Add a `language` option that will return the values of `carmen:text_{ISO language code}` in the format of `geocoder_format_{ISO language code}` if available in the index.

## 8.2.0
- Synonymize `carmen:text_{ISO language code}` field in indicies with `carmen:text` field to support queries in multiple languages.

## 8.0.1

- Change `geocoder_address` field to `geocoder_format` to retain ability to differentiate between address and non-address indexes.
- `geocoder_address` is not a binary `0` or `1` value.

## 8.0.0

- Update geocoder to accept templates for place name formatting

## 7.0.0

- Update indexer & feature objects to use fully compliant GeoJSON

## 6.2.0

- Update carmen-cache to 0.9.0, introduce `geocoder_cachesize` option.

## 6.1.0

- Update mapnik to version 3.4.3

## 6.0.1

- Use a singleton VT cache to limit memory usage across indexes.

## 6.0.0

- Switch to murmur hash and 52-bit phrase IDs.

## 5.2.2

- Triage unknown conditions that can cause an unexpected error.

## 5.2.1

- Improve `scoredist` calculation by using geometric mean of features for scaling scoredist, not max score.

## 5.2.0

- Add `types` query option to filter results by feature type.

## 5.1.2

- Fix feature id query mode.

## 5.1.1

- Smart dedupe of ghost features out of result sets when they match text of other non-ghost features.

## 5.1.0

- NumTokens V3 for more efficient feature verification. See https://github.com/mapbox/carmen/pull/310.
- Sieve indexing mode for broader indexing of feature text.
- Bumps geocoder_version to 3 (version 2 continues to be supported at runtime).

## 5.0.5

- Fix for feature verification bug where a non-optimal relevance could sometimes be assigned.

## 5.0.4

- Fix for proximity bug where extreme values would push into negative xy integers.

## 5.0.3

- Fix for decollide bug.

## 5.0.2

- Improved performance for feature verification in verifymatch.

## 5.0.1

- More efficient spatialmatch by introducing a bounds mask per index and loading grids at spatialmatch time.

## 5.0.0

- Update index format for delta encoding in carmen-cache@0.7.x. This is a breaking change that requires reindexing. See https://github.com/mapbox/carmen/pull/301 and https://github.com/mapbox/carmen-cache/pull/37 for details.

## 4.0.6

- More sophisticated tokenization behavior around punctuation -- apostraphe and period characters collapse while most others split terms.

## 4.0.5

- Doubletap - more conservative vt caching settings

## 4.0.4

- Updates to carmen-cache @ 0.6.0 for more conservative memory use
- Reduces vtile LRU cache size for high zoom sources

## 4.0.3

- Robustification fix for how token replacement handles unidecode at indexing + query time.

## 4.0.2

- Fixes to proximity mode to account for both score and distance.

## 4.0.1

- Bug fix for lone housenum subquery permutations and upgrade to carmen-cache@0.5.1.

## 4.0.0

- Large refactor of carmen index structure and indexing/runtime processes. See https://github.com/mapbox/carmen/pull/287

## 3.1.6

- Rollback XRegExp use.

## 3.1.5

- Move `addfeature.js` from test directory to lib for external testing use.

## 3.1.4

- Fix for max call stack errors when using grid indexes with high cardinality.

## 3.1.3

- Extend geocoder_tokens to use XRegExp.

## 3.1.2

- Pin to node-mapnik 3.2.x until mapnik 3.3.x is ready.

## 3.1.1

- Allow geocoder_tokens to be expressed as explicit regex patterns.

## 3.1.0

- Include ghost features if queried for explicitly.

## 3.0.9

- Proximity fixes.

## 3.0.8

- Proximity fixes.

## 3.0.7

- Prioritizes layer type + score consistently across proximity/non-proximity mode.

## 3.0.6

- Additional sort stabilization at verifymatch stage.

## 3.0.5

- Improvements to result stability in proximity mode.

## 3.0.4

- Use single closest degen for non-terminal terms.
- Update to carmen-cache@0.4.1 with support for swapped order setRelevance.

## 3.0.3

- Snap dataterm min/max values to nearest thousand. Reduces cardinality of phrase index with minimal affect on dataterm accuracy at querytime.

## 3.0.2

- Use cache#loadall when indexing.

## 3.0.1

- Added cache#loadall for loading shards without retrieving results.

## 3.0.0

- Improved suggestion/autocomplete support for partial queries.
- **Breaking change:** Introduces `dataterm` term ID type. Any carmen indexes generated previously that contained numeric text (e.g. US zipcodes or addresses with housenumbers) need to be reindexed using carmen@3.x.
