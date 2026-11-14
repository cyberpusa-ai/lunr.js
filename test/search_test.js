suite('search', function () {
  setup(function () {
    this.documents = [{
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
    }]
  })

  suite('with build-time field boosts', function () {
    setup(function () {
      var self = this

      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')
        this.field('body', { boost: 10 })

        self.documents.forEach(function (document) {
          this.add(document)
        }, this)
      })
    })

    suite('no query boosts', function () {
      var assertions = function () {
        test('document b ranks highest', function () {
          assert.equal('b', this.results[0].ref)
        })
      }

      suite('#search', function () {
        setup(function () {
          this.results = this.idx.search('professor')
        })

        assertions()
      })

      suite('#query', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('professor')
          })
        })

        assertions()
      })
    })
  })

  suite('with build-time document boost', function () {
    setup(function () {
      var self = this

      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')
        this.field('body')

        self.documents.forEach(function (document) {
          var boost = document.id == 'c' ? 10 : 1
          this.add(document, { boost: boost })
        }, this)
      })
    })

    suite('no query boost', function () {
      var assertions = function () {
        test('document c ranks highest', function () {
          assert.equal('c', this.results[0].ref)
        })
      }

      suite('#search', function () {
        setup(function () {
          this.results = this.idx.search('plumb')
        })

        assertions()
      })

      suite('#query', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('plumb')
          })
        })

        assertions()
      })
    })

    suite('with query boost', function () {
      var assertions = function () {
        test('document b ranks highest', function () {
          assert.equal('b', this.results[0].ref)
        })
      }

      suite('#search', function () {
        setup(function () {
          this.results = this.idx.search('green study^10')
        })

        assertions()
      })

      suite('#query', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('green')
            q.term('study', { boost: 10 })
          })
        })

        assertions()
      })
    })
  })

  suite('without build-time boosts', function () {
    setup(function () {
      var self = this

      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')
        this.field('body')

        self.documents.forEach(function (document) {
          this.add(document)
        }, this)
      })
    })

    suite('single term search', function () {
      suite('one match', function () {
        var assertions = function () {
          test('one result returned', function () {
            assert.lengthOf(this.results, 1)
          })

          test('document c matches', function () {
            assert.equal('c', this.results[0].ref)
          })

          test('matching term', function () {
            assert.sameMembers(['scarlett'], Object.keys(this.results[0].matchData.metadata))
          })
        }

        suite('#seach', function () {
          setup(function () {
            this.results = this.idx.search('scarlett')
          })

          assertions()
        })

        suite('#query', function () {
          setup(function () {
            this.results = this.idx.query(function (q) {
              q.term('scarlett')
            })
          })

          assertions()
        })
      })

      suite('no match', function () {
        setup(function () {
          this.results = this.idx.search('foo')
        })

        test('no matches', function () {
          assert.lengthOf(this.results, 0)
        })
      })

      suite('multiple matches', function () {
        setup(function () {
          this.results = this.idx.search('plant')
        })

        test('has two matches', function () {
          assert.lengthOf(this.results, 2)
        })

        test('sorted by relevance', function () {
          assert.equal('b', this.results[0].ref)
          assert.equal('c', this.results[1].ref)
        })
      })

      suite('pipeline processing', function () {
        // study would be stemmed to studi, tokens
        // are stemmed by default on index and must
        // also be stemmed on search to match
        suite('enabled (default)', function () {
          setup(function () {
            this.results = this.idx.query(function (q) {
              q.clause({term: 'study', usePipeline: true})
            })
          })

          test('has two matches', function () {
            assert.lengthOf(this.results, 2)
          })

          test('sorted by relevance', function () {
            assert.equal('b', this.results[0].ref)
            assert.equal('a', this.results[1].ref)
          })
        })

        suite('disabled', function () {
          setup(function () {
            this.results = this.idx.query(function (q) {
              q.clause({term: 'study', usePipeline: false})
            })
          })

          test('no matches', function () {
            assert.lengthOf(this.results, 0)
          })
        })
      })
    })

    suite('multiple terms', function () {
      suite('all terms match', function () {
        setup(function () {
          this.results = this.idx.search('fellow candlestick')
        })

        test('has one match', function () {
          assert.lengthOf(this.results, 1)
        })

        test('correct document returned', function () {
          assert.equal('a', this.results[0].ref)
        })

        test('matched terms returned', function () {
          assert.sameMembers(['fellow', 'candlestick'], Object.keys(this.results[0].matchData.metadata))
          assert.sameMembers(['body'], Object.keys(this.results[0].matchData.metadata['fellow']));
          assert.sameMembers(['body'], Object.keys(this.results[0].matchData.metadata['candlestick']));
        })
      })

      suite('one term matches', function () {
        setup(function () {
          this.results = this.idx.search('week foo')
        })

        test('has one match', function () {
          assert.lengthOf(this.results, 1)
        })

        test('correct document returned', function () {
          assert.equal('c', this.results[0].ref)
        })

        test('only matching terms returned', function () {
          assert.sameMembers(['week'], Object.keys(this.results[0].matchData.metadata))
        })
      })

      suite('duplicate query terms', function () {
        // https://github.com/olivernn/lunr.js/issues/256
        // previously this would throw a duplicate index error
        // because the query vector already contained an entry
        // for the term 'fellow'
        test('no errors', function () {
          var idx = this.idx
          assert.doesNotThrow(function () {
            idx.search('fellow candlestick foo bar green plant fellow')
          })
        })
      })

      suite('documents with all terms score higher', function () {
        setup(function () {
          this.results = this.idx.search('candlestick green')
        })

        test('has three matches', function () {
          assert.lengthOf(this.results, 3)
        })

        test('correct documents returned', function () {
          var matchingDocuments = this.results.map(function (r) {
            return r.ref
          })
          assert.sameMembers(['a', 'b', 'c'], matchingDocuments)
        })

        test('documents with all terms score highest', function () {
          assert.equal('a', this.results[0].ref)
        })

        test('matching terms are returned', function () {
          assert.sameMembers(['candlestick', 'green'], Object.keys(this.results[0].matchData.metadata))
          assert.sameMembers(['green'], Object.keys(this.results[1].matchData.metadata))
          assert.sameMembers(['green'], Object.keys(this.results[2].matchData.metadata))
        })
      })

      suite('no terms match', function () {
        setup(function () {
          this.results = this.idx.search('foo bar')
        })

        test('no matches', function () {
          assert.lengthOf(this.results, 0)
        })
      })

      suite('corpus terms are stemmed', function () {
        setup(function () {
          this.results = this.idx.search('water')
        })

        test('matches two documents', function () {
          assert.lengthOf(this.results, 2)
        })

        test('matches correct documents', function () {
          var matchingDocuments = this.results.map(function (r) {
            return r.ref
          })
          assert.sameMembers(['b', 'c'], matchingDocuments)
        })
      })

      suite('field scoped terms', function () {
        suite('only matches on scoped field', function () {
          setup(function () {
            this.results = this.idx.search('title:plant')
          })

          test('one result returned', function () {
            assert.lengthOf(this.results, 1)
          })

          test('returns the correct document', function () {
            assert.equal('b', this.results[0].ref)
          })

          test('match data', function () {
            assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
          })
        })

        suite('no matching terms', function () {
          setup(function () {
            this.results = this.idx.search('title:candlestick')
          })

          test('no results returned', function () {
            assert.lengthOf(this.results, 0)
          })
        })
      })

      suite('wildcard matching', function () {
        suite('trailing wildcard', function () {
          suite('no matches', function () {
            setup(function () {
              this.results = this.idx.search('fo*')
            })

            test('no results returned', function () {
              assert.lengthOf(this.results, 0)
            })
          })

          suite('one match', function () {
            setup(function () {
              this.results = this.idx.search('candle*')
            })

            test('one result returned', function () {
              assert.lengthOf(this.results, 1)
            })

            test('correct document matched', function () {
              assert.equal('a', this.results[0].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['candlestick'], Object.keys(this.results[0].matchData.metadata))
            })
          })

          suite('multiple terms match', function () {
            setup(function () {
              this.results = this.idx.search('pl*')
            })

            test('two results returned', function () {
              assert.lengthOf(this.results, 2)
            })

            test('correct documents matched', function () {
              var matchingDocuments = this.results.map(function (r) {
                return r.ref
              })
              assert.sameMembers(['b', 'c'], matchingDocuments)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['plumb', 'plant'], Object.keys(this.results[0].matchData.metadata))
              assert.sameMembers(['plumb', 'plant'], Object.keys(this.results[1].matchData.metadata))
            })
          })
        })
      })
    })

    suite('trailing punctuation', function () {
      setup(function () {
        this.results = this.idx.search('green? plant!')
      })

      test('punctuation is trimmed from query terms', function () {
        assert.lengthOf(this.results, 3)
      })

      test('matching terms returned', function () {
        assert.sameMembers(['green', 'plant'], Object.keys(this.results[0].matchData.metadata))
      })
    })

    suite('programmatic wildcards with pipeline', function () {
      suite('trailing wildcard', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('pla', { wildcard: lunr.Query.wildcard.TRAILING })
          })
        })

        test('wildcard is kept', function () {
          assert.lengthOf(this.results, 2)
          assert.sameMembers(['b', 'c'], this.results.map(function (r) { return r.ref }))
        })

        test('matching terms returned', function () {
          assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
        })
      })

      suite('leading wildcard', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('ant', { wildcard: lunr.Query.wildcard.LEADING })
          })
        })

        test('wildcard is kept', function () {
          assert.lengthOf(this.results, 2)
          assert.sameMembers(['b', 'c'], this.results.map(function (r) { return r.ref }))
        })
      })

      suite('leading wildcard with stemmed term', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('plants', { wildcard: lunr.Query.wildcard.LEADING })
          })
        })

        test('term is stemmed and wildcard is kept', function () {
          assert.lengthOf(this.results, 2)
          assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
        })
      })

      suite('leading and trailing wildcard', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term('lan', {
              wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING
            })
          })
        })

        test('both wildcards are kept', function () {
          assert.lengthOf(this.results, 2)
          assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
        })
      })
    })

    suite('wildcard matching', function () {
      suite('trailing wildcard', function () {
        suite('no matches found', function () {
          setup(function () {
            this.results = this.idx.search('fo*')
          })

          test('no results returned', function () {
            assert.lengthOf(this.results, 0)
          })
        })

        suite('results found', function () {
          setup(function () {
            this.results = this.idx.search('pl*')
          })

          test('two results returned', function () {
            assert.lengthOf(this.results, 2)
          })

          test('matching documents returned', function () {
            assert.equal('b', this.results[0].ref)
            assert.equal('c', this.results[1].ref)
          })

          test('matching terms returned', function () {
            assert.sameMembers(['plant', 'plumb'], Object.keys(this.results[0].matchData.metadata))
            assert.sameMembers(['plant', 'plumb'], Object.keys(this.results[1].matchData.metadata))
          })
        })
      })

      suite('leading wildcard', function () {
        suite('no results found', function () {
          setup(function () {
            this.results = this.idx.search('*oo')
          })

          test('no results found', function () {
            assert.lengthOf(this.results, 0)
          })
        })

        suite('results found', function () {
          setup(function () {
            this.results = this.idx.search('*ant')
          })

          test('two results found', function () {
            assert.lengthOf(this.results, 2)
          })

          test('matching documents returned', function () {
            assert.equal('b', this.results[0].ref)
            assert.equal('c', this.results[1].ref)
          })

          test('matching terms returned', function () {
            assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
            assert.sameMembers(['plant'], Object.keys(this.results[1].matchData.metadata))
          })
        })
      })

      suite('contained wildcard', function () {
        suite('no results found', function () {
          setup(function () {
            this.results = this.idx.search('f*o')
          })

          test('no results found', function () {
            assert.lengthOf(this.results, 0)
          })
        })

        suite('results found', function () {
          setup(function () {
            this.results = this.idx.search('pl*nt')
          })

          test('two results found', function () {
            assert.lengthOf(this.results, 2)
          })

          test('matching documents returned', function () {
            assert.equal('b', this.results[0].ref)
            assert.equal('c', this.results[1].ref)
          })

          test('matching terms returned', function () {
            assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
            assert.sameMembers(['plant'], Object.keys(this.results[1].matchData.metadata))
          })
        })
      })
    })

    suite('edit distance', function () {
      suite('no results found', function () {
        setup(function () {
          this.results = this.idx.search('foo~1')
        })

        test('no results returned', function () {
          assert.lengthOf(this.results, 0)
        })
      })

      suite('results found', function () {
        setup(function () {
          this.results = this.idx.search('plont~1')
        })

        test('two results found', function () {
          assert.lengthOf(this.results, 2)
        })

        test('matching documents returned', function () {
          assert.equal('b', this.results[0].ref)
          assert.equal('c', this.results[1].ref)
        })

        test('matching terms returned', function () {
          assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
          assert.sameMembers(['plant'], Object.keys(this.results[1].matchData.metadata))
        })
      })
    })

    suite('searching by field', function () {
      suite('unknown field', function () {
        test('throws lunr.QueryParseError', function () {
          assert.throws(function () {
            this.idx.search('unknown-field:plant')
          }.bind(this), lunr.QueryParseError)
        })
      })

      suite('no results found', function () {
        setup(function () {
          this.results = this.idx.search('title:candlestick')
        })

        test('no results found', function () {
          assert.lengthOf(this.results, 0)
        })
      })

      suite('results found', function () {
        setup(function () {
          this.results = this.idx.search('title:plant')
        })

        test('one results found', function () {
          assert.lengthOf(this.results, 1)
        })

        test('matching documents returned', function () {
          assert.equal('b', this.results[0].ref)
        })

        test('matching terms returned', function () {
          assert.sameMembers(['plant'], Object.keys(this.results[0].matchData.metadata))
        })
      })
    })

    suite('term boosts', function () {
      suite('no results found', function () {
        setup(function () {
          this.results = this.idx.search('foo^10')
        })

        test('no results found', function () {
          assert.lengthOf(this.results, 0)
        })
      })

      suite('results found', function () {
        setup(function () {
          this.results = this.idx.search('scarlett candlestick^5')
        })

        test('two results found', function () {
          assert.lengthOf(this.results, 2)
        })

        test('matching documents returned', function () {
          assert.equal('a', this.results[0].ref)
          assert.equal('c', this.results[1].ref)
        })

        test('matching terms returned', function () {
          assert.sameMembers(['candlestick'], Object.keys(this.results[0].matchData.metadata))
          assert.sameMembers(['scarlett'], Object.keys(this.results[1].matchData.metadata))
        })
      })
    })

    suite('typeahead style search', function () {
      suite('no results found', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term("xyz", { boost: 100, usePipeline: true })
            q.term("xyz", { boost: 10, usePipeline: false, wildcard: lunr.Query.wildcard.TRAILING })
            q.term("xyz", { boost: 1, editDistance: 1 })
          })
        })

        test('no results found', function () {
          assert.lengthOf(this.results, 0)
        })
      })

      suite('results found', function () {
        setup(function () {
          this.results = this.idx.query(function (q) {
            q.term("pl", { boost: 100, usePipeline: true })
            q.term("pl", { boost: 10, usePipeline: false, wildcard: lunr.Query.wildcard.TRAILING })
            q.term("pl", { boost: 1, editDistance: 1 })
          })
        })

        test('two results found', function () {
          assert.lengthOf(this.results, 2)
        })

        test('matching documents returned', function () {
          assert.equal('b', this.results[0].ref)
          assert.equal('c', this.results[1].ref)
        })

        test('matching terms returned', function () {
          assert.sameMembers(['plumb', 'plant'], Object.keys(this.results[0].matchData.metadata))
          assert.sameMembers(['plumb', 'plant'], Object.keys(this.results[1].matchData.metadata))
        })
      })
    })

    suite('term presence', function () {
      suite('prohibited', function () {
        suite('match', function () {
          var assertions = function () {
            test('two results found', function () {
              assert.lengthOf(this.results, 2)
            })

            test('matching documents returned', function () {
              assert.equal('b', this.results[0].ref)
              assert.equal('c', this.results[1].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['green'], Object.keys(this.results[0].matchData.metadata))
              assert.sameMembers(['green'], Object.keys(this.results[1].matchData.metadata))
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('candlestick', { presence: lunr.Query.presence.PROHIBITED })
                q.term('green', { presence: lunr.Query.presence.OPTIONAL })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('-candlestick green')
            })

            assertions()
          })
        })

        suite('no match', function () {
          var assertions = function () {
            test('no matches', function () {
              assert.lengthOf(this.results, 0)
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('green', { presence: lunr.Query.presence.PROHIBITED })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('-green')
            })

            assertions()
          })
        })

        suite('negated query no match', function () {
          var assertions = function () {
            test('all documents returned', function () {
              assert.lengthOf(this.results, 3)
            })

            test('all results have same score', function () {
              assert.isTrue(this.results.every(function (r) { return r.score === 0 }))
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('qwertyuiop', { presence: lunr.Query.presence.PROHIBITED })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search("-qwertyuiop")
            })

            assertions()
          })
        })

        suite('negated query some match', function () {
          var assertions = function () {
            test('all documents returned', function () {
              assert.lengthOf(this.results, 1)
            })

            test('all results have same score', function () {
              assert.isTrue(this.results.every(function (r) { return r.score === 0 }))
            })

            test('matching documents returned', function () {
              assert.equal('a', this.results[0].ref)
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('plant', { presence: lunr.Query.presence.PROHIBITED })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search("-plant")
            })

            assertions()
          })
        })

        suite('field match', function () {
          var assertions = function () {
            test('one result found', function () {
              assert.lengthOf(this.results, 1)
            })

            test('matching documents returned', function () {
              assert.equal('c', this.results[0].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['plumb'], Object.keys(this.results[0].matchData.metadata))
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('plant', { presence: lunr.Query.presence.PROHIBITED, fields: ['title'] })
                q.term('plumb', { presence: lunr.Query.presence.OPTIONAL })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('-title:plant plumb')
            })

            assertions()
          })
        })
      })

      suite('required', function () {
        suite('match', function () {
          var assertions = function () {
            test('one result found', function () {
              assert.lengthOf(this.results, 1)
            })

            test('matching documents returned', function () {
              assert.equal('a', this.results[0].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['candlestick', 'green'], Object.keys(this.results[0].matchData.metadata))
            })
          }

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search("+candlestick green")
            })

            assertions()
          })

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('candlestick', { presence: lunr.Query.presence.REQUIRED })
                q.term('green', { presence: lunr.Query.presence.OPTIONAL })
              })
            })

            assertions()
          })
        })

        suite('no match', function () {
          var assertions = function () {
            test('no matches', function () {
              assert.lengthOf(this.results, 0)
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('mustard', { presence: lunr.Query.presence.REQUIRED })
                q.term('plant', { presence: lunr.Query.presence.REQUIRED })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('+mustard +plant')
            })

            assertions()
          })
        })

        suite('no matching term', function () {
          var assertions = function () {
            test('no matches', function () {
              assert.lengthOf(this.results, 0)
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('qwertyuiop', { presence: lunr.Query.presence.REQUIRED })
                q.term('green', { presence: lunr.Query.presence.OPTIONAL })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('+qwertyuiop green')
            })

            assertions()
          })
        })

        suite('field match', function () {
          var assertions = function () {
            test('one result found', function () {
              assert.lengthOf(this.results, 1)
            })

            test('matching documents returned', function () {
              assert.equal('b', this.results[0].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['plant', 'green'], Object.keys(this.results[0].matchData.metadata))
            })
          }

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('plant', { presence: lunr.Query.presence.REQUIRED, fields: ['title'] })
                q.term('green', { presence: lunr.Query.presence.OPTIONAL })
              })
            })

            assertions()
          })

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('+title:plant green')
            })

            assertions()
          })
        })

        suite('field and non field match', function () {
          var assertions = function () {
            test('one result found', function () {
              assert.lengthOf(this.results, 1)
            })

            test('matching documents returned', function () {
              assert.equal('b', this.results[0].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['plant', 'green'], Object.keys(this.results[0].matchData.metadata))
            })
          }

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('+title:plant +green')
            })

            assertions()
          })

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('plant', { fields: ['title'], presence: lunr.Query.presence.REQUIRED })
                q.term('green', { presence: lunr.Query.presence.REQUIRED })
              })
            })

            assertions()
          })
        })

        suite('different fields', function () {
          var assertions = function () {
            test('one result found', function () {
              assert.lengthOf(this.results, 1)
            })

            test('matching documents returned', function () {
              assert.equal('b', this.results[0].ref)
            })

            test('matching terms returned', function () {
              assert.sameMembers(['studi', 'plant'], Object.keys(this.results[0].matchData.metadata))
            })
          }

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('+title:plant +body:study')
            })

            assertions()
          })

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('plant', { fields: ['title'], presence: lunr.Query.presence.REQUIRED })
                q.term('study', { fields: ['body'], presence: lunr.Query.presence.REQUIRED })
              })
            })

            assertions()
          })
        })

        suite('different fields one without match', function () {
          var assertions = function () {
            test('no matches', function () {
              assert.lengthOf(this.results, 0)
            })
          }

          suite('#search', function () {
            setup(function () {
              this.results = this.idx.search('+title:plant +body:qwertyuiop')
            })

            assertions()
          })

          suite('#query', function () {
            setup(function () {
              this.results = this.idx.query(function (q) {
                q.term('plant', { fields: ['title'], presence: lunr.Query.presence.REQUIRED })
                q.term('qwertyuiop', { fields: ['body'], presence: lunr.Query.presence.REQUIRED })
              })
            })

            assertions()
          })
        })
      })

      suite('combined', function () {
        var assertions = function () {
          test('one result found', function () {
            assert.lengthOf(this.results, 1)
          })

          test('matching documents returned', function () {
            assert.equal('b', this.results[0].ref)
          })

          test('matching terms returned', function () {
            assert.sameMembers(['plant', 'green'], Object.keys(this.results[0].matchData.metadata))
          })
        }

        suite('#query', function () {
          setup(function () {
            this.results = this.idx.query(function (q) {
              q.term('plant', { presence: lunr.Query.presence.REQUIRED })
              q.term('green', { presence: lunr.Query.presence.OPTIONAL })
              q.term('office', { presence: lunr.Query.presence.PROHIBITED })
            })
          })

          assertions()
        })

        suite('#search', function () {
          setup(function () {
            this.results = this.idx.search('+plant green -office')
          })

          assertions()
        })

      })
    })
  })

  suite('with a custom tokenizer separator', function () {
    setup(function () {
      this.originalSeparator = lunr.tokenizer.separator
      lunr.tokenizer.separator = /\s+/

      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')

        this.add({ id: 'a', title: 'foo-bar baz' })
        this.add({ id: 'b', title: 'foo bar' })
      })
    })

    teardown(function () {
      lunr.tokenizer.separator = this.originalSeparator
    })

    test('hyphenated term is found', function () {
      var results = this.idx.search('foo-bar')
      assert.lengthOf(results, 1)
      assert.equal('a', results[0].ref)
    })
  })

  suite('with a token set term missing from the inverted index', function () {
    setup(function () {
      var built = lunr(function () {
        this.ref('id')
        this.field('title')

        this.add({ id: 'a', title: 'green plant' })
      })

      this.idx = new lunr.Index({
        invertedIndex: built.invertedIndex,
        fieldVectors: built.fieldVectors,
        tokenSet: lunr.TokenSet.fromArray(['green', 'greenhous', 'plant']),
        fields: built.fields,
        pipeline: built.pipeline
      })
    })

    test('wildcard search does not throw', function () {
      var results = this.idx.search('green*')
      assert.lengthOf(results, 1)
      assert.equal('a', results[0].ref)
    })

    test('fuzzy search does not throw', function () {
      var results = this.idx.search('greenhouse~1')
      assert.lengthOf(results, 0)
    })

    test('required term search does not throw', function () {
      var results = this.idx.search('+greenhouse')
      assert.lengthOf(results, 0)
    })

    test('term missing a field from its posting does not throw', function () {
      delete this.idx.invertedIndex['green'].title

      var results = this.idx.search('+title:green plant')
      assert.lengthOf(results, 0)
    })
  })

  suite('with a pipeline returning several terms for a clause', function () {
    setup(function () {
      var self = this

      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')

        this.add({ id: 'a', title: 'green' })
        this.add({ id: 'b', title: 'plant' })
      })

      this.idx.pipeline = new lunr.Pipeline
      this.idx.pipeline.add(function (token) {
        return token.toString() == 'greenplant'
          ? [token.clone(function () { return 'green' }), token.clone(function () { return 'plant' })]
          : token
      })

      this.results = this.idx.query(function (q) {
        q.term('greenplant')
        self.clause = q.clauses[0]
      })
    })

    test('every term is searched', function () {
      assert.sameMembers(['a', 'b'], this.results.map(function (r) { return r.ref }))
    })

    test('the query clause is not mutated', function () {
      assert.equal('greenplant', this.clause.term)
    })
  })

  suite('searching untrusted or literal input', function () {
    setup(function () {
      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')
        this.field('body')

        this.add({ id: 'a', title: 'Build log', body: 'ERROR: This build failed' })
        this.add({ id: 'b', title: 'Release notes', body: 'Nothing failed in this release' })
      })

      // the literal search recipe documented in README.md
      this.literalSearch = function (userInput) {
        return this.idx.query(function (q) {
          lunr.tokenizer(userInput).forEach(function (token) {
            q.term(token.toString().replace(/\*/g, ''), {
              presence: lunr.Query.presence.OPTIONAL
            })
          })
        })
      }
    })

    test('search treats an unknown field prefix as a parse error', function () {
      var idx = this.idx

      assert.throws(function () {
        idx.search('ERROR: This')
      }, lunr.QueryParseError)
    })

    test('an escaped colon is searched literally', function () {
      var results = this.idx.search('ERROR\\: This')

      assert.deepEqual(['a'], results.map(function (r) { return r.ref }))
    })

    test('a field prefix is searched literally', function () {
      var results = this.literalSearch('ERROR: This')

      assert.deepEqual(['a'], results.map(function (r) { return r.ref }))
      assert.property(results[0].matchData.metadata, 'error')
    })

    test('the search pipeline still runs', function () {
      var results = this.literalSearch('Builds')

      assert.deepEqual(['a'], results.map(function (r) { return r.ref }))
    })

    test('presence operators are ignored', function () {
      var results = this.literalSearch('+release -failed')

      assert.sameMembers(['a', 'b'], results.map(function (r) { return r.ref }))
    })

    test('a wildcard is not expanded', function () {
      assert.lengthOf(this.literalSearch('*'), 0)
      assert.lengthOf(this.literalSearch('bui*'), 0)
    })
  })

  suite('searching without accents', function () {
    // the diacritics removal recipe documented in README.md
    var removeDiacritics = function (token) {
      return token.update(function (s) {
        return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      })
    }

    var refs = function (results) {
      return results.map(function (r) { return r.ref })
    }

    suiteSetup(function () {
      lunr.Pipeline.registerFunction(removeDiacritics, 'removeDiacritics')
    })

    suiteTeardown(function () {
      delete lunr.Pipeline.registeredFunctions.removeDiacritics
    })

    setup(function () {
      this.idx = lunr(function () {
        this.ref('id')
        this.field('title')

        this.pipeline.before(lunr.trimmer, removeDiacritics)
        this.searchPipeline.before(lunr.trimmer, removeDiacritics)

        this.add({ id: 'a', title: 'Le général et son écran' })
        this.add({ id: 'b', title: 'Une autre histoire' })
      })
    })

    test('without the recipe accents must match exactly', function () {
      var idx = lunr(function () {
        this.ref('id')
        this.field('title')
        this.add({ id: 'a', title: 'Le général et son écran' })
      })

      assert.lengthOf(idx.search('genéral'), 0)
      assert.lengthOf(idx.search('ecran'), 0)
    })

    test('a differently accented word matches', function () {
      assert.deepEqual(['a'], refs(this.idx.search('genéral')))
      assert.deepEqual(['a'], refs(this.idx.search('general')))
    })

    test('an unaccented word matches an accented one', function () {
      assert.deepEqual(['a'], refs(this.idx.search('ecran')))
      assert.deepEqual(['a'], refs(this.idx.search('écran')))
    })

    test('a leading accented letter is not trimmed', function () {
      assert.lengthOf(this.idx.search('cran'), 0)
    })

    test('a serialised index still ignores accents after loading', function () {
      var serialised = JSON.parse(JSON.stringify(this.idx)),
          loaded = lunr.Index.load(serialised)

      assert.include(serialised.pipeline, 'removeDiacritics')
      assert.deepEqual(['a'], refs(loaded.search('genéral')))
      assert.deepEqual(['a'], refs(loaded.search('ecran')))
    })
  })
})
