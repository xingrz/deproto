var Transform = require('stream').Transform
  , inherits = require('util').inherits

module.exports = FieldParser
inherits(FieldParser, Transform)

function FieldParser (method, options) {
  if (!(this instanceof FieldParser)) {
    return new FieldParser(method, options)
  }

  Transform.call(this, options)

  this._writableState.objectMode = true
  this._readableState.objectMode = true
}

var LEADING = '.field public static final '

FieldParser.prototype._transform = function (line, encoding, done) {
  if (line.indexOf(LEADING) !== 0) {
    return done()
  }

  var statement = line.substr(LEADING.length).split(' = ')
    , field = statement[0].split(':')

  if (2 !== field.length || 'I' !== field[1]) {
    return done()
  }

  var key = field[0]
    , value = 0

  if (2 === statement.length) {
    value = parseInt(statement[1])
  }

  this.push({ key: key, value: value })
  done()
}
