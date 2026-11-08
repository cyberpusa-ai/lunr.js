var vm = require('vm'),
    fs = require('fs'),
    path = require('path')

suite('module loading', function () {
  setup(function () {
    this.source = fs.readFileSync(path.join(__dirname, '..', 'lunr.js'), 'utf8')
  })

  var assertWorkingLunr = function (candidate) {
    assert.equal('function', typeof candidate)
    assert.equal(lunr.version, candidate.version)

    var idx = candidate(function () {
      this.field('title')
      this.add({ id: 'a', title: 'green plant' })
    })

    assert.equal('a', idx.search('plant')[0].ref)
  }

  suite('as a browser global', function () {
    test('sets the global in sloppy mode', function () {
      var context = vm.createContext({})

      vm.runInContext(this.source, context)

      assertWorkingLunr(context.lunr)
    })

    test('sets the global in strict mode', function () {
      var context = vm.createContext({})

      assert.doesNotThrow(function () {
        vm.runInContext('"use strict";\n' + this.source, context)
      }.bind(this))

      assertWorkingLunr(context.lunr)
    })

    test('falls back to self when globalThis is missing', function () {
      var context = vm.createContext({})

      vm.runInContext('this.self = {}; delete this.globalThis', context)
      vm.runInContext('"use strict";\n' + this.source, context)

      assertWorkingLunr(context.self.lunr)
    })
  })

  suite('as a CommonJS module', function () {
    test('assigns module.exports in strict mode', function () {
      var context = vm.createContext({ module: { exports: {} } })

      vm.runInContext('var exports = module.exports;\n', context)
      vm.runInContext('"use strict";\n' + this.source, context)

      assertWorkingLunr(context.module.exports)
      assert.isUndefined(context.lunr)
    })
  })

  suite('as an AMD module', function () {
    test('calls define with the factory in strict mode', function () {
      var defined,
          define = function (factory) { defined = factory() }

      define.amd = {}

      var context = vm.createContext({ define: define })

      vm.runInContext('"use strict";\n' + this.source, context)

      assertWorkingLunr(defined)
      assert.isUndefined(context.lunr)
    })
  })
})

suite('licence banners', function () {
  var root = path.join(__dirname, '..')

  var bannerSources = function () {
    var libDir = path.join(root, 'lib')

    return [path.join(root, 'build', 'wrapper_start')].concat(
      fs.readdirSync(libDir)
        .filter(function (file) { return /\.js$/.test(file) })
        .map(function (file) { return path.join(libDir, file) })
    )
  }

  // banner comments are kept by minifiers and bundlers and end up in
  // downstream LICENSE files, where link checkers flag plain http links
  test('link over https', function () {
    bannerSources().forEach(function (file) {
      var source = fs.readFileSync(file, 'utf8'),
          banners = source.match(/\/\*[*!][\s\S]*?\*\//g) || []

      banners.forEach(function (banner) {
        assert.notMatch(banner, /http:\/\//, path.relative(root, file))
      })
    })
  })
})
