# carmen

[Mapnik vector tile](https://github.com/mapbox/mapnik-vector-tile)-based geocoder with support for swappable data sources.
This is an implementation of some of the concepts of [Error-Correcting Geocoding](http://arxiv.org/abs/1102.3306) by [Dennis Luxen](http://algo2.iti.kit.edu/english/luxen.php).

[![Build Status](https://travis-ci.org/mapbox/carmen.svg?branch=master)](https://travis-ci.org/mapbox/carmen)
[![Coverage Status](https://coveralls.io/repos/mapbox/carmen/badge.svg?branch=Coveralls&service=github)](https://coveralls.io/github/mapbox/carmen?branch=Coveralls)


## Depends

- Node v4.2.x

## Install

    npm install

Carmen no longer ships with any default or sample data. Sample data will be provided in a future release.

## Command line

Carmen comes with command line utilities that also act as examples of API usage.

To query the default indexes:

    ./scripts/carmen.js --query="new york"

To analyze an index:

    ./scripts/carmen-analyze.js tiles/01-ne.country.mbtiles

------

## Carmen API

## Carmen(options)

Create a new Carmen geocoder instance. Takes a hash of index objects to use,
keyed by each `id`. Each index object should be an instance of a `CarmenSource`
object.

```js
var Carmen = require('carmen');
var MBTiles = require('mbtiles');
var geocoder = new Carmen({
    country: new MBTiles('./country.mbtiles'),
    province: new MBTiles('./province.mbtiles')
});

geocoder.geocode('New York', {}, callback);
```

Each `CarmenSource` is a tilelive API source that has additional geocoder
methods (see **Carmen Source API** below). In addition following
`tilelive#getInfo` keys affect how Carmen source objects operate.

attribute               | description
------------------------|------------
maxzoom                 | The assumed zoom level of the zxy geocoder grid index.
geocoder_layer          | Optional. A string in the form `layer.field`. `layer` is used to determine what layer to query for context operations. Defaults to the first layer found in a vector source.
geocoder_address        | Optional. A flag (0/1) to indicate that an index can geocode address (house numbers) queries. Defaults to 0.
geocoder_format         | Optional. A string containing how to format the resulting `place_name` field. Ie: `{address._number} {address._name} {place._name}` where `address`/`place` are the extid of a given index and `_name`/`_number` are internal carmen designators to replace with the first text value from `carmen:text` & the matched address. This string can also map to string properties on the geojson. ie `{extid.title}` would be replace with `feature.properties.title` for the indexed GeoJSON for the given extid. By adding multiple `geocoder_format` keys with a language tag (e.g. `geocoder_format_zh`), multiple formats can be supported and engaged by using a `language` flag. See `test/geocoder-unit.address-format.test.js` for more examples.
geocoder_resolution     | Optional. Integer bonus against maxzoom used to increase the grid index resolution when indexing. Defaults to 0.
geocoder_group          | Optional + advanced. For indexes that share the exact same tile source, IO operations can be grouped. No default.
geocoder_tokens         | Optional + advanced. An object with a 1:1 from => to mapping of token strings to replace in input queries. e.g. 'Streets' => 'St'.
geocoder_name           | Optional + advanced. A string to use instead of the provided config index id/key allowing multiple indexes to be treated as a single "logical" index.
geocoder_type           | Optional + advanced. A string to be used instead the config index id/key. Omission of this falls back to geocoder_name and then to the id.
geocoder_types          | Optional + advanced. An array of type strings. Only necessary for indexes that include multitype features.
geocoder_version        | Required. Should be set to **7** for carmen@rocksdb. Index versions <= 1 can be used for reverse geocoding but not forward.
geocoder_cachesize      | Optional + advanced. Maximum number of shards to allow in the `carmen-cache` message cache. Defaults uptream to 65536 (maximum number of possible shards).
geocoder_address_order  | Optional + advanced. A string that can be set to `ascending` or `descending` to indicate the expected ordering of address components for an index. Defaults to `ascending`.
geocoder_inherit_score  | Optional + advanced. Set to `true` if features from this index should appear above other identically (ish) named parent features that are part of its context (e.g. promote New York (city) promoted above New York (state)). Defaults to `false`.
geocoder_universal_text | Optional + advanced. Set to `true` if features from this index should be considered language agnostic (e.g. postcodes). They will bypass the `languageMode=strict` flag and the `carmen:text` field will be treated as compatible with any language. Defaults to `false`.

*Note: The sum of maxzoom + geocoder_resolution must be no greater than 14.*

### geocoder_version < 1

attribute               | description
------------------------|------------
geocoder_shardlevel     | Deprecated. An integer order of magnitude that geocoder data is sharded. Defaults to 0.

### geocode(query, options, callback)

Given a `query` string, call callback with `(err, results)` of possible contexts
represented by that string. The following are all optional and can be provided
as part of the `options` object:

- `limit` - number. Adjust the maximium number of features returned. Defaults to 5.
- `proximity` - a `[ lon, lat ]` array to use for biasing search results.
  Features closer to the proximity value will be given priority over those
  further from the proximity value.
- `types` - an array of string types. Only features matching one of the types
  specified will be returned.
- `allow_dupes` - boolean. If true, carmen will allow features with identical
  place names to be returned. Defaults to false.
- `debug` - boolean. If true, the carmen debug object will be returned as part
  of the results and internal carmen properties will be preserved on feature
  output. Defaults to false.
- `stats` - boolean. If true, the carmen stats object will be returned as part
  of the results.
- `language` - ISO country code. If `carmen:text_{lc}` and/or `geocoder_format_{lc}`
  are available on a features, response will be returned in that language and
  appropriately formatted.
- `languageMode` - string. If set to `"strict"` the returned features will be
  filtered to only those with text matching the language specified by the
  `language` option. Has no effect if `language` is not set.
- `bbox` - a `[ w, s, e, n ]` bbox array to use for limiting search results.
  Only features inside the provided bbox will be included.

### index(from, to, pointer, callback)

Indexes docs using `from` as the source and `to` as the destination. Options can
be passed to `pointer` or omitted.

### analyze(source, callback)

Analyze index relations for a given source. Generates stats on degenerate terms,
term => phrase relations, etc.

### wipe(source, callback)

Clear all geocoding indexes on a source.

### copy(from, to, callback)

Copy an index wholesale between `from` and `to`.

------

## Carmen Source API

Carmen sources often [inherit from tilelive sources](https://github.com/mapbox/tilelive.js/blob/master/API.md).

### getFeature(id, callback)

Retrieves a feature given by `id`, calls `callback` with `(err, result)`

### putFeature(id, data, callback)

Inserts feature `data` and calls callback with `(err, result)`.

### startWriting(callback)

Create necessary indexes or structures in order for this carmen source to
be written to.

### putGeocoderData(index, shard, buffer, callback)

Put buffer into a shard with index `index`, and call callback with `(err)`

### getGeocoderData(index, shard, callback)

Get carmen record at `shard` in `index` and call callback with `(err, buffer)`

### getIndexableDocs(pointer, callback)

Get documents needed to create a forward geocoding datasource.

`pointer` is an optional object that has different behavior between sources -
it indicates the state of the database or dataset like a cursor would, allowing
you to page through documents.

`callback` is called with `(error, documents, pointer)`, in which `documents`
is a list of objects. Each object may have any attributes but the following are
required:

Each document is a valid geojson `Feature`. Each feature should contain a unique `id` field
as well as the following settings in the `properties` object.

attribute         | description
------------------|------------
`carmen:text`     | Default text to index for this feature. Synonyms, translations, etc. should be separated using commas.
`carmen:text_{language code}`     | Localized to index for this feature. Synonyms, translations, etc. should be separated using commas and will be synonymized with `carmen:text`.
`carmen:center`   | Optional. An array in the form [lon,lat]. center must be on the geometry surface, or the center will be recalculated.
`carmen:score`    | Optional. A float or integer to sort equally relevant results by. Higher values appear first. Docs with negative scores can contribute to a final result but are only returned if included in matches of a forward search query.
`carmen:addressnumber`  | Optional. Used with `geocoder_address`. An array of addresses corresponding to the order of their geometries in the `GeometryCollection`
`carmen:types`    | Optional. An array of types associating this feature with one or more feature classes defined by the source-level `geocoder_type` key. By setting multiple types a feature can move between various feature levels depending on the query and results. If omitted, defaults to the `geocoder_type` set by the feature's index.

### TIGER address interpolation

Carmen has basic support for interpolating geometries based on TIGER address
range data. To make use of this feature the following additional keys must be
present in the properties object.

attribute           | description
--------------------|------------
`carmen:rangetype`  | The type of range data available. Only possible value atm is 'tiger'.
`carmen:lfromhn`    | Single (LineString) or array of values (GeometryCollection) of TIGER LFROMHN field.
`carmen:ltohn`      | Single (LineString) or array of values (GeometryCollection) of TIGER LTOHN field.
`carmen:rfromhn`    | Single (LineString) or array of values (GeometryCollection) of TIGER RFROMHN field.
`carmen:rtohn`      | Single (LineString) or array of values (GeometryCollection) of TIGER RTOHN field.
`carmen:parityl`    | Single (LineString) or array of values (GeometryCollection) of TIGER PARITYL field.
`carmen:parityr`    | Single (LineString) or array of values (GeometryCollection) of TIGER PARITYR field.

------

### Example

```JSON
{
  "id": "7654",
  "type": "Feature",
  "properties": {
    "carmen:text": "Main Street",
    "carmen:center": [ -97.1, 37 ],
    "carmen:score": 99,
    "carmen:rangetype": "tiger",
    "carmen:lfromhn": [ "100", "200" ],
    "carmen:ltohn": ["198", "298"],
    "carmen:rfromhn": ["101", "201"],
    "carmen:rtohn": ["199", "299"],
    "carmen:parityl": ["E", "E"],
    "carmen:parityr": ["O", "B"],
  },
  "geometry": {
    "type": "MultiLineString",
    "coordinates": [
      [
        [ -97, 37 ],
        [ -97.2, 37 ],
        [ -97.2, 37.2 ]
      ],
      [
        [ -97.2, 37.2 ],
        [ -97.4, 37.2 ],
        [ -97.4, 37.4 ]
      ]
    ]
  }
}
```


## How does carmen work?

A user searches for

> West Lake View Rd Englewood

How does an appropriately indexed carmen geocoder come up with its results?

For the purpose of this example, we will assume the carmen geocoder is working with the following indexes:

    01 country
    02 region
    03 place
    04 street

### 0. Indexing

The heavy lifting in carmen occurs when indexes are generated. As an index is generated for a datasource carmen tokenizes the text into distinct terms. For example, for a street feature:

    "West Lake View Rd" => ["west", "lake", "view", "rd"]

Each term in the dataset is tallied, generating a frequency index which can be used to determine the relative importance of terms against each other. In this example, because `west` and `rd` are very common terms while `lake` and `view` are comparatively less common the following weights might be assigned:

    west lake view rd
    0.2  0.5  0.2  0.1

The indexer then generates all possible subqueries that might match this feature:

    0.2 west
    0.7 west lake
    0.9 west lake view
    1.0 west lake view rd
    0.5 lake
    0.7 lake view
    0.8 lake view rd
    0.2 view
    0.3 view rd
    0.1 rd

It drops any of the subqueries below a threshold (e.g. 0.4). This will also save bloating our index for phrases like `rd`:

    0.5 lake
    0.7 west lake
    0.7 lake view
    0.8 lake view rd
    0.9 west lake view
    1.0 west lake view rd

Finally the indexer generates degenerates for all these subqueries, making it possible to match using typeahead, like this:

    0.5 l
    0.5 la
    0.5 lak
    0.5 lake
    0.7 w
    0.7 we
    0.7 wes
    0.7 west
    0.7 west l
    0.7 west la
    ...

Finally, the indexer stores the results of all this using `phrase_id` in the `grid` index:

    lake      => [ grid, grid, grid, grid ... ]
    west lake => [ grid, grid, grid, grid ... ]

The `phrase_id` uses the final bit to mark whether the phrase is a "degen" or "complete". e.g

    west lak          0
    west lake         1

Grids encode the following information for each XYZ `x,y` coordinate covered by a feature geometry:

    x            14 bits
    y            14 bits
    feature id   20 bits  (previously 25)
    phrase relev  2 bits  (0 1 2 3 => 0.4, 0.6, 0.8, 1)
    score         3 bits  (0 1 2 3 4 5 6 7)

This is done for both our `01 place` and `02 street` indexes. Now we're ready to search.

### 1. Phrasematch

Ok so what happens at runtime when a user searches?

We take the entire query and break it into all the possible subquery permutations. We then lookup all possible matches in all the indexes for all of these permutations:

> West Lake View Englewood USA

Leads to 15 subquery permutations:

    1  west lake view englewood usa
    2  west lake view englewood
    3  lake view englewood usa
    4  west lake view
    5  lake view englewood
    6  view englewood usa
    7  west lake
    8  lake view
    9  view englewood
    10 englewood usa
    11 west
    12 lake
    13 view
    14 englewood
    15 usa

Once phrasematch results are retrieved any subqueries that didn't match any results are eliminated.

    4  west lake view   11100 street
    7  west lake        11000 street
    8  lake view        01100 street
    11 west             10000 street, place, country
    12 lake             01000 street, place
    13 view             00100 street
    14 englewood        00010 street, place
    15 usa              00001 country

By assigning a bitmask to each subquery representing the positions of the input query it represents we can evaluate all the permutations that *could* be "stacked" to match the input query more completely. We can also calculate a *potential* max relevance score that would result from each permutation if the features matched by these subqueries do indeed stack spatially. Examples:

    4  west lake view   11100 street
    14 englewood        00010 place
    15 usa              00001 country

    potential relev 5/5 query terms = 1

    14 englewood        00010 street
    11 west             10000 place
    15 usa              00001 country

    potential relev 3/5 query terms = 0.6

    etc.

Now we're ready to use the spatial properties of our indexes to see if these textual matches actually line up in space.

### 2. Spatial matching

To make sense of the "result soup" from step 1 -- sometimes thousands of potential resulting features match the same text -- the zxy coordinates in the grid index are used to determine which results overlap in geographic space. This is the `grid` index, which maps phrases to individual feature IDs and their respective zxy coordinates.

    04 street
    ................
    ............x... <== englewood st
    ................
    ...x............
    .......x........ <== west lake view rd
    .........x......
    ................
    ................
    .x..............

    03 place
    ................
    ................
    ................
    .......xx.......
    ......xxxxxx.... <== englewood
    ........xx......
    x...............
    xx..............
    xxxx............ <== west town

Features which overlap in the grid index are candidates to have their subqueries combined. Non-overlapping features are still considered as potential final results, but have no partnering features to combine scores with, leading to a lower total relev.

    4  west lake view   11100 street
    14 englewood        00010 place
    15 usa              00001 country

    All three features stack, relev = 1

    14 englewood        00010 street
    11 west             10000 place
    15 usa              00001 country

    Englewood St does not overlap others, relev = 0.2

The stack of subqueries has has a score of 1.0 if,

1. all query terms are accounted for by features with 1.0 relev in the grid index,
2. no two features are from the same index,
3. no two subqueries have overlapping bitmasks.

### 3. Verify, interpolate

The `grid` index is fast but not 100% accurate. It answers the question "Do features A + B overlap?" with **No/Maybe** -- leaving open the possibility of false positives. The best results from step 4 are now verified by querying real geometries in vector tiles.

Finally, if a geocoding index support *address interpolation*, an initial query token that might represent a housenumber like `350` can be used to interpolate a point position along the line geometry of the matching feature.

### 4. Challenging cases

Most challenging cases are solvable but stress performance/optimization assumptions in the carmen codebase.

#### Continuity of feature hierarchy

    5th st new york

The user intends to match 5th st in New York City with this query. She may, instead, receive equally relevant results that match a 5th st in Albany or any other 5th st in the state of New York. To address this case, carmen introduces a slight penalty for "index gaps" when query matching. Consider the two following query matches:

    04 street   5th st    1100
    03 place    new york  0011

    04 street   5th st    1100
    02 region   new york  0011

Based on score and subquery bitmask both should have a relevance of 1.0. However, because there is a "gap" in the index hierarchy for the second match it receives an extremely small penalty (0.01) -- one that would not affect its standing amongst other scores other than a perfect tie.

Carmen thus *prefers* queries that contain contiguous hierarchy over ones that do not. This works:

    seattle usa => 0.99

But this works better:

    seattle washington => 1.00

### 5. Carmen is more complex

Unfortunately, the carmen codebase is more complex than this explanation.

1. There's more code cleanup, organization, and documentation to do.
2. Indexes are *sharded*, designed for *updates* and hot-swapping with other indexes. This means algorithmic code is sometimes interrupted by lazy loading and other I/O.
3. The use of integer hashes, bitmasks, and other performance optimizations (inlined code rather than function calls) makes it extremely challenging to identify the semantic equivalents in the middle of a geocode.

------

## Dev notes

Some incomplete notes about the Carmen codebase.

### Terminology

* Cache: an object that quickly loads sharded data from JSON or protobuf files
* Source: a Carmen source, such as S3, MBTiles, or memory

### Source structure

```
lib/
  [operations that are exposed in the public ui and do i/o]
  util/
    [algorithmically simple utilities]
  pure/
    [pure algorithms]
```

### Index structure

There are two types of index stores in Carmen.

- `cxxcache` is used for storing the `grid`, and `freq` indexes.
  Each index is sharded and each shard contains a one-to-many
  hash with 64-bit integer keys that map to arrays of arbitrary length
  containing 64-bit integer elements.
- `feature` is used to store feature docs. Each index is sharded and each shard
  contains a one-to-many hash with 32-bit integer keys that map to a bundle of
  features. Each bundle contains feature documents keyed by their original, full
  id.

Unsigned integers are widely used in the Carmen codebase because of their
performance and memory efficiency. To convert arbitrary text (like tokenized
text) to integers the murmur hash is used and sometimes truncated to make room
for additional encoded data.

### freq

Stores a mapping of term frequencies for all docs in an index. Terms are ID'd using a [`murmur`](https://en.wikipedia.org/wiki/MurmurHash) hash.

    term_id => [ count ]

Conceptual exapmle with actual text rather than `murmur` hashes for readability:

    street => [ 103120 ]
    main   => [ 503 ]
    market => [ 31 ]

### grid

Stores a mapping of phrase/phrase degenerate to feature cover grids.

    phrase_id => [ grid, grid, grid, grid ... ]

A lookup against this index effectively answers the question: what and where are all the features that match (whole or partially) a given text phrase?

Grids are encoded as 53-bit integers (largest possible JS integer) storing the following information:

info | bits | description
---- |------|------------
x    | 14   | x tile cover coordinate, up to z14
y    | 14   | y tile cover coordinate, up to z14
relev| 2    | relev between 0.4 and 1.0 (possible values: 0.4, 0.6, 0.8, 1.0)
score| 3    | score scaled to a value between 0-7
id   | 20   | feature id, truncated to 20 bits

### phrase_id

phrase | degen
------ |------
51-1   | 0

The first 51 bits of a phrase ID are the `murmur` hash of the phrase text. The last remaining bit is used to store whether the `phrase_id` is for a complete or degenerate phrase.

### handling non-latin text

Carmen employs a version of the `unidecode` project to normalize all input strings to ASCII prior to being murmur hashed into a phrase (see above). This is useful for removing accents from Latin alphabets: `Köln` and `Koln` match one another post-unidecode. It also provides some limited transliteration capabilities across wider cultural gaps. For instance, `深圳` (Shenzhen) unidecodes to `Shen Zhen`.

However, transliteration increases the potential for collisions between queries. One example is the Canadian province `Alberta`. Its Japanese name is `アルバータ州` which unidecode transforms into `arubataZhou` which has the potential to match queries for `Aruba`.

For this reason, termops examines whether a given piece of text contains characters from the CJK (Chinese/Japanese/Korean) unicode blocks. If the text consists exclusively of such characters, a `z` is prepended to it. If there are any non-CJK characters, an `x` is prepended. This effectively isolates all-CJK tokens from everything else (including tokens that contain CJK characters alongside non-CJK characters).

For clarity and simplicity, the above examples do not include these prepended chars. But in practice a query for `seattle washington` will be tokenized to `xseattle`, `xwashington` and `xseattle washington`.

### geocoder_name, geocoder_type and combining indexes

It is often useful to use multiple indexes to represent a single class of feature. For instance, you might have indexes named `usa-address` and `canada-address`. Such indexes can be grouped together into a combined class of indexes (e.g. `address`) by setting those indexes' `geocoder_name` value to `address`.

It can be desirable to combine indexes using `geocoder_name` but still make them distinguishable by type filtering. For instance, the above `address` grouped index might be accompanied by a point of interest (POI) index, in which case it would be desirable to avoid returning both a POI (e.g. "White House") and a duplicative address feature (e.g. "1600 Pennsylvania Avenue"). This can be achieved by grouping the indexes together using `geocode_name`, as already described.

However, it might _also_ be desirable to distinguish results from these indexes for purposes of filtering and identifying the class of feature in results' `id` field. This distinction can be accomplished by setting `geocoder_type` value of individual indexes that have been grouped with `geocoder_name`. In the above example, the POI and address indexes might share a `geocoder_name` of `address`, but the POI index could have a `geocoder_type` of `poi`.

### type and subtype filtering

The `types` parameter allows query results to be limited to specific classes of features as defined with `geocoder_name`. Using the above example, `address` and `poi` would be valid type filter values.

Subtype filtering allows results from an index to be limited to its highest-scoring members. This can be a useful way of ensuring that queries highlight features of highest importance. For instance, a carsharing company might assign `city` features scores that are assigned in two numeric ranges: cities where the company operates (`current`), and where it has no presence (in descending order). Within each range, features could then be scored by city population, car ownership rates or some other metric. Given a situation like this, and assuming the numeric score ranges are of equal size, a `scoreranges` value on the index tileJSON's `metadata` object could be specified like:

```js
"geocoder_name": "city",
"scoreranges": {
  "operational": [
    0.5,
    1.0
  ]
}
```

With a configuration like this, valid type filters will include `city` and `city.operational`. Specifying both will return the union of features (i.e. it will operate the same way as simply specifying `city`).

The ability to specify more than one score range per index has not yet been implemented.

### multitype features

The `carmen:types` property of a feature allows it to shift between different types while being stored in one source.

```js
{
  "type": "Feature",
  "properties": {
    "carmen:text": "Sparta",
    "carmen:types": [ "country", "city" ]
  }
}
```

In this example the feature Sparta can be returned as either a `country` feature or a `city` feature. Types should be listed in order of ascending preference (last is most preferred).

To use multitype features properly, make sure to set the `geocoder_types` key of the source so that the source is not prematurely excluded from queries when the `types` filter is used.

