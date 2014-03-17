/**!
 * ClassParser - parsers/class.js
 *
 * Parse a class
 */

var Transform = require('stream').Transform
  , StringDecoder = require('string_decoder').StringDecoder
  , inherits = require('util').inherits

module.exports = ClassParser
inherits(ClassParser, Transform)

function ClassParser (options) {
  if (!(this instanceof ClassParser)) {
    return new ClassParser(options)
  }

  Transform.call(this, options)

  this._writableState.objectMode = false
  this._readableState.objectMode = true

  this._buffer = ''
  this._decoder = new StringDecoder('utf8')
  this._parseClass = true
}

ClassParser.prototype._transform = function (chunk, encoding, done) {
  var self = this

  self._buffer += self._decoder.write(chunk)

  var lines = self._buffer.split(/\r?\n/)
  self._buffer = lines.pop()

  lines.forEach(function (line) {
    if (self._parseClass && '.class ' === line.substr(0, 7)) {
      var cls = line.split(' ').pop()
      cls = cls.substring(1, cls.length - 1)

      var type = ~line.indexOf('interface abstract')
               ? 'enum'
               : 'message'

      self.emit('class', type, cls)
      self._parseClass = false
    }

    self.push(line)
  })

  done()
}

ClassParser.prototype._flush = function (done) {
  var remains = this._buffer.trim();
  if (remains) {
    this.push(remains)
  }

  done()
}
