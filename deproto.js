var dir = './Proto'
  , file = 'Proto'

var fs = require('fs')
  , join = require('path').join
  , format = require('util').format

var klass = require('./parsers/class')
  , field = require('./parsers/field')
  , method = require('./parsers/method')
  , statement = require('./parsers/statement')

readFile(join(dir, file + '$Command$CommandType.smali'), function (err, type, defs) {
  if ('message' === type) {
    var result = ''
    result += 'message XXXXX {\n'
    defs.forEach(function (def) {
      result += format('  %s %s %s = %d;\n', def.key, def.type, def.field, def.tag)
    })
    result += '}\n'
    console.log(result)
  }
  else if ('enum' === type) {
    var result = ''
    result += 'enum XXXXX {\n'
    defs.sort(function (x, y) {
          return x.value > y.value ? 1 : -1
        })
        .forEach(function (def) {
          result += format('  %s = %d;\n', def.key, def.value)
        })
    result += '}\n'
    console.log(result)
  }
})

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
          callback(null, 'enum', defs)
        })
}
