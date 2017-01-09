# Changelog

## 17.8.2

- Filter results disallowed by the `types` filter before sorting and limiting potential matches
- In spatialmatch, sort stacks by index from lowest to highest when zoom level is the same
- Add alternate unicode apostrophes for punctuation normalization

## 17.8.1

- Use fallback language when the specified language key exists, but has a null value.

## 17.8.0

- Update to `carmen-cache@0.15.0`.

## 17.7.3

- Automatically lowercase all `stacks` values for a given query

## 17.7.2

- Move eslint to dev dependencies.
- Update to `carmen-cache@0.14.1`.

## 17.7.1

- Trim whitespace from text values when outputting feature values.

## 17.7.0

- Update to `carmen-cache@0.14.0`.

## 17.6.5

- Robustify language fallback behavior for unmatched language suffixes.

## 17.6.4

- Modified language fallback behavior to reflect feedback collected from human translators.

## 17.6.3

- Fix multitype corner case where a feature promoted across levels would not always be properly promoted.

## 17.6.2

- Update several dependencies to `@mapbox` namespaced versions.
- Performance optimizations for `phrasematch()` when dealing with tokens that resolve to empty strings/whitespace when unidecoded.

## 17.6.1

- Fixes bug where unencodable text like emojis wasn't being ignored.

## 17.6.0

- Adds index-level option `geocoder_inherit_score` for promoting features that nest within other similar named parent features (e.g. promote New York (city) promoted above New York (state)).

## 17.5.2

