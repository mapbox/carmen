# Changelog

## 30.7.2
- Indexes features with ordinals dropped with lower relevance to handle missing ordinals in queries
- Performance improvements from removing deadcode

## 30.7.1

- Give a slight boost to scorefactors of 1 when adjusting scoredist in spatialmatch

## 30.7.0

- Upgrade VTQuery to 0.5.0
- Require polygons to be direct hits on reverse geocodes

## 30.6.1

- Adjust the penalty applied to longer stacks to penalize stacks of length 2 less

## 30.6.0

- Use a list of frequent words to drop common words while indexing phrases
- Add logic for giving partial relevance credit to close-but-misaligned context features

## 30.5.0

- Added modular address style matching
- Added Queens address style

## 30.4.0

- Add and update various limiting constants for verifymatch
- Add backfill process for loading more features as needed in verifymatch, up to 50
- Add named callbacks for most verifymatch functions

## 30.3.2

- Tweaked result sort order for address results outside of interpolation ranges in proximity queries

## 30.3.1

- Added missing JSDocs
- Added missing changelog entries

## 30.3.0

- Improve outlier detection for interpolation ranges

## 30.2.0

- Enable selective filtering in VTQuery
- Improve VTQuery performance

## 30.1.0

- Revert VTQuery Filtering

## 30.0.0

- Changes templating engine to handlebars
- Enabled per feature templating overwrites
- Enable filtering in VTQuery

## 29.3.1

- Decrease VERIFYMATCH_STACK_LIMIT to 50
- Decrease MAX_CONTEXTS_LIMIT to 20

## 29.3.0

- Increase VERIFYMATCH_STACK_LIMIT to 100
- Add backfill for loading more contexts if relevance doesnt match expected relevance from spatialmatch

## 29.2.0

- Improve handling of ID collisions that sometimes previously resulted in failing to return any results
- Adjust relevance calculations to change how different administrative components of a query are weighed relative to one another

## 29.1.0

- Replaced mapnik with VTQuery
- Adjusted sorting in reverse geocoding with scoring to use distance as a tie breaker
- Tuned minimum distance for distscore from 50 m down to 25 m

## 29.0.4

- Don't de-duplicate address results based on matched text and context if the matched text is a numerical autocomplete or other short query.

## 29.0.3

- Convert numeric `override:*` values to strings before indexing.

## 29.0.2

- Add `&` support for intersection search queries which allows users to search for an intersection using `&` between street names. For example, "Street A & Street B"

## 29.0.1

- Ensure `carmen:text` is stringified before entering `clostest-lang`

## 29.0.0

- No longer generate or read the frequency.rocksdb file
- Demand that the `maxscore` is in index metadata
- Remove out-of-date `bin/tokenize.js` script
- Correctly return matching_text for address numbers longer than 2 digits

## 28.7.0

- Do not include categories as part of the matching_text

## 28.6.0

- Pass a proximity radius specified on an index through to coalesce
- Slightly increase the penalty for features where an address number isn't found (e.g. street fallbacks), since more of these make it into final results when address indexes have a higher proximity radius
- Use carmen-cache version 0/27.0 that specifies a distance floor

## 28.5.0

- Allow properties with an `override:<index name>` property to replace the calculated value
  that would be returned in the context array otherwise

## 28.4.3

- De-duplicate address results based on matched text and context

## 28.4.2

- Add support for Russian-style address numbers, including Korpus and Stroenie

## 28.4.1

- Fix error condition when attempting to resolve ID collisions involving intersection features

## 28.4.0

- Output `feature.geometry.intersection: true` on intersection features

## 28.3.0
- Add intersection search support which allows users to search for "Street A and Street B"

## 28.2.0

- Add a mechanism for address indexes to express their expected housenumber order (before or after the street name) and use it to rank otherwise-tied results.

## 28.1.0

- Add support for individual address properties using the `carmen:addressprops` tag

## 28.0.0

- Allow source replacements to change the ‘cardinality’ of a query, including splitting, combining and removing tokens.
- Global replacements are no longer enumerated at index time when generating index-able variants.
- Improved address number parsing, now recognizes formats like `2/3-4`
- Improved CJK numeric tokenization doesn’t stop parsing text after the first number.
- Fixed a bug where we could detect an address number early in processing but fail to locate it again before presenting results

