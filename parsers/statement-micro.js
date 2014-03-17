var Transform = require('stream').Transform
  , inherits = require('util').inherits

module.exports = MicroStatementParser
inherits(MicroStatementParser, Transform)

function MicroStatementParser (options) {
  if (!(this instanceof MicroStatementParser)) {
    return new MicroStatementParser(options)
  }

  Transform.call(this, options)

  this._writableState.objectMode = true
  this._readableState.objectMode = true

  this._reset()
}

MicroStatementParser.prototype._transform = function (line, encoding, next) {
  if (startsWith('invoke-virtual ', line)) {
    var has = line.match(/\-\>has([^\(]+)\(\)Z$/)
    if (has) {
      this._def.field = normalizeFieldName(has[1])
      this._def.key = 'optional'
      return next()
    }
  }

  if (startsWith('invoke-virtual ', line)) {
    var get = line.match(/\-\>get([^\(]+)\(\)L(.+)\;$/)
    if (get) {
      this._def.field = normalizeFieldName(get[1])
      this._def.type = get[2]
      return next()
    }
  }

  if (startsWith('invoke-interface ', line) && ~line.indexOf('->iterator()')) {
    this._def.key = 'repeated'
    return next()
  }

  if (startsWith('check-cast ', line)) {
    var check = line.match(/\, L([^\;]+)\;$/)
    if (check) {
      this._def.type = check[1]
      return next()
    }
  }

  if (startsWith('const/', line)) {
    this._def.tag = parseInt(line.split(' ')[2])
    return next()
  }

  if (startsWith('invoke-virtual ', line)) {
    var write = line.match(/\-\>write([^\(]+)/)
    if (write) {
      if ('Message' !== write[1]) {
        this._def.type = write[1].toLowerCase()
      }

      if (!this._def.key) {
        this._def.key = 'required'
      }

      this.push(this._def)
      this._reset()

      return next()
    }
  }

  // ignore others
  next()
}

MicroStatementParser.prototype._reset = function () {
  this._def = { key: 'required' }
}

function startsWith (start, string) {
  return string.length >= start.length
      && start === string.substr(0, start.length)
}

function normalizeFieldName(name) {
  return name.replace(/([A-Z][a-z])/g, '_$1').toLowerCase().substr(1)
}
