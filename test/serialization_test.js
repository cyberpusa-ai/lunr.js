suite('serialization', function () {
  setup(function () {
    var documents = [{
      id: 'a',
      title: 'Mr. Green kills Colonel Mustard',
      body: 'Mr. Green killed Colonel Mustard in the study with the candlestick. Mr. Green is not a very nice fellow.',
      wordCount: 19
    },{
      id: 'b',
      title: 'Plumb waters plant',
      body: 'Professor Plumb has a green plant in his study',
      wordCount: 9
    },{
      id: 'c',
      title: 'Scarlett helps Professor',
      body: 'Miss Scarlett watered Professor Plumbs green plant while he was away from his office last week.',
      wordCount: 16
    },{
      id: 'd',
      title: 'All about JavaScript',
      body: 'JavaScript objects have a special __proto__ property',
      wordCount: 7
    }]

    this.idx = lunr(function () {
      this.ref('id')
      this.field('title')
      this.field('body')

      documents.forEach(function (document) {
        this.add(document)
      }, this)
    })

    this.serializedIdx = JSON.stringify(this.idx)
    this.loadedIdx = lunr.Index.load(JSON.parse(this.serializedIdx))
  })

  test('search', function () {
    var idxResults = this.idx.search('green'),
        serializedResults = this.loadedIdx.search('green')

    assert.deepEqual(idxResults, serializedResults)
  })

  test('search pipeline', function () {
    assert.deepEqual(['trimmer', 'stemmer'], JSON.parse(this.serializedIdx).pipeline)
  })

  test('search with trailing punctuation', function () {
    var idxResults = this.idx.search('green?'),
        serializedResults = this.loadedIdx.search('green?')

    assert.lengthOf(idxResults, 3)
    assert.deepEqual(idxResults, serializedResults)
  })

  test('index with stemmer only search pipeline', function () {
    var json = JSON.parse(this.serializedIdx)
    json.pipeline = ['stemmer']

    var oldIdx = lunr.Index.load(json),
        results = oldIdx.query(function (q) {
          q.term('pla', { wildcard: lunr.Query.wildcard.TRAILING })
        })

    assert.lengthOf(oldIdx.search('green?'), 0)
    assert.lengthOf(oldIdx.search('green'), 3)
    assert.lengthOf(results, 2)
  })

  test('serialized postings include every field', function () {
    var invertedIndex = JSON.parse(this.serializedIdx).invertedIndex

    invertedIndex.forEach(function (tuple) {
      assert.property(tuple[1], '_index')
      assert.property(tuple[1], 'title')
      assert.property(tuple[1], 'body')
    })

    assert.deepEqual(this.idx.toJSON(), this.loadedIdx.toJSON())
  })

  test('loading drops empty field postings', function () {
    assert.notProperty(this.loadedIdx.invertedIndex.help, 'body')
    assert.deepProperty(this.loadedIdx.invertedIndex, 'help.title.c')
  })

  test('loading an index with pruned field postings', function () {
    var json = JSON.parse(this.serializedIdx)

    json.invertedIndex.forEach(function (tuple) {
      var posting = tuple[1]

      Object.keys(posting).forEach(function (field) {
        if (field != '_index' && Object.keys(posting[field]).length == 0) {
          delete posting[field]
        }
      })
    })

    var prunedIdx = lunr.Index.load(json)

    assert.deepEqual(this.idx.search('green'), prunedIdx.search('green'))
    assert.deepEqual(this.idx.search('title:kill'), prunedIdx.search('title:kill'))
    assert.deepEqual(this.idx.search('body:kill'), prunedIdx.search('body:kill'))
    assert.deepEqual(this.idx.search('+plant -title:plant'), prunedIdx.search('+plant -title:plant'))
    assert.deepEqual(this.idx.search('pl*'), prunedIdx.search('pl*'))
    assert.deepEqual(this.idx.toJSON(), prunedIdx.toJSON())
  })

  test('__proto__ field serialization', function () {
    var idx = lunr(function () {
      this.ref('id')
      this.field('__proto__')
      this.field('body')
      this.add(JSON.parse('{"id": "a", "__proto__": "green", "body": "plant"}'))
    })

    var json = JSON.parse(JSON.stringify(idx)),
        loadedIdx = lunr.Index.load(json)

    json.invertedIndex.forEach(function (tuple) {
      assert.include(Object.keys(tuple[1]), '__proto__')
    })

    assert.deepEqual(idx.search('green'), loadedIdx.search('green'))
    assert.lengthOf(loadedIdx.search('green'), 1)
  })

  test('__proto__ double serialization', function () {
    var doubleLoadedIdx = lunr.Index.load(JSON.parse(JSON.stringify(this.loadedIdx))),
        idxResults = this.idx.search('__proto__'),
        doubleSerializedResults = doubleLoadedIdx.search('__proto__')

    assert.deepEqual(idxResults, doubleSerializedResults)
  })

  suite('with digits in the terms', function () {
    // Deterministically generates sorted, unique words made of
    // digits plus 'a' and 'b', enough to build node ids with
    // several digits. See #503.
    var generateWords = function (seed, count) {
      var state = seed,
          words = {},
          chars = '0123456789ab'

      var random = function () {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0
        return (state >>> 8) / 16777216
      }

      while (Object.keys(words).length < count) {
        var length = 1 + Math.floor(random() * 9),
            word = ''

        for (var i = 0; i < length; i++) {
          word += chars.charAt(Math.floor(random() * chars.length))
        }

        words[word] = true
      }

      return Object.keys(words).sort()
    }

    setup(function () {
      var words = generateWords(2, 2000)

      this.nextId = lunr.TokenSet._nextId
      lunr.TokenSet._nextId = 1

      this.words = words
      this.idx = lunr(function () {
        this.pipeline.reset()
        this.searchPipeline.reset()
        this.ref('id')
        this.field('body')

        this.add({ id: 'a', body: words.join(' ') })
      })

      this.loadedIdx = lunr.Index.load(JSON.parse(JSON.stringify(this.idx)))
    })

    teardown(function () {
      lunr.TokenSet._nextId = Math.max(this.nextId, lunr.TokenSet._nextId)
    })

    var assertAllWordsFound = function (idx, words) {
      assert.deepEqual(idx.tokenSet.toArray().sort(), words)

      words.forEach(function (word) {
        var results = idx.query(function (q) {
          q.term(word, { usePipeline: false })
        })

        assert.lengthOf(results, 1, word)
      })
    }

    test('every term is found after build', function () {
      assertAllWordsFound(this.idx, this.words)
    })

    test('every term is found after load', function () {
      assertAllWordsFound(this.loadedIdx, this.words)
    })
  })
})
