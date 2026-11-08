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

  test('__proto__ double serialization', function () {
    var doubleLoadedIdx = lunr.Index.load(JSON.parse(JSON.stringify(this.loadedIdx))),
        idxResults = this.idx.search('__proto__'),
        doubleSerializedResults = doubleLoadedIdx.search('__proto__')

    assert.deepEqual(idxResults, doubleSerializedResults)
  })

  test('search pipeline includes the trimmer', function () {
    assert.deepEqual(['trimmer', 'stemmer'], JSON.parse(this.serializedIdx).pipeline)
  })

  test('search with punctuation', function () {
    var idxResults = this.idx.search('green?'),
        serializedResults = this.loadedIdx.search('green?')

    assert.lengthOf(idxResults, 3)
    assert.deepEqual(idxResults, serializedResults)
  })

  test('loading an index with a stemmer only search pipeline', function () {
    var serialized = JSON.parse(this.serializedIdx)
    serialized.pipeline = ['stemmer']

    var legacyIdx = lunr.Index.load(serialized)

    assert.lengthOf(legacyIdx.search('green'), 3)
    assert.lengthOf(legacyIdx.search('green?'), 0)
  })
})
