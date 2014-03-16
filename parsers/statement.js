var Transform = require('stream').Transform
  , inherits = require('util').inherits

module.exports = CommandParser
inherits(CommandParser, Transform)

function CommandParser (options) {
  if (!(this instanceof CommandParser)) {
    return new CommandParser(options)
  }

  Transform.call(this, options)

  this._writableState.objectMode = true
  this._readableState.objectMode = true

  this._reset()
}

CommandParser.prototype._transform = function (line, encoding, done) {
  if (!line) {
    return done()
  }

  if ('.' === line.substr(0, 1)) {
    return done()
  }

  if (':cond_' === line.substr(0, 6)) {
    return done()
  }

  if (startsWith('if-eqz ', line)) {
    this._def.key = 'optional'
    return done()
  }

  if (startsWith('const/', line)) {
    this._def.tag = parseInt(line.split(' ')[2])
    return done()
  }

  if (startsWith('iget', line)) {
    var getting = line.substr(line.indexOf('->') + 2).split(':')
      , type = getting[1]


    if (startsWith('[', type)) {
      this._def.key = 'repeated'
      type = type.substr(1)
    }

    if (startsWith('L', type)) {
      type = type.substring(1, type.length - 1)
    }

    this._def.field = getting[0].replace('_', '')
    this._def.type = type

    return done()
  }

  if (startsWith('invoke-virtual ', line)) {
    var invoking = line.match(/\-\>write([^\(]+)/)
    if (invoking) {
      if ('Message' !== invoking[1]) {
        this._def.type = invoking[1].toLowerCase()
      }

      if (!this._def.key) {
        this._def.key = 'required'
      }

      this.push(this._def)
      this._reset()
    }

    return done()
  }

  // ignore others
  done()
}

CommandParser.prototype._reset = function () {
  this._def = { key: 'required' }
}

function startsWith (start, string) {
  return string.length >= start.length
      && start === string.substr(0, start.length)
}
