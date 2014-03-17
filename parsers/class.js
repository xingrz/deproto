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

function ClassParser (callback) {
  if (!(this instanceof ClassParser)) {
    return new ClassParser(callback)
  }

  Transform.call(this)

  if ('function' === typeof callback) {
    this.once('class', callback)
  }

  this._writableState.objectMode = false
  this._readableState.objectMode = true

  this._buffer = ''
  this._decoder = new StringDecoder('utf8')
}

ClassParser.prototype._transform = function (chunk, encoding, done) {
  var self = this

  self._buffer += self._decoder.write(chunk)

  var lines = self._buffer.split(/\r?\n/)
  self._buffer = lines.pop()

  lines.forEach(function (line) {
    if (line) {
      if (!self.super) {
        var match = line.match(/^\.super L(.+)\;$/)
        if (match) {
          self.super = match[1].replace(/\//g, '.')
          self.emit('class', self.super)
        }
      }

      self.push(line)
    }
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
