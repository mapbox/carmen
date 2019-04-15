[![Build Status](https://travis-ci.org/mapbox/carmen.svg?branch=master)](https://travis-ci.org/mapbox/carmen)

[![codecov](https://codecov.io/gh/mapbox/carmen/branch/master/graph/badge.svg)](https://codecov.io/gh/mapbox/carmen)

# carmen

[Mapnik vector tile](https://github.com/mapbox/mapnik-vector-tile)-based geocoder with support for swappable data sources.
This is an implementation of some of the concepts of [Error-Correcting Geocoding](http://arxiv.org/abs/1102.3306) by [Dennis Luxen](http://algo2.iti.kit.edu/english/luxen.php).

## Depends

- Node v8.x.x
- [mapbox/node-fuzzy-phrase](https://github.com/mapbox/node-fuzzy-phrase)
- [mapbox/carmen-cache](https://github.com/mapbox/carmen-cache)

## Install

    npm install

Carmen no longer ships with any default or sample data. Sample data will be provided in a future release.

## API

For a simplified example of using the carmen API, see [the `example` folder](./example) in this repository.

For more detail about specific elements of the API (and how to use them directly), see the [API Docs](./docs/api.md).

## Command-line scripts
Carmen comes with command line utilities that also act as examples of API usage.

To query the default indexes:

    ./bin/carmen-index.js --query="new york"

To analyze an index:

    ./bin/carmen-analyze.js tiles/01-ne.country.mbtiles

## Documentation

Carmen documentation has three parts:

- [General documentation](#general-documentation)
- [An example project](#example-project)
- [API documentation](#api-documentation)

### General Documentation

Topic-based documentation is located in the [`docs`](./docs) directory, organized by topic. These documents are meant to cover high-level design or architectural concepts rather than the code itself. It also includes a glossary of frequently-used vocabulary.

### Example Project

The example project is located in the [`example`](./example) directory. It is a step-by-step, annotated tutorial for basic usage of carmen.

### API Documentation

API documentation is written as [JSDoc comments](http://usejsdoc.org/) in the source code. It is also available as a markdown-formatted document: [`docs/api.md`](./docs/api.md). This document is generated using [documentationjs](http://documentation.js.org/), and should be updated after any JSDoc comment changes:

```bash
yarn build-docs
```

#### API Documentation Style Guide

* Classes, methods, events, and anything else must be documented with JSDoc comments.
* Text within JSDoc comments may use markdown formatting. Code identifiers must be surrounded by \`backticks\`.
* Documentation must be written in grammatically correct sentences ending with periods.
* Documentation descriptions must contain more information than what is obvious from the identifier and JSDoc metadata.
* Class descriptions should describe what the class *is*, or what its instances *are*. They do not document the constructor, but the class. They should begin with either a complete sentence or a phrase that would complete a sentence beginning with "A `T` is..." or "The `T` class is..." Examples: "Lists are ordered indexed dense collections." "A class used for asynchronous computations."
* Function descriptions should begin with a third person singular present tense verb, as if completing a sentence beginning with "This function..." If the primary purpose of the function is to return a value, the description should begin with "Returns..." Examples: "Returns the layer with the specified id." "Sets the map's center point."
* `@param`, `@property`, and `@returns` descriptions should be capitalized and end with a period. They should begin as if completing a sentence beginning with "This is..." or "This..."
* Functions that do not return a value (return `undefined`), should not have a `@returns` annotation.
* Member descriptions should document what a member represents or gets and sets. They should also indicate whether the member is read-only.
* Event descriptions should begin with "Fired when..." and so should describe when the event fires. Event entries should clearly document any data passed to the handler, with a link to MDN documentation of native Event objects when applicable.


