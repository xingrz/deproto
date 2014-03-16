#!/usr/bin/env node

var fs = require('fs')
  , pt = require('path')
  , format = require('util').format
  , async = require('async')

var klass = require('./parsers/class')
  , field = require('./parsers/field')
  , method = require('./parsers/method')
  , statement = require('./parsers/statement')

var filepath = process.argv.pop()
  , basename = pt.basename(filepath, '.smali')
  , dirname = pt.dirname(filepath)

if ('.smali' !== pt.extname(filepath)) {
  return console.log('Accepts .smali only')
}

if (-1 !== basename.indexOf('$')) {
  return console.log('Does not accept member class')
}

var out = process.stdout

readPackage(filepath, function (err, name, pkg) {
  if (err) {
    return console.error(err)
  }

  out.write(format('package %s;\n', pkg))
  out.write('\n')

  readMembers(filepath, function (err, list) {
    if (err) {
      return console.error(err)
    }

    var message = null

    async.eachSeries(list, function (cls, next) {
      var path = pt.join(dirname, basename + '$' + cls + '.smali')
      readFile(path, function (err, type, defs) {
        if (err) {
          return next(err)
        }

        cls = cls.split('$')

        var name = cls.join('.')

        if ('message' === type) {
          out.write(format('message %s {\n', name))
          defs.forEach(function (def) {
            var type = def.type.split('.')
            if (name === type.shift()) {
              def.type = type.join('.')
            }
            out.write(format('  %s %s %s = %d;\n', def.key, def.type, def.field, def.tag))
          })
          out.write('}\n')
        }

        if ('enum' === type) {
          out.write(format('enum %s {\n', name))
          defs.forEach(function (def) {
            out.write(format('  %s = %d;\n', def.key, def.value))
          })
          out.write('}\n')
        }

        out.write('\n')

        next()
      })
    }, function (err) {
      if (err) {
        return console.error(err)
      }
    })
  })
})

function readPackage (file, callback) {
  fs.createReadStream(file)
    .once('error', callback)
    .pipe(klass())
    .once('error', callback)
    .once('class', function (type, cls) {
      cls = cls.split('/')
      callback(null, cls.pop().toLowerCase(), cls.join('.'))
    })
}

function readMembers (file, callback) {
  var basename = pt.basename(file, '.smali')

  fs.readdir(pt.dirname(file), function (err, list) {
    if (err) {
      return callback(err)
    }

    list = list
    .filter(function (i) {
      return '.smali' === pt.extname(i)
    })
    .map(function (i) {
      return pt.basename(i, '.smali')
    })
    .filter(function (i) {
      return i !== basename
          && i.length + 1 > basename.length
          && basename + '$' === i.substr(0, basename.length + 1)
    })
    .map(function (i) {
      return i.substr(basename.length + 1)
    })
    .sort()

    callback(null, list)
  })
}

function readFile (path, callback) {
  fs.createReadStream(path)
    .once('error', callback)
    .pipe(klass())
    .once('error', callback)
    .once('class', function (type, cls) {
      if ('message' === type) {
        streamMessage(this, cls.split('$').shift(), callback)
      }
      else if ('enum' === type) {
        streamEnum(this, callback)
      }
    })
}

function streamMessage(stream, parent, callback) {
  var defs = []
  stream.pipe(method('writeTo'))
        .once('error', callback)
        .pipe(statement())
        .once('error', callback)
        .on('data', function (def) {
          if (parent && def.type.indexOf(parent) === 0) {
            def.type = def.type.substr(parent.length + 1)
          }
          def.type = def.type.replace(/\//g, '.').replace(/\$/g, '.')
          defs.push(def)
        })
        .once('end', function () {
          callback(null, 'message', defs)
        })
}

function streamEnum(stream, callback) {
  var defs = []
  stream.pipe(field())
        .once('error', callback)
        .on('data', function (def) {
          defs.push(def)
        })
        .once('end', function () {
          callback(null, 'enum', defs.sort(function (x, y) {
            return x.value > y.value ? 1 : -1
          }))
        })
}
