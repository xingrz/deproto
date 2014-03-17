#!/usr/bin/env node

var _ = require('lodash')
  , pt = require('path')
  , fs = require('fs')
  , async = require('async')

var klass = require('./parsers/class')
  , field = require('./parsers/field')
  , method = require('./parsers/method')
  , statementMicro = require('./parsers/statement-micro')
  , statementNano = require('./parsers/statement-nano')

var sourceDir = process.argv.length >= 3
              ? pt.resolve(process.argv[2])
              : pt.resolve('.')

var destinationDir = process.argv.length >= 4
                   ? pt.resolve(process.argv[3])
                   : pt.resolve('.')

!(function recurse (dir, done) {
  fs.readdir(dir, function (err, entities) {
    if (err) {
      return done(err)
    }

    entities = entities.map(function (name) {
      return pt.join(dir, name)
    })

    async.map(entities, fs.stat, function (err, stats) {
      if (err) {
        return done()
      }

      var subdirs = entities.filter(function (path, i) {
        return stats[i].isDirectory()
      })

      var files = entities.filter(function (path, i) {
        return stats[i].isFile() && '.smali' == pt.extname(path)
      })

      buildTree(dir, files, function (err) {
        if (err) {
          return done(err)
        }

        async.eachSeries(subdirs, recurse, done)
      })
    })
  })
})(sourceDir, function (err) {
  if (err) {
    console.error(err)
  } else {
    console.log('done')
  }
})

function buildTree (dir, files, done) {
  var tree = {}

  files.forEach(function (path) {
    tree[pt.basename(path, '.smali')] = {
      members: {}
    }
  })

  _.forIn(tree, function (value, key) {
    if (tree[key]) {
      _.forIn(tree, function (value, subkey) {
        if (subkey.indexOf(key + '$') == 0) {
          if (!subkey.match(/\$[\d]+$/)) {
            tree[key].members[subkey] = tree[subkey]
          }
          delete tree[subkey]
        }
      })
    }
  })

  _.forIn(tree, function (value, key) {
    if (_.keys(tree[key].members).length == 0) {
      delete tree[key]
    }
  })

  if (_.keys(tree).length == 0) {
    return done()
  }

  walkTree(dir, tree, done)
}

function walkTree (dir, tree, done) {
  async.eachSeries(_.keys(tree), function (key, next) {
    console.log('* ' + pt.relative(sourceDir, dir).replace(/\//g, '.'), key)
    walkClass(dir, tree[key], key, next)
  }, done)
}

function walkClass (dir, subtree, key, done) {
  async.eachSeries(_.keys(subtree.members), function (subkey, next) {
    fs.createReadStream(pt.join(dir, subkey + '.smali'))
    .pipe(klass(function (superClass) {
      switch (superClass) {
        case 'com.google.protobuf.nano.MessageMicro':
          console.log('  + ' + superClass + ' ' + subkey)

          if (_.keys(subtree.members[subkey].members).length > 0) {
            walkClass(dir, subtree.members[subkey], key, next)
          } else {
            next()
          }
          return
        case 'com.google.protobuf.nano.MessageNano':
          console.log('  + ' + superClass + ' ' + subkey)

          if (_.keys(subtree.members[subkey].members).length > 0) {
            walkClass(dir, subtree.members[subkey], key, next)
          } else {
            next()
          }
          return
        case 'java.lang.Object':
          // ...
          return next()
        default:
          return next()
      }
    }))
  }, done)
}