## 27.2.0

- Sort non-interpolated address results over interpolated address results given the same relevance.

## 27.1.0

- Added support for performing autocomplete queries on partial housenumbers (e.g., querying for "51" and getting "510 Main St.") if proximity is enabled
- Moved to a new carmen-cache release (0.26.0) that generates more compact indexes in some circumstances, and supports new fast-path operations to make partial-housenumber search more performant
- Added support for indexes with index bounds that cross the antimeridian
- Refactored tokenization to logic to facilitate future feature work around cardinality-changing token replacements

## 27.0.0

- Removed name regex support in token replacement via XRegExp. Native support in node 10+ is still functional.
- Fix address vs unit number position detection when address and unit numbers exist in different clusters.

## 26.2.0

- Add fallback behavior if tilecover fails to calculate covers for geometry

## 26.1.0

- Update to carmen-cache to 0.25.0
- Tighened the width of gaussian curved use is proximity scoring by factor of 3.
- Rescaled distance and weight during proximity scoring. Previously both were put on a 1-11 scale. Now; distance is 1-10, score is 1-500.
- Fixed a bug where the composite relevance + scoredist value was ignored during a sort if the b value was greater than a.
- Lessen relevence penalty on street features.

## 26.0.0

- Rewrite carmen token replacement logic to more heavily leverage fuzzy-phrase

## 25.8.1

- Fix a bug where category matches could have a relevence greater than 1.

## 25.8.0

- Updated carmen-cache to 0.24.0 which adds support for word-boundary aware autocomplete
- Added support for passing carmen-cache an integer value indicating the type of autocomplete to perform for simple token replacements
- CLI options `--autocomplete` and `--fuzzyMatch` now default to `true` when not explicitly set
- CLI option `--routing` now defaults to `false` when not explicitly set

## 25.7.3

- Updated carmen-cache to 0.23.0 which includes internal refacor and RocksDB update.

## 25.7.2

- Fix a bug in language auto-population rules including language tags containing hyphens.

## 25.7.1

- Fix the behavior of the geocoder_universal_text index flag so it actually skips language penalties for unviversal indexes.

## 25.7.0

