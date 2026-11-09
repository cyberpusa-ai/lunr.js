var fs = require('fs'),
    path = require('path')

/*
 * Reads the value declarations (functions, constants, classes, static and
 * prototype members, enum members) out of lunr.d.ts so that they can be
 * checked against the runtime lunr object. Types and interfaces are skipped,
 * they have no runtime counterpart.
 *
 * This relies on the one-declaration-per-line layout used in lunr.d.ts.
 */
var readDeclarations = function () {
  var source = fs.readFileSync(path.join(__dirname, '..', 'lunr.d.ts'), 'utf8'),
      lines = source.split('\n'),
      stack = [],
      declarations = []

  var identifier = '([A-Za-z_$][\\w$]*)'

  lines.forEach(function (line) {
    var l = line.trim(),
        frame = stack[stack.length - 1],
        match

    if (l === '' || l.indexOf('//') === 0 || l.indexOf('*') === 0 || l.indexOf('/*') === 0) return

    if (l.charAt(0) === '}') {
      stack.pop()
      return
    }

    if (!frame) {
      if (l === 'declare namespace lunr {') stack.push({ kind: 'namespace', path: [] })
      return
    }

    var opens = l.slice(-1) === '{'

    if (frame.kind === 'skip') {
      if (opens) stack.push({ kind: 'skip' })
      return
    }

    if (frame.kind === 'enum') {
      if ((match = l.match(new RegExp('^' + identifier + '\\s*=\\s*(\\d+)')))) {
        declarations.push({ path: frame.path.concat(match[1]), value: Number(match[2]) })
      }
      return
    }

    if (frame.kind === 'class') {
      if ((match = l.match(new RegExp('^static\\s+' + identifier)))) {
        declarations.push({ path: frame.path.concat(match[1]) })
      } else if ((match = l.match(new RegExp('^' + identifier + '\\s*(<[^>]*>)?\\s*\\(')))) {
        if (match[1] !== 'constructor') {
          declarations.push({ path: frame.path, prototype: match[1] })
        }
      }
      if (opens) stack.push({ kind: 'skip' })
      return
    }

    if ((match = l.match(new RegExp('^class\\s+' + identifier)))) {
      declarations.push({ path: frame.path.concat(match[1]) })
      stack.push({ kind: 'class', path: frame.path.concat(match[1]) })
    } else if ((match = l.match(new RegExp('^enum\\s+' + identifier)))) {
      declarations.push({ path: frame.path.concat(match[1]) })
      stack.push({ kind: 'enum', path: frame.path.concat(match[1]) })
    } else if ((match = l.match(new RegExp('^namespace\\s+' + identifier)))) {
      stack.push({ kind: 'namespace', path: frame.path.concat(match[1]) })
    } else if ((match = l.match(new RegExp('^(?:function|const|let|var)\\s+' + identifier)))) {
      declarations.push({ path: frame.path.concat(match[1]) })
      if (opens) stack.push({ kind: 'skip' })
    } else if (opens) {
      stack.push({ kind: 'skip' })
    }
  })

  return declarations
}

var resolve = function (path) {
  return path.reduce(function (obj, key) {
    return obj == null ? undefined : obj[key]
  }, lunr)
}

suite('typings', function () {
  setup(function () {
    this.declarations = readDeclarations()
  })

  test('declarations are found in lunr.d.ts', function () {
    assert.isAbove(this.declarations.length, 50)
  })

  test('every declared value exists on lunr', function () {
    var missing = this.declarations.filter(function (d) {
      var obj = resolve(d.path)

      if (d.prototype) {
        return typeof obj !== 'function' || typeof obj.prototype[d.prototype] !== 'function'
      }

      return obj === undefined
    }).map(function (d) {
      return ['lunr'].concat(d.path).join('.') + (d.prototype ? '#' + d.prototype : '')
    })

    assert.deepEqual(missing, [])
  })

  test('declared enum values match lunr', function () {
    this.declarations.filter(function (d) {
      return 'value' in d
    }).forEach(function (d) {
      assert.strictEqual(resolve(d.path), d.value, ['lunr'].concat(d.path).join('.'))
    })
  })

  test('every member of the lunr namespace is declared', function () {
    var declared = this.declarations.map(function (d) {
      return d.path[0]
    })

    var undeclared = Object.keys(lunr).filter(function (key) {
      return declared.indexOf(key) === -1
    })

    assert.deepEqual(undeclared, [])
  })

  test('core members are among the declarations', function () {
    var names = this.declarations.map(function (d) {
      return d.path.join('.') + (d.prototype ? '#' + d.prototype : '')
    })

    ;[
      'Builder#field', 'Index#search', 'Index.load', 'Query.wildcard.TRAILING',
      'Query.presence.PROHIBITED', 'Pipeline.registerFunction', 'tokenizer.separator',
      'QueryLexer.termSeparator', 'TokenSet.Builder#insert', 'utils.clone', 'Set.complete'
    ].forEach(function (name) {
      assert.include(names, name)
    })
  })
})