- Add stopgap measure to indexer to partially handle features with > 10k zxy covers. (https://github.com/mapbox/carmen/pull/545)

## 17.5.1

- More consistent behavior for nested feature promotion when used with the `language` option.
- Code and style improvements.

## 17.5.0

- Modifies verifyContext to better handle identically-named nested features e.g. "New York, New York". Preferentially returns the smaller feature in such cases.

## 17.4.0

- Introduce mechanisms for approximate guessing of requested language, both using heuristics and hard-coded fallbacks.

## 17.3.0

- Include private `carmen:` properties in feature output when in debug mode.
- Switch `carmen:dbidx` to `carmen:index` to track feature to index relationship more easily.

## 17.2.3

- Performance improvements to `spatialmatch.stackable()`

## 17.2.2

- Fix bug where type filters would not always work correctly with forward geocodes and multitype indexes.

## 17.2.1

- Fix bug around feature loading in verifymatch.

## 17.2.0

- Adds support for individual multitype features in indexes determined by the `carmen:types` attribute. See README for more details.

## 17.1.5

- Fix typo in `lib/verifymatch.js`

## 17.1.4

- Performance optimizations for `spatialmatch.stackable()`.

## 17.1.3

- Fix for several calls that could lead to max call stack exceeded errors.

## 17.1.2

- During indexing, ensure all work in `process.stdout` finishes before exiting the process

## 17.1.1

- Fixes formatting of error message when an invalid `types` value is specified.

## 17.1.0

- Allows for filtering by subtypes (e.g. `poi.landmark`) which are defined by score range.

## 17.0.0

- Allow more flexible regexes in global tokens and refactor how they are applied.

## 16.2.4

- types + limit reverse query mode is now only a concept handled by reverseGeocode().
- context() always returns a single context.
- Adds context.nearest() for playing the role that the proximity context mode played before -- returns a flat array of [ lon, lat ] points that can then be context() queried for full features.
- Adds additional unit test to demonstrate that in types/limits mode reverse geocodes do indeed load full features/derive address points properly.
- More verbosity in --debug output

## 16.2.3

- Optimize vector geojson output at indexing time for ligther vector tiles.

## 16.2.2

- Bump carmen-cache for better error handling on index merges.

## 16.2.1

- Use stricter eslint rules.

## 16.2.0

- Add support for addresses that are ordered from largest feature to smallest
- Fix a bug in ID queries when `geocoder_name` != `geocoder_type`.

## 16.1.0

- Fix an issue with too-strict filtering of indexes that use a combined stack range

## 16.0.0

- All addresses are now standardized to GeometryCollections internally
- Allows for mixed type (pt/itp) features as well as reducing complexity at runtime (at the cost of index time)

## 15.2.4

- Bump due to npm strangeness

## 15.2.3

- Fix global token bug that prevented global tokens being used by indexer
- Added ability for carmen cli to specify global token file

## 15.2.2

- Moves limit constants into `lib/constants.js` for easier tracking and updates.

## 15.2.1

- Set the relevance score to 1 when a feature is queried by ID

## 15.2.0

- Ensures that tokens which contain whitespaces are a part of the global tokens

## 15.1.9

- Fix bug where dedup could put less relevant results infront of higher ones

## 15.1.8

- Fix broken phrasematch bench
- Use normalized ranges ITP instead of default feature - fixes bug where null lf/lt/rf/rt would hard error if null instead of empty array

## 15.1.7

- Ensure address clusters are all lowercase to ensure no case disparity between input query and cluster

## 15.1.6

- Dedup identical addresses with different cases ie MAIN ST = Main St

## 15.1.5

- Remove unneccesary check for carmen:center at indexing time

## 15.1.4

- Fix bug where non-clustered address ranges (LineString) of a numeric type would fail

## 15.1.3

- Fix bug where copy, merge streams would be considered done prematurely

## 15.1.2

- Moved merge operations to cpp threadpool for better performance
- carmen-cache@0.13.0

## 15.1.1

- carmen-cache@0.12.1

## 15.1.0

- Add `bbox` query option
- save memory in addresscluster by calculating minimum without unnecessary array
- 30% more efficient string traversal in getPhraseDegens

## 15.0.1

- Removes parallel process capability in carmen-indexer

## 15.0.0

- Disables generation of autocomplete degens in the grid cache at indexing time for translated text

## 14.2.0

- Upgrades mapnik to version 3.5

## 14.1.0

 - Add infrastructure for merging multiple indexes together, to facilitate
   parallel indexing.

## 14.0.2

- Improve query fallback logic by scoring queries per number of matching
  indexes as well, instead of just per number of matching tokens.

## 14.0.1

- Segment exclusively Chinese/Japanese/Korean (CJK) terms from everthing else in the index in order to avoid collisions introduced by unidecoding (e.g. 'Aruba' / 'Arubatazhou').

## 13.1.0

- Add a flag to disable autocomplete in forward geocoding

## 13.0.0

- Remove deprecated tilelive from index parameter and update to only use streaming interface
- Expand index.update to use object options instead of just zoom

## 12.2.7

- Expose source._commit where it exists

## 12.2.6

- Cleanly exit after obtaining a results with scripts/carmen.js when using --config flag

## 12.2.5

- Better handling of empty strings in DAWG index

## 12.2.4

- Streaming indexer should utilize geocoder_resolution in tile cover

## 12.2.3

- Fix context properties bug
- Add id=> output for all features

## 12.2.2

- Enforce GeoJSON compliance on indexing

## 12.2.1

- Ensure addressitp parity exists

## 12.2.0

- Allow up to 10 forward geocodes (default 5) specified by the limit param
- Allow up to 5 reverse geocodes (default 1) when only querying for a single type
- Update indexer to transform ITP & Clusters for vectorization and output to stream
- Add new limit tests

## 12.1.1

- Upgraded to use latest node-mapnik API for decoding and encoding Vector Tiles

## 12.1.0

- Enforce max query length of 256 chars
- Enforce max token length of 20 tokens

## 12.0.2

- Fix bug where a feature with a stack name could be discareded, giving the next feature an incorrect carmen:idx

## 12.0.1

- Update addFeature.js to index and then vectorize using output from stream.

## 12.0.0

- Upgrade to Node 4, dropping 0.10

## 11.4.1

- Update deps in anticipation of deprecating Node 0.10 in favour of 4.0

## 11.4.0

- Migrate all unit tests to GeoJSON
- Internal addFeature function now only accests GeoJSON

## 11.3.1

- Cleanup unused code as well as add additional JSDoc comments

## 11.3.0

- Add streaming interface for indexing
- Output transformed GeoJSON features for vector tiles as stream

## 11.2.4

- Optimize/reduce I/O when types filter is used.

## 11.2.3

- Fix bad reference in verifymatch leading to crashing error.

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