- Added support for the TileJSON property `geocoder_ignore_order`. This can be used to exempt specific indexes from incurring the "backy" penalty in verifymatch, and is useful for address components whose typical written position is contra the hierarchical ordering (eg. US postcodes are typically written at the end of an address, despite not being the highest level of the US address hierarchy.
- Removed query-time de-duplication based on street address & distance.

## 25.6.0

- Sort final results based on a composite scoredist and relevance score with penalties for features with `carmen:address` of `null`, omitted geometries, or `carmen:score`s of `-1` (ghost features)

## 25.5.1

- Update all deps to latest versions

## 25.5.0

- Add a mechanism for auto-populating language bitfields based on the assumed language of a given country
- Improve efficiency of forward queries that use type filters

## 25.4.0

- Calculate `scoredist` in verifymatch.js as a product of score normalized by max score of all features and distance normalized by proximity radius and scaled along a gaussian curve

## 25.3.1

- Consider nmask earlier in stackable to improve performance

## 25.3.0

- Allow streets to be returned as a fallback if no address number match is possible

## 25.2.0

- Use proximity point (when provided) to bias sort order before spatial match cutoff

## 25.1.0

- Added `geocoder_categories` to TileJSON input to allow a small score bump for category queries

## 25.0.10

- Added `autocomplete` and `fuzzyMatch` boolean CLI options to `bin/carmen.js`
- Added some missing tests for checking other CLI options like `proximity`, `bbox` and `reverseMode`

## 25.0.8

- Expose some internal cutoffs as configuration options

## v25.0.7

- Refactor proximity.scoredist tests

## v25.0.6

- Fix proximity.scoredist tests

## v25.0.5

- Fix geocoder_format template parsing to handle presence of arabic comma

## v25.0.4

- update to caarmen-cache@0.21.5, which reduces the cross-language relevance penalty

## v25.0.3

- Ensure all `.address` properties are String values

## v25.0.2

- Fix a bug in text processing that crashed indexing when the `text` contains reserved words.

## v25.0.1

- Constrain the circumstances under which fuzzy matching is used to improve speed
- Fix a bug in language parameter parsing that can cause crashes on malformed language tags

## v25.0.0

- Replace the dawg-cache text backend with the new node-fuzzy-phrase library
- Add support for fuzzy text matching
- Significantly refactor the phrasematch operation
- Move to a new, faster carmen-cache release
- Add support for node 8 and node 10

## v24.5.3

- Update yarn lockfiles

## v24.5.2

- Update mapnik & sqlite3 deps to their latest versions

## v24.4.3
- Fix text indexing issue that caused indexing to fail upon encountering certain kinds of malformed unicode input

## v24.4.2
- Update context.js to only calculate routable points if `routing` option is enabled

## v24.4.1
- Add basic routable point functionality for forward and reverse geocoding of features from sources that are routable

## v24.4.0
- improve diacritical mark removal to support combining diacritics

## v24.3.2
- update to carmen-cache@0.21.1, which removes unnecessary dependencies

## v24.3.1
- major reorganization of modules, but no API changes
- major reorganization of tests
- remove carmen-copy, along with associated lib and tests

## v24.2.12
- add support for dashes in format string templates

## v24.2.11
- changed the fallback for `hr`	from `sr` to `sr-Latn`

## v24.2.10

- Add support for Oconomowoc, WI style addresses

## v24.2.9
- JSDoc comments added
- documentation.js for auto-generating docs/api.md
- warn when code is missing JSDoc
- switch to codecov for coverage reporting

## v24.2.8
- massive linting/cleaning
- overhauls readme
- adds example project
- adds separate docs folder for in-depth topics

## v24.2.7
- Fix context builder bug

## v24.2.6
- Reduces index size by dropping interpolation for addresss clusters that have a wide address number range

## v24.2.5

- Add support for maching_place_name output on address features

## v24.2.4

- Improve tokenize script

## v24.2.3

- Fix bug with where capture groups would be incorrectly numbered when using a token with a diacritic and a capture group

## v24.2.2

- Fix a bug with validating `--bbox` flag in scripts/carmen.js

## v24.2.1

- Add `geocoder_stack` filter to phrasematch, to skip unneeded inxdexes earlier when
  using the `country` query param
- Hard fail when indexing features with more than 10 synonyms

## v24.1.12

- Fix a bug with validating type filters on geocodes.

## v24.1.11

- Use es6-native-set and es6-native-map instead of builtin Set and Map,
  avoid hitting Node's memory limit for large indexing jobs

## v24.1.10

- Update to turf@5.x.x

## v24.1.9

- Fix memory issue introduced in 24.1.1 by limiting the number of duplicate address
  numbers considered per address cluster to 10.

## v24.1.8

- Fix typo in carmen-merge bin script from 24.1.7

## v24.1.7

- Add carmen-merge script to `bin` in package.json

## v24.1.6

- add carmen-merge to package.json.s

## v24.1.5

- Indexing performance improvements via optimizations to token replacement.

## v24.1.4

- Switch to `yarn` for tests and migrate package-lock to yarn.lock

## v24.1.3

- Fix indexing of `universal_text` when the value is shared with another language

## v24.1.2

- Disable autocomplete on an address's numerical token when the token is moved to the beginning of the query string.

## v24.1.1

- Support correct forward geocoding over address clusters that contain multiple entries
  for the same address number.

## v24.1.0

- Allow for greater flexibility in the token replacement representation introduced in 24.0.0

## v24.0.0

- Optionally support a greater number of token-replacement permutations efficiently

## v23.0.5

- Fix proximity issue via upstream fix in carmen-cache
- Tune proximity settings to weight local results more heavily

## v23.0.4

- Fix indexing of address text without house numbers to be weighted consistently

## v23.0.3

- Make maskAddress a bit smarter by looking at both the coverText and query to determine if
  it's about to reuse a housenum that was really originally interpreted as a street.
  (https://github.com/mapbox/carmen/pull/648)
- Fix a bug that could let indexer-only token replacers leak into runtime replacers
  (https://github.com/mapbox/carmen/pull/649)

## v23.0.2

- Remove stacky bonus and gappy penalty (https://github.com/mapbox/carmen/pull/647)

## v23.0.1

- Packaging fix for carmen-cache.

## v23.0.0

- Improves handling of cross-language queries against data with partial translation coverage.
- Update handling of default text to no longer have preferential fallback treatment.
- Split display and query fallback language definitions.

## v22.5.0

- Create `[W,S,E,N]` bboxes when feature geometry straddles the antimeridian
- Optionally clip these `[W,S,E,N] bboxes at +/-179.9 degrees, to preserve backwards compatibility

## v22.4.4

- Small improvements to language fallback behavior for Latvian, Lithuanian, Azerbaijani, and Estonian

## v22.4.3

- Fix a problem with carmen-index.js in cases where the passed-in tokens file contains a function

## v22.4.2

- :rocket: Allow function to be used as tokens file in scripts/carmen.js

## v22.4.1

- Update Deps to @mapbox prefix where possible
- `trim()` abbr after each tokenize.replaceToken call

## v22.4.0

- Index multiple variations on token replacement to better support autocomplete of token-
  replaced text, defaulting to indexing unambiguously reversible replacements
- Add `custom_inverse_tokens` mechanism to allow specifying behavior in ambiguous cases
- Fix a bunch of token-replacement-related bugs

## v22.3.0

- Add `text_universal`, for text which can apply to all langauges

## v22.2.2

- Update carmen-cache

## v22.2.1

- Collapsing variants of ARABIC LETTER YEH for uniform indexing

## v22.2.0

- Update tests to arrow functions, `let`, & `const`
- Change sort behavior for tied addresses so first number is given slight boost

## v22.1.3

- Update to mapnik `~3.6.0`

## v22.1.2

- Handle situations in which an ID shard contains multiple features from the same tile

## v22.1.1

- Fix a few cases where `matching_text` and `matching_place_name` properties were not set as expected.

## v22.1.0

- Add support for multiple languages to be specified in the `language` option and multiple language output formatting.

## v22.0.0

- Drop support for node `4.x.x`
- Support centered around `6.10.2`
- Update dependancies to support 6.x.

## v21.0.2

- Fix a bug where `indexes` weren't returned for an idGeocode

## v21.0.1

- Fix a bug in string sorting affecting some strings with mixed complex scripts after the unidecode removal.

## v21.0.0

- Update carmen-cache to v0.18.0, which stores per-language metadata in the grid cache, and adapt carmen accordingly, to allow proper supported of multilingual autocomplete, and language-weighted results.
- Drop unidecode altogether, and replace it with a much slimmer diacritical mark folder, such that most non-ASCII text is now indexed as-is, improving multilingual accuracy.

## v20.2.1

- Fix a bug that in certain situations allows features with a null value in their `carmen:center` property to pass validation

## v20.2.0

- PT addresses are now returned over ITP addresses only if they fall within a set distance

## v20.1.3
- Fix a bug in package.json

## v20.1.2
- Fix an issue introduced by the switch to RocksDB, in which numeric tokens would match address numbers before features with numeric text (such as postcodes)

## v20.1.1
- add English as a fallback language for Arabic and tests to confirm this behaviour.

## v20.1.0

- add `reverseMode` parameter. When set to `score`, a feature's score will be considered when sorting
the results of a reverse query. Defaults to `distance`.

## v20.0.0
- Update to carmen-cache@0.17.0, a major revision which eliminates cache sharding and moves the underlying storage mechanism to one backed by [RocksDB](http://rocksdb.org/)
- Adapt carmen to this new cache layer by eliminating logic around on-the-fly loading and storing of grid and frequency data, which is now delegated to RocksDB
- Change phrase IDs to strings, allowing elimination of degen indexing in favor of ID prefix scans in carmen-cache

## v19.0.3
- Add a `digraphic` array of languages known to use multiple scripts, for more rigorous filtering in `languageMode: strict`

## v19.0.2
- Add additional Serbian fallabcks
- Add an `equivalent.json` mapping of allowed equivalent languages
- Allow equivalent languages to pass the `languageMode: strict` filter

## v19.0.1
- Add `sr_Latn` fallback for `sr_BA`, `sr_CS`, `sr_ME`, and `sr_RS` language codes

## v19.0.0

- Remove code/support for version 0 legacy features
- Adds index-level option `geocoder_universal_text` for allowing features in an index to be considered language-agnostic/compatible with any requested language when using `languageMode=strict`

## v18.2.0

- Improve proximity distance calculation for polygon features.
- Update to carmen-cache@0.16.5.

## v18.1.4

- Update to carmen-cache@0.16.4.

## v18.1.3

- Add support for IL style addresses: `43N134 Woodward Ave.`
- Revert spatialmatch stack truncation from 18.1.2
- Update to carmen-cache@0.16.3 with additional `coalesce()` performance optimizations

## v18.1.2

- Spatialmatch the top 4 most specific features of each subquery stack as a performance optimization/safeguard against massive `coalesce()` jobs

## v18.1.1

- Optimizations to runtime query and indexing operations

## v18.1.0

- Adds new querytime option languageMode which can be set to `strict` to limit returned features to only those that fully match the language specified in the language option

## v18.0.0

- Breaking change: a log scale distribution is now used for the 3-bit grid cache simplified score
- Move project to `@mapbox` namespace on npm
- Fix the timing calculation reported with the `--stats` flag
- Update outdated dependencies. In particular, use namesapced `@turf` modules

## v17.10.1

- Use `Number` instead of `parseFloat` to detect reverse queries as `parseFloat` will silently drop non-numeric parts of a string leading to `9a,10b` being interpreted as a reverse query.

## v17.10.0

- Update to `@mapbox/carmen-cache` package namespace and use latest release (`0.16.2`) that addresses several performance and stability issues.

## v17.9.1

- Fix a spatialmatch bug where low relevance partial text matches would displace higher-relevance full text matches

## v17.9.0

- Refine multitype behavior and add `place_type` key to explicitly enumerate the types a feature can be.

## v17.8.5

- Fix indexer behavior for indexes where the max score is specified as 0

## v17.8.4

- Change penalty from 0.006 => 0.01 to put it on the same %10 scale as other penalties

## v17.8.3

- Change indexing behavior: don't generate degens (for autocomplete) for feature synonyms

## v17.8.2

- Filter results disallowed by the `types` filter before sorting and limiting potential matches
- In spatialmatch, sort stacks by index from lowest to highest when zoom level is the same
- Add alternate unicode apostrophes for punctuation normalization

## v17.8.1

- Use fallback language when the specified language key exists, but has a null value.

## v17.8.0

- Update to `carmen-cache@0.15.0`.

## v17.7.3

- Automatically lowercase all `stacks` values for a given query

## v17.7.2

- Move eslint to dev dependencies.
- Update to `carmen-cache@0.14.1`.

## v17.7.1

- Trim whitespace from text values when outputting feature values.

## v17.7.0

- Update to `carmen-cache@0.14.0`.

## v17.6.5

- Robustify language fallback behavior for unmatched language suffixes.

## v17.6.4

- Modified language fallback behavior to reflect feedback collected from human translators.

## v17.6.3

- Fix multitype corner case where a feature promoted across levels would not always be properly promoted.

## v17.6.2

- Update several dependencies to `@mapbox` namespaced versions.
- Performance optimizations for `phrasematch()` when dealing with tokens that resolve to empty strings/whitespace when unidecoded.

## v17.6.1

- Fixes bug where unencodable text like emojis wasn't being ignored.

## v17.6.0

- Adds index-level option `geocoder_inherit_score` for promoting features that nest within other similar named parent features (e.g. promote New York (city) promoted above New York (state)).

## v17.5.2

- Add stopgap measure to indexer to partially handle features with > 10k zxy covers. (https://github.com/mapbox/carmen/pull/545)

## v17.5.1

- More consistent behavior for nested feature promotion when used with the `language` option.
- Code and style improvements.

## v17.5.0

- Modifies verifyContext to better handle identically-named nested features e.g. "New York, New York". Preferentially returns the smaller feature in such cases.

## v17.4.0

- Introduce mechanisms for approximate guessing of requested language, both using heuristics and hard-coded fallbacks.

## v17.3.0

- Include private `carmen:` properties in feature output when in debug mode.
- Switch `carmen:dbidx` to `carmen:index` to track feature to index relationship more easily.

## v17.2.3

- Performance improvements to `spatialmatch.stackable()`

## v17.2.2

- Fix bug where type filters would not always work correctly with forward geocodes and multitype indexes.

## v17.2.1

- Fix bug around feature loading in verifymatch.

## v17.2.0

- Adds support for individual multitype features in indexes determined by the `carmen:types` attribute. See README for more details.

## v17.1.5

- Fix typo in `lib/verifymatch.js`

## v17.1.4

- Performance optimizations for `spatialmatch.stackable()`.

## v17.1.3

- Fix for several calls that could lead to max call stack exceeded errors.

## v17.1.2

- During indexing, ensure all work in `process.stdout` finishes before exiting the process

## v17.1.1

- Fixes formatting of error message when an invalid `types` value is specified.

## v17.1.0

- Allows for filtering by subtypes (e.g. `poi.landmark`) which are defined by score range.

## v17.0.0

- Allow more flexible regexes in global tokens and refactor how they are applied.

## v16.2.4

- types + limit reverse query mode is now only a concept handled by reverseGeocode().
- context() always returns a single context.
- Adds context.nearest() for playing the role that the proximity context mode played before -- returns a flat array of [ lon, lat ] points that can then be context() queried for full features.
- Adds additional unit test to demonstrate that in types/limits mode reverse geocodes do indeed load full features/derive address points properly.
- More verbosity in --debug output

## v16.2.3

- Optimize vector geojson output at indexing time for ligther vector tiles.

## v16.2.2

- Bump carmen-cache for better error handling on index merges.

## v16.2.1

- Use stricter eslint rules.

## v16.2.0

- Add support for addresses that are ordered from largest feature to smallest
- Fix a bug in ID queries when `geocoder_name` != `geocoder_type`.

## v16.1.0

- Fix an issue with too-strict filtering of indexes that use a combined stack range

## v16.0.0

- All addresses are now standardized to GeometryCollections internally
- Allows for mixed type (pt/itp) features as well as reducing complexity at runtime (at the cost of index time)

## v15.2.4

- Bump due to npm strangeness

## v15.2.3

- Fix global token bug that prevented global tokens being used by indexer
- Added ability for carmen cli to specify global token file

## v15.2.2

- Moves limit constants into `lib/constants.js` for easier tracking and updates.

## v15.2.1

- Set the relevance score to 1 when a feature is queried by ID

## v15.2.0

- Ensures that tokens which contain whitespaces are a part of the global tokens

## v15.1.9

- Fix bug where dedup could put less relevant results infront of higher ones

## v15.1.8

- Fix broken phrasematch bench
- Use normalized ranges ITP instead of default feature - fixes bug where null lf/lt/rf/rt would hard error if null instead of empty array

## v15.1.7

- Ensure address clusters are all lowercase to ensure no case disparity between input query and cluster

## v15.1.6

- Dedup identical addresses with different cases ie MAIN ST = Main St

## v15.1.5

- Remove unneccesary check for carmen:center at indexing time

## v15.1.4

- Fix bug where non-clustered address ranges (LineString) of a numeric type would fail

## v15.1.3

- Fix bug where copy, merge streams would be considered done prematurely

## v15.1.2

- Moved merge operations to cpp threadpool for better performance
- carmen-cache@0.13.0

## v15.1.1

- carmen-cache@0.12.1

## v15.1.0

- Add `bbox` query option
- save memory in addresscluster by calculating minimum without unnecessary array
- 30% more efficient string traversal in getPhraseDegens

## v15.0.1

- Removes parallel process capability in carmen-indexer

## v15.0.0

- Disables generation of autocomplete degens in the grid cache at indexing time for translated text

## v14.2.0

- Upgrades mapnik to version 3.5

## v14.1.0

 - Add infrastructure for merging multiple indexes together, to facilitate
   parallel indexing.

## v14.0.2

- Improve query fallback logic by scoring queries per number of matching
  indexes as well, instead of just per number of matching tokens.

## v14.0.1

- Segment exclusively Chinese/Japanese/Korean (CJK) terms from everthing else in the index in order to avoid collisions introduced by unidecoding (e.g. 'Aruba' / 'Arubatazhou').

## v13.1.0

- Add a flag to disable autocomplete in forward geocoding

## v13.0.0

- Remove deprecated tilelive from index parameter and update to only use streaming interface
- Expand index.update to use object options instead of just zoom

## v12.2.7

- Expose source._commit where it exists

## v12.2.6

- Cleanly exit after obtaining a results with scripts/carmen.js when using --config flag

## v12.2.5

- Better handling of empty strings in DAWG index

## v12.2.4

- Streaming indexer should utilize geocoder_resolution in tile cover

## v12.2.3

- Fix context properties bug
- Add id=> output for all features

## v12.2.2

- Enforce GeoJSON compliance on indexing

## v12.2.1

- Ensure addressitp parity exists

## v12.2.0

- Allow up to 10 forward geocodes (default 5) specified by the limit param
- Allow up to 5 reverse geocodes (default 1) when only querying for a single type
- Update indexer to transform ITP & Clusters for vectorization and output to stream
- Add new limit tests

## v12.1.1

- Upgraded to use latest node-mapnik API for decoding and encoding Vector Tiles

## v12.1.0

- Enforce max query length of 256 chars
- Enforce max token length of 20 tokens

## v12.0.2

- Fix bug where a feature with a stack name could be discareded, giving the next feature an incorrect carmen:idx

## v12.0.1

- Update addFeature.js to index and then vectorize using output from stream.

## v12.0.0

- Upgrade to Node 4, dropping 0.10

## v11.4.1

- Update deps in anticipation of deprecating Node 0.10 in favour of 4.0

## v11.4.0

- Migrate all unit tests to GeoJSON
- Internal addFeature function now only accests GeoJSON

## v11.3.1

- Cleanup unused code as well as add additional JSDoc comments

## v11.3.0

- Add streaming interface for indexing
- Output transformed GeoJSON features for vector tiles as stream

## v11.2.4

- Optimize/reduce I/O when types filter is used.

## v11.2.3

- Fix bad reference in verifymatch leading to crashing error.

## v11.2.2

- Fix wasteful duplicate I/O when loading grid cache shards.

## v11.2.1

- Stop addFeature() in unit tests from overwiting VT. Instead decode and append to it.

## v11.2.0

- Add support for feature/index level `geocoder_stack` parameter. This parameter allows for stack based filtering (as opposed to type filtering)
- Also uses stack for building stackable phrase list instead of bounds

## v11.1.0

- Drop `mmap` dependency.
- Reintroduce `XRegExp` dependency for limited circumstances where named capture groups are necessary.

## v11.0.0

- Carmen's dict cache now uses [directed acyclic word graphs](https://en.wikipedia.org/wiki/Deterministic_acyclic_finite_state_automaton) instead of the bit array cache introduced in carmen 9.0.0. As before, they are generated at index time and stored and can be dumped and loaded in a single contiguous-memory chunk, so fast start times should be preserved as compared to bit cache, but with more memory compactness and lower collision rates.

## v10.0.0

- CJK characters in an indexable word or phrase are now indexed individually to support the practice of addresses being written from largest -> smallest geographical entity and without delimeters.

## v9.0.1

- Bugfixes to multiconf approach.

## v9.0.0

- Refactored dict cache using bit arrays and `mmap` for lower runtime memory profile.
- Refactored index loading to cleanly handle multiple configurations from the same source instances.
- Supported `geocoder_version` is now 5.

## v8.7.1

- Catch more unhandled error cases for debugging.

## v8.7.0

- Expose custom feature properties in `context` entries.

## v8.5.4

- Clean up context handling of various feature encoding methods from VTs.

## v8.5.3

- Catch unhandled error case for debugging purposes.

## v8.5.2

- Update to locking@2.0.2.

## v8.5.1

- Perform type filtering for reverse geocodes at the context.js level instead of after the context stack has been generated.

## v8.5.0

- Add `geocoder_type` flag which allows non-similiar indexes to compete for the lowest result in a reverse geocode.

## v8.3.2
- Set better text templating failovers for localization support.

## v8.3.1
- Fail index builds with bad language codes.

## v8.3.0
- Add a `language` option that will return the values of `carmen:text_{ISO language code}` in the format of `geocoder_format_{ISO language code}` if available in the index.

## v8.2.0
- Synonymize `carmen:text_{ISO language code}` field in indicies with `carmen:text` field to support queries in multiple languages.

## v8.0.1

- Change `geocoder_address` field to `geocoder_format` to retain ability to differentiate between address and non-address indexes.
- `geocoder_address` is not a binary `0` or `1` value.

## v8.0.0

- Update geocoder to accept templates for place name formatting

## v7.0.0

- Update indexer & feature objects to use fully compliant GeoJSON

## v6.2.0

- Update carmen-cache to 0.9.0, introduce `geocoder_cachesize` option.

## v6.1.0

- Update mapnik to version 3.4.3

## v6.0.1

- Use a singleton VT cache to limit memory usage across indexes.

## v6.0.0

- Switch to murmur hash and 52-bit phrase IDs.

## v5.2.2

- Triage unknown conditions that can cause an unexpected error.

## v5.2.1

- Improve `scoredist` calculation by using geometric mean of features for scaling scoredist, not max score.

## v5.2.0

- Add `types` query option to filter results by feature type.

## v5.1.2

- Fix feature id query mode.

## v5.1.1

- Smart dedupe of ghost features out of result sets when they match text of other non-ghost features.

## v5.1.0

- NumTokens V3 for more efficient feature verification. See https://github.com/mapbox/carmen/pull/310.
- Sieve indexing mode for broader indexing of feature text.
- Bumps geocoder_version to 3 (version 2 continues to be supported at runtime).

## v5.0.5

- Fix for feature verification bug where a non-optimal relevance could sometimes be assigned.

## v5.0.4

- Fix for proximity bug where extreme values would push into negative xy integers.

## v5.0.3

- Fix for decollide bug.

## v5.0.2

- Improved performance for feature verification in verifymatch.

## v5.0.1

- More efficient spatialmatch by introducing a bounds mask per index and loading grids at spatialmatch time.

## v5.0.0

- Update index format for delta encoding in carmen-cache@0.7.x. This is a breaking change that requires reindexing. See https://github.com/mapbox/carmen/pull/301 and https://github.com/mapbox/carmen-cache/pull/37 for details.

## v4.0.6

- More sophisticated tokenization behavior around punctuation -- apostraphe and period characters collapse while most others split terms.

## v4.0.5

- Doubletap - more conservative vt caching settings

## v4.0.4

- Updates to carmen-cache @ 0.6.0 for more conservative memory use
- Reduces vtile LRU cache size for high zoom sources

## v4.0.3

- Robustification fix for how token replacement handles unidecode at indexing + query time.

## v4.0.2

- Fixes to proximity mode to account for both score and distance.

## v4.0.1

- Bug fix for lone housenum subquery permutations and upgrade to carmen-cache@0.5.1.

## v4.0.0

- Large refactor of carmen index structure and indexing/runtime processes. See https://github.com/mapbox/carmen/pull/287

## v3.1.6

- Rollback XRegExp use.

## v3.1.5

- Move `addfeature.js` from test directory to lib for external testing use.

## v3.1.4

- Fix for max call stack errors when using grid indexes with high cardinality.

## v3.1.3

- Extend geocoder_tokens to use XRegExp.

## v3.1.2

- Pin to node-mapnik 3.2.x until mapnik 3.3.x is ready.

## v3.1.1

- Allow geocoder_tokens to be expressed as explicit regex patterns.

## v3.1.0

- Include ghost features if queried for explicitly.

## v3.0.9

- Proximity fixes.

## v3.0.8

- Proximity fixes.

## v3.0.7

- Prioritizes layer type + score consistently across proximity/non-proximity mode.

## v3.0.6

- Additional sort stabilization at verifymatch stage.

## v3.0.5

- Improvements to result stability in proximity mode.

## v3.0.4

- Use single closest degen for non-terminal terms.
- Update to carmen-cache@0.4.1 with support for swapped order setRelevance.

## v3.0.3

- Snap dataterm min/max values to nearest thousand. Reduces cardinality of phrase index with minimal affect on dataterm accuracy at querytime.

## v3.0.2

- Use cache#loadall when indexing.

## v3.0.1

- Added cache#loadall for loading shards without retrieving results.

## v3.0.0

- Improved suggestion/autocomplete support for partial queries.
- **Breaking change:** Introduces `dataterm` term ID type. Any carmen indexes generated previously that contained numeric text (e.g. US zipcodes or addresses with housenumbers) need to be reindexed using carmen@3.x.
