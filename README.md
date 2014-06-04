# carmen

[Mapnik vector tile](https://github.com/mapbox/mapnik-vector-tile)-based geocoder with support for swappable data sources.
This is an implementation of some of the concepts of [Error-Correcting Geocoding](http://arxiv.org/abs/1102.3306) by [Dennis Luxen](http://algo2.iti.kit.edu/english/luxen.php).

[![Build Status](https://secure.travis-ci.org/mapbox/carmen.png)](https://travis-ci.org/mapbox/carmen)

## Depends

- Node v0.8.x or Node v0.10.x

## Install

    npm install && ./scripts/install-dbs.sh

Installs dependencies and downloads the default tiles indexes (about 200MB of data).

## Command line

Carmen comes with command line utilities that also act as examples of API usage.

To query the default indexes:

    ./scripts/carmen.js --query="new york"

To analyze an index:

    ./scripts/carmen-analyze.js tiles/01-ne.country.mbtiles

## Example data

Example TM2 projects are available in the `datadev` branch.

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

attribute                  | description
---------------------------|------------
maxzoom                    | The assumed zoom level of the zxy geocoder grid index.
format                     | Optional. If set to `pbf` context operations will make use of vector tiles rather than utf grids.
geocoder_layer             | Optional. A string in the form `layer.field`. `layer` is used to determine what layer to query for context operations. Defaults to the first layer found in a vector source.
geocoder_address           | Optional. A flag (0/1) to indicate that an index can geocode address (house numbers) queries. Defaults to 0.
geocoder_resolution        | Optional. Integer bonus against maxzoom used to increase the grid index resolution when indexing. Defaults to 0.
geocoder_shardlevel        | Optional. An integer order of magnitude that geocoder data is sharded. Defaults to 0.
geocoder_group             | Optional + advanced. For indexes that share the exact same tile source, IO operations can be grouped. No default.
geocoder_tokens            | Optional + advanced. An object with a 1:1 from => to mapping of token strings to replace in input queries. e.g. 'Streets' => 'St'.
geocoder_vector_tolerance  | Optional + advanced. Allows a custom tolerance level around vector tile features for calculating pyramids. Defaults to 50 mercator metres.

### geocode(query, options, callback)

Given a `query` string, call callback with `(err, results)` of possible contexts
represented by that string.

### index(from, to, pointer, callback)

Indexes docs using `from` as the source and `to` as the destination. Options can
be passed to `pointer` or omitted.

### verify(source, callback)

Verify the integrity of index relations for a given source.

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

attribute | description
----------|------------
_id       | An integer ID for this feature.
_zxy      | An array of xyz tile coordinates covered by this feature.
_text     | Text to index for this feature. Synonyms, translations, etc. should be separated using commas.
_center   | An array in the form [lon,lat].
_bbox     | Optional. A bounding box in the form [minx,miny,maxx,maxy].
_score    | Optional. A float or integer to sort equally relevant results by. Higher values appear first.
_geometry | Optional. A geojson geometry object.

### TIGER address interpolation

Carmen has basic support for interpolating geometries based on TIGER address
range data. To make use of this feature the following additional keys must be
present.

attribute | description
----------|------------
_rangetype| The type of range data available. Only possible value atm is 'tiger'.
_geometry | A LineString or MultiLineString geometry object.
_lfromhn  | Single (LineString) or array of values (Multi) of TIGER LFROMHN field.
_ltohn    | Single (LineString) or array of values (Multi) of TIGER LTOHN field.
_rfromhn  | Single (LineString) or array of values (Multi) of TIGER RFROMHN field.
_rtohn    | Single (LineString) or array of values (Multi) of TIGER RTOHN field.
_parityl  | Single (LineString) or array of values (Multi) of TIGER PARITYL field.
_parityr  | Single (LineString) or array of values (Multi) of TIGER PARITYR field.

------

## How does carmen work?

A user searches for

> 350 Fairfax Dr Arlington

How does an appropriately indexed carmen geocoder come up with its results?

For the purpose of this example, we will assume the carmen geocoder is working with four indexes:

    01 country
    02 province
    03 place
    04 street

### 1. Tokenization

    "350 Fairfax Dr Arlington" => ["350", "fairfax", "dr", "arlington"]

    // Other examples
    "Chicago Illinois"         => ["chicago", "illinois"]
    "San José CALIFORNIA"      => ["san", "jose", "california"]
    "SAINT-LOUIS,MO"           => ["saint", "louis", "mo"]

The user input is transformed into a tokenized `query` -- an array of strings that are

- **split** on spaces, dashes, and other splitting punctuation characters,
- **normalized** to remove non-splitting punctuation like apostrophes,
- **lowercased** to make searches case-insensitive,
- **unidecoded** to squash accented characters and avoid subtle unicode mismatches.

The same normalization process is used when creating the search indexes that carmen uses. By normalizing both the indexed text and user queries we can eliminate non-substantive variations in the query and focus on getting real term matches.

*Note: from this point on in carmen there are actually no text strings used. Each token is converted to a 32-bit integer using the FNV-1a hash and any index lookups are done with integer values. The examples below retain string versions of each term and phrase for easy reading.*

### 2. Term matching

The first step in the search process is to identify *terms* in each of the search indexes that match, or may match, one of the query tokens. The `degen` index provides a set of degenerate terms that may match each query token:

**Degen matches for "fairfax"**

    01 country   02 province   03 place     04 street
    ----------   -----------   --------     ---------
    <none>       <none>        fairfax d0   fairfax d0

Each degenerate term entry in the index is mapped to one or more real terms with a *character distance* value for the number of deletions performed to reach the degenerate term. For example, the token "fair" may have the following results:

    "fair" => fairfax d3, fairway d3, fairmont d4, fairfield d5

While each term match is considered, larger character distance values have a negative impact on the eventual relevance of results to ensure that close and exact values win when they are otherwise equivalent to looser term matches.

Currently degenerates are indexed only for the purposes of *autocomplete*. The index structure, however, was designed to be used with "fast similarity search" -- ie. random character deletions -- a feature to be added in future versions.

### 3. Phrase matching

With true term matches for each index on hand we can now lookup all the phrases that include one of the terms:

    01 country                02 province
    ----------                -----------
                              dar'a          1.0 --x-
                              drenthe        1.0 --x-

    03 place                  04 street
    --------                  ---------
    fairfax       1.0 -x--    fairfax dr     1.0 -xx-
    arlington     1.0 ---x    arlington dr   0.9 ---x
                              fairfax ct     0.9 -x--
                              n fairfax st   0.8 -x--
                              fairfax cty rd 0.7 -x--

Matching phrases are drawn from each index for *every* query token. No assumptions are made about what a particular token refers to, leading to results like
[Drenthe](http://en.wikipedia.org/wiki/Drenthe) because `dr` has been indexed as one of its synonyms (its postal code). For tokens to match a phrase some basic rules are followed, like term order + continuity.

    Order + continuity check examples:

    ["dr","arlington"] => arlington dr 0.9 -x
    ["arlington","dr"] => arlington dr 1.0 xx

Each phrase match is assigned a

- **score**, the sum of the weights of matching query terms. Each phrase has a possible score of 1.0 with its component terms contributing varying weights based on their IDF significance -- terms that appear most commonly have lower weights.

        fairfax   cty   rd
        0.7       0.2   0.1

- **reason**, a bitmask storing the query tokens that contributed to the score value.

        350   fairfax   dr   arlington
        0     1         0    0

### 4. Spatial matching

To make sense of the "result soup" from step 3 -- sometimes thousands of potential results of comparable score -- a zxy coordinate index is used to determine which results overlap in geographic space. This is the `grid` index, which maps phrases to individual feature IDs and their respective zxy coordinates.

    04 street
    ................
    ............x...
    ................
    ...x............
    .......x........ <== fairfax dr
    .........x...... <== arlington dr
    ................
    ................
    .x..............

    03 place
    ................
    ................
    ................
    .......xx.......
    ......xxxxxx.... <== arlington
    ........xx......
    x...............
    xx..............
    xxxx............ <== fairfax

Features which overlap in the grid index are candidates to have their scores combined. Non-overlapping features are still considered as potential final results, but have no partnering features to combine scores with.

    1 fairfax dr    1.0 -xx-  =  0.75 -xxx
      arlington     1.0 ---x

    2 n fairfax st  0.8 -x--  =  0.45 -x-x
      arlington     1.0 ---x

    3 arlington dr  0.9 ---x  =  0.25 ---x
      arlington     1.0 ---x

    4 drenthe       1.0 --x-  =  0.25 --x-

The *query match* has a score of 1.0 if,

1. all query terms are accounted for by features with 1.0 scores,
2. no two features are from the same index,
3. no two features have overlapping reason bitmasks,
4. several other heuristics (see "Challenging cases")

### 5. Verify, interpolate

The `grid` index is fast but not 100% accurate. It answers the question "Do features A + B overlap?" with **No/Maybe** -- leaving open the possibility of false positives. The best results from step 4 are now verified by querying real geometries in vector tiles.

Finally, if a geocoding index support *address interpolation*, an initial query token like `350` can be used to interpolate a point position along the line geometry of the matching feature.

### 6. Challenging cases

Most challenging cases are solvable but stress performance/optimization assumptions in the carmen codebase.

#### Repeated query tokens

Prior to `e6522498` the following would occur:

    new york new york =>

    02 place    new york 1.0 xx--
    01 province new york 1.0 xx--

Leading to bitmasks that canceled each other out at query match time. The current workaround for these cases in carmen is to store a *greedy* term position bitmask and a third param -- a count of the number of terms matched:

    new york new york =>

    02 place    new york 1.0 xxxx 2
    01 province new york 1.0 xxxx 2

At query match time the `2` count is decremented until 0 to exhaust the first phrase match, moving onto the province phrase match which has remaining counts to be used against its greedy bitmask.

#### Continuity of feature hierarchy

    5th st new york

The user intends to match 5th st in New York City with this query. She may, instead, receive equally relevant results that match a 5th st in Albany or any other 5th st in the state of New York. To address this case, carmen introduces a slight penalty for "index gaps" when query matching. Consider the two following query matches:

    04 street   5th st   1.0 xx--
    03 place    new york 1.0 --xx

    04 street   5th st   1.0 xx--
    02 province new york 1.0 --xx

Based on score and reason bitmask both should have a querymatch score of 1.0. However, because there is a "gap" in the index hierarchy for the second match it receives an extremely small penalty (0.01) -- one that would not affect its standing amongst other scores other than a perfect tie.

Carmen thus *prefers* queries that contain contiguous hierarchy over ones that do not. This works:

    seattle usa => 0.99

But this works better:

    seattle washington => 1.00

### 7. Carmen is more complex

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

- `cxxcache` is used for storing the `degen`, `term`, `phrase`, `grid`, and
  `freq` indexes. Each index is sharded and each shard contains a one-to-many
  hash with 32-bit integer keys that map to arrays of arbitrary length
  containing 32-bit integer elements.
- `feature` is used to store feature docs. Each index is sharded and each shard
  contains a one-to-many hash with 32-bit integer keys that map to a bundle of
  features. Each bundle contains feature documents keyed by their original, full
  id.

32-bit unsigned integers are widely used in the Carmen codebase because of their
performance, especially in V8 as keys of a hash object. To convert arbitrary
text (like tokenized text) to integers the FNV1a hash is used and sometimes
truncated to make room for additional encoded data.

### term (canonical, degenerate, weighted)

term | extra
-----|------
0-27 | 28-31

The first 28 bits of a term hash determine the canonical ID of a term. The
remaining 4 bits can be used for additional data.

- **Degenerates** are terms with delete operations performed on them. The extra
  4 bits are used to encode the number of delete operations (up to 15 chars)
  performed on the canonical term to result in the degenerate.
- **Weighted** terms are term hashes with weights (0-15) relative to other terms
  in the same phrase. The weights are only relevant in the context of the phrase
  being considered. A weight of 15 signifies the most significant term in the
  phrase with other terms being <= 15.

### phrase

sig term | phrase
---------|-------
0-11     | 12-31

The first 12 bits of a phrase hash are generated from the `fnv1a(str)` hash of
the most significant term (based on IDF of freq index) of a phrase. This scheme
clusters phrases in shards by the term used to query each phrase.


