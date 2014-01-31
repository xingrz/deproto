var Transform = require('stream').Transform
  , StringDecoder = require('string_decoder').StringDecoder
  , inherits = require('util').inherits

module.exports = LineReader
inherits(LineReader, Transform)

function LineReader (options) {
  if (!(this instanceof LineReader)) {
    return new LineReader(options)
  }

  Transform.call(this, options)

  this._writableState.objectMode = false
  this._readableState.objectMode = true
  
  this._buffer = ''
  this._decoder = new StringDecoder('utf8')
  this._parseClass = true
}

LineReader.prototype._transform = function (chunk, encoding, done) {
  this._buffer += this._decoder.write(chunk)

  var lines = this._buffer.split(/\r?\n/)
  this._buffer = lines.pop()

  var self = this
  lines.forEach(function (line) {
    if (self._parseClass && line.length > 6 && '.class ' === line.substr(0, 7)) {
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

LineReader.prototype._flush = function (done) {
  var remains = this._buffer.trim();
  if (remains) {
    this.push(remains)
  }

  done()
}
