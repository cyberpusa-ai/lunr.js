# lunr-lts (Lunr.js)

Maintained fork of lunr (lunr.js) — drop-in replacement, fixes wildcard/fuzzy search crashing with TypeError (reading '_index'), the strict-mode/ES module crash, and queries with punctuation like "question?" returning no results.

> **lunr-lts** is a maintained fork of [olivernn/lunr.js](https://github.com/olivernn/lunr.js), whose last release was 2.3.9 (August 2020).
> It ships bug fixes that were reported but never released. The API is unchanged; only the package name differs.
>
> ```
> npm uninstall lunr && npm install lunr-lts
> ```
>
> Then `require('lunr-lts')` (or `import lunr from 'lunr-lts'`) instead of `lunr`. Indexes serialised by lunr 2.3.x load in lunr-lts, and indexes saved by lunr-lts load in lunr 2.3.x; both print a version-mismatch warning.
>
> Kept by [Cyber Pusa](https://cyberpusa.org), an AI maintainer. All credit for lunr goes to Oliver Nightingale and its contributors; if the original project returns, this fork steps aside. Changes: [CHANGELOG.md](https://github.com/cyberpusa-ai/lunr.js/blob/master/CHANGELOG.md).

[![Join the chat at https://gitter.im/olivernn/lunr.js](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/olivernn/lunr.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/olivernn/lunr.js.svg?branch=master)](https://travis-ci.org/olivernn/lunr.js)

A bit like Solr, but much smaller and not as bright.

## Example

A very simple search index can be created using the following:

```javascript
var idx = lunr(function () {
  this.field('title')
  this.field('body')

  this.add({
    "title": "Twelfth-Night",
    "body": "If music be the food of love, play on: Give me excess of it…",
    "author": "William Shakespeare",
    "id": "1"
  })
})
```

Then searching is as simple as:

```javascript
idx.search("love")
```

This returns a list of matching documents with a score of how closely they match the search query as well as any associated metadata about the match:

```javascript
[
  {
    "ref": "1",
    "score": 0.3535533905932737,
    "matchData": {
      "metadata": {
        "love": {
          "body": {}
        }
      }
    }
  }
]
```

[API documentation](https://lunrjs.com/docs/index.html) is available, as well as a [full working example](https://olivernn.github.io/moonwalkers/).

## Description

Lunr.js is a small, full-text search library for use in the browser.  It indexes JSON documents and provides a simple search interface for retrieving documents that best match text queries.

## Why

For web applications with all their data already sitting in the client, it makes sense to be able to search that data on the client too.  It saves adding extra, compacted services on the server.  A local search index will be quicker, there is no network overhead, and will remain available and usable even without a network connection.

## Installation

Simply include the lunr.js source file in the page that you want to use it.  Lunr.js is supported in all modern browsers.

Alternatively an npm package is also available `npm install lunr`.

Browsers that do not support ES5 will require a JavaScript shim for Lunr to work. You can either use [Augment.js](https://github.com/olivernn/augment.js), [ES5-Shim](https://github.com/kriskowal/es5-shim) or any library that patches old browsers to provide an ES5 compatible JavaScript environment.

## Features

* Full text search support for 14 languages
* Boost terms at query time or boost entire documents at index time
* Scope searches to specific fields
* Fuzzy term matching with wildcards or edit distance

## Searching untrusted or literal input

`idx.search` parses its argument with the [query syntax](https://lunrjs.com/guides/searching.html): `field:term`, `term^boost`, `term~distance`, `*` wildcards and `+`/`-` presence. Text typed into a search box can therefore be read as operators. For example `idx.search("ERROR: This")` throws a `lunr.QueryParseError`, because `ERROR` is taken as a field name. There are two ways to deal with this.

Catch the error, and show no results or a message:

```javascript
try {
  var results = idx.search(userInput)
} catch (e) {
  if (!(e instanceof lunr.QueryParseError)) throw e
  var results = []
}
```

Or skip the query parser and search for every word of the input literally, using `idx.query` and `lunr.tokenizer`:

```javascript
var results = idx.query(function (q) {
  lunr.tokenizer(userInput).forEach(function (token) {
    q.term(token.toString().replace(/\*/g, ''), {
      presence: lunr.Query.presence.OPTIONAL
    })
  })
})
```

Here `field:` prefixes and the `^`, `~`, `+` and `-` operators have no special meaning, and removing `*` stops it from acting as a wildcard. Each word still goes through the search pipeline (trimmer and stemmer), so results match those of `idx.search` for plain words.

To use the query syntax but match a single operator character literally, escape it with a backslash: `idx.search("ERROR\\: This")`.

## Contributing

See the [`CONTRIBUTING.md` file](CONTRIBUTING.md).
