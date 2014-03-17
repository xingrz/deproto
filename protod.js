#!/usr/bin/env node

var _ = require('lodash')
  , pt = require('path')
  , fs = require('fs')
  , async = require('async')

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
        return done(err)
      }

      var subdirs = entities.filter(function (path, i) {
        return stats[i].isDirectory()
      })

      var files = entities.filter(function (path, i) {
        return stats[i].isFile() && '.smali' == pt.extname(path)
      })

      findMessage(dir, files, function (err) {
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

function findMessage (dir, files, done) {
  if (files.length < 2) {
    return done()
  }

  var tree = {}

  files.forEach(function (path) {
    tree[pt.basename(path, '.smali')] = {}
  })

  _.forIn(tree, function (value, key) {
    if (tree[key]) {
      _.forIn(tree, function (value, subkey) {
        if (subkey.indexOf(key + '$') == 0) {
          if (!subkey.match(/\$[\d]+$/)) {
            tree[key][subkey] = tree[subkey]
          }
          delete tree[subkey]
        }
      })
    }
  })

  _.forIn(tree, function (value, key) {
    if (_.keys(tree[key]).length == 0) {
      delete tree[key]
    }
  })

  if (_.keys(tree).length == 0) {
    return done()
  }

  console.log(dir)
  console.log(tree)

  /*if (classTree.length > 0) {
    console.log('* %s', pt.relative(sourceDir, dir).replace(/\//g, '.'))
  }*/

  done()
}
