var Transform = require('stream').Transform
  , inherits = require('util').inherits

module.exports = MethodFilter
inherits(MethodFilter, Transform)

function MethodFilter (method, options) {
  if (!(this instanceof MethodFilter)) {
    return new MethodFilter(method, options)
  }

  Transform.call(this, options)

  this._writableState.objectMode = true
  this._readableState.objectMode = true

  this.method = method
  this.reading = false
}

MethodFilter.prototype._transform = function (line, encoding, done) {
  if (this.reading) {
    if ('.end method' === line) {
      this.reading = false
    } else {
      this.push(line.trim())
    }
  } else {
    var match = line.match(/^\.method .*?([^ \()]+)\([^\)]+\).+$/)
    if (match && match[1] === this.method) {
      this.reading = true
    }
  }

  done()
}
