/*!
 * generate-util <https://github.com/jonschlinkert/generate-util>
 *
 * Copyright (c) 2016, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var path = require('path');
var debug = require('debug')('base:generators:util');
var utils = require('lazy-cache')(require);
var find = require('./lib/find');
var resolveCache = {};
var requireCache = {};

/**
 * Lazily required module dependencies
 */

var fn = require;
require = utils;
require('extend-shallow', 'extend');
require('global-modules', 'gm');
require('is-absolute');
require('kind-of', 'typeOf');
require('resolve');
require('try-open');
require = fn;

/**
 * Return true if a filepath exists on the file system.
 *
 * ```js
 * utils.exists('foo');
 * //=> false
 *
 * utils.exists('gulpfile.js');
 * //=> true
 * ```
 * @param {String} `filepath`
 * @return {Boolean}
 * @api public
 */

utils.exists = function(fp) {
  return fp && typeof utils.tryOpen(fp, 'r') === 'number';
};

/**
 * Rename the `key` used for storing views/templates
 *
 * @param {String} `key`
 * @param {Object} `view` the `renameKey` method is used by [templates][] for both setting and getting templates. When setting, `view` is exposed as the second parameter.
 * @return {String}
 * @api public
 */

utils.renameKey = function(key, view) {
  return view ? view.filename : path.basename(key, path.extname(key));
};

/**
 * Opposite of `.toFullname`, creates an "alias" from the given
 * `name` by either stripping `options.prefix` from the name, or
 * just removing everything up to the first dash. If `options.alias`
 * is a function, it will be used instead.
 *
 * ```js
 * utils.toAlias('generate-foo');
 * //=> 'foo';
 *
 * utils.toAlias('a-b-c', {prefix: 'a-b'});
 * //=> 'c';
 * ```
 *
 * @param {String} `name`
 * @param {Object} `options`
 * @return {String}
 * @api public
 */

utils.toAlias = function(name, options) {
  var opts = utils.extend({}, options);
  if (typeof opts.alias === 'function') {
    return opts.alias(name);
  }
  var prefix = opts.prefix || opts.modulename;
  if (typeof prefix === 'string') {
    var re = new RegExp('^' + prefix + '-');
    return name.replace(re, '');
  }
  return name;
};

/**
 * Opposite of `.toAlias`, creates a generator name from the
 * given `alias` and `namespace`.
 *
 * ```js
 * utils.toFullname('foo', 'generate');
 * //=> 'generate-foo';
 *
 * utils.toFullname('generate-bar', 'generate');
 * //=> 'generate-bar'
 * ```
 * @param {String} `alias`
 * @param {String} `namespace`
 * @return {String}
 * @api public
 */

utils.toFullname = function(alias, options) {
  var opts = utils.extend({}, options);
  var prefix = opts.prefix || opts.modulename;
  if (typeof prefix === 'undefined') {
    throw new Error('expected prefix to be a string');
  }
  // if it's a filepath, just return it
  if (utils.isAbsolute(alias)) {
    return alias;
  }
  if (alias.indexOf(prefix) === -1) {
    return prefix + '-' + alias;
  }
  return alias;
};

/**
 * Create an object-path for looking up a generator.
 *
 * ```js
 * utils.toGeneratorPath('a.b.c');
 * //=> 'generators.a.generators.b.generators.c'
 * ```
 * @param {String} `name`
 * @return {String}
 * @api public
 */

utils.toGeneratorPath = function(name, prefix) {
  if (/[\\\/]/.test(name)) {
    return null;
  }
  if (name.indexOf('generators.') === 0) {
    name = name.slice('generators.'.length);
  }
  if (~name.indexOf('.')) {
    name = name.split(/\.generators\.|\./g).join('.generators.');
  }
  return prefix === false ? name : ('generators.' + name);
};

/**
 * Get a generator from `app`.
 *
 * @param {Object} `app`
 * @param {String} `name` Generator name
 * @return {Object} Returns the generator instance.
 * @api public
 */

utils.getGenerator = function(app, name) {
  return app.get(utils.toGeneratorPath(name));
};

/**
 * Return the filepath for `configfile` or undefined
 * if the file does not exist.
 *
 * @param {String} `configfile`
 * @param {Object} `options`
 * @return {String}
 */

utils.configfile = function(configfile, options) {
  var opts = utils.extend({cwd: process.cwd()}, options);
  var configpath = path.resolve(opts.cwd, configfile);

  if (!utils.exists(configpath)) {
    throw new Error('file "' + configpath + '" does not exist');
  }
  return utils.tryRequire(configpath);
};

/**
 * Try to `require.resolve` module `name`, first locally
 * then in the globaly npm directory. Fails silently
 * if not found.
 *
 * ```js
 * utils.tryResolve('foo');
 * // or
 * utils.tryResolve('generate-foo');
 * // or
 * utils.tryResolve('generate-foo', {cwd: require('global-modules')});
 * // or
 * utils.tryResolve('./foo/bar/baz.js');
 * ```
 * @param {String} `name` The name or filepath of the module to resolve
 * @param {Object} `options` Pass `options.cwd` and/or `options.configfile` (filename) to modify the path used by `resolve`.
 * @return {String|undefined}
 * @api public
 */

utils.tryResolve = function(name, options) {
  var opts = utils.extend({configfile: 'generator.js'}, options);
  debug('tryResolve: "%s"', name);
  var key = name + '::' + opts.configfile;

  var filepath = find.resolveModule(name, opts);
  if (!utils.exists(filepath)) return;
  if (resolveCache[key]) {
    return resolveCache[key];
  }

  try {
    var modulepath = utils.resolve.sync(filepath);
    if (modulepath) {
      return (resolveCache[key] = modulepath);
    }
  } catch (err) {}

  filepath = path.join(filepath, opts.configfile);
  if (utils.exists(filepath)) {
    return (resolveCache[key] = filepath);
  }
};

/**
 * Try to require the given module, failing silently if it doesn't exist.
 * The function first calls `require` on the given `name`, then tries
 * `require(path.resolve(name))` before giving up.
 *
 * ```js
 * utils.tryRequire('foo');
 * ```
 * @param  {String} `name` The module name or file path
 * @return {any|undefined} Returns the value of requiring the specified module, or `undefined` if unsuccessful.
 * @api public
 */

utils.tryRequire = function(name, options) {
  var fn;

  if (requireCache[name]) {
    return requireCache[name];
  }

  try {
    fn = require(name);
    if (fn) {
      return (requireCache[name] = fn);
    }
  } catch (err) {
    handleError(err);
  }

  var filepath = utils.tryResolve(name, options);
  if (!filepath) return;
  try {
    fn = require(filepath);
    if (fn) {
      return (requireCache[name] = fn);
    }
  } catch (err) {
    handleError(err);
  }
};

/**
 * Modified from the `tableize` lib, which replaces
 * dashes with underscores, and we don't want that behavior.
 * Tableize `obj` by flattening and normalizing the keys.
 *
 * @param {Object} obj
 * @return {Object}
 * @api public
 */

utils.tableize = function(obj) {
  var table = {};
  flatten(table, obj, '');
  return table;
};

/**
 * Recursively flatten object keys to use dot-notation.
 *
 * @param {Object} `table`
 * @param {Object} `obj`
 * @param {String} `parent`
 */

function flatten(table, obj, parent) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var val = obj[key];

      key = parent + key;
      if (utils.isObject(val)) {
        flatten(table, val, key + '.');
      } else {
        table[key] = val;
      }
    }
  }
}

/**
 * Placeholder
 */

function handleError(err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

/**
 * Returns true if the given `value` is a function.
 *
 * ```js
 * utils.isFunction('foo');
 * //=> false
 *
 * utils.isFunction(function() {});
 * //=> true
 * ```
 *
 * @param {any} `value`
 * @return {Boolean}
 * @api public
 */

utils.isFunction = function(value) {
  return utils.typeOf(value) === 'function';
};

/**
 * Returns true if the given `value` is a boolean.
 *
 * ```js
 * utils.isBoolean('foo');
 * //=> false
 *
 * utils.isBoolean(false);
 * //=> true
 * ```
 *
 * @param {any} `value`
 * @return {Boolean}
 * @api public
 */

utils.isBoolean = function(value) {
  return utils.typeOf(value) === 'boolean';
};

/**
 * Returns true if a the given `value` is a string.
 *
 * ```js
 * utils.isString('foo');
 * //=> false
 *
 * utils.isString({});
 * //=> true
 * ```
 *
 * @param {any} `value`
 * @return {Boolean}
 * @api public
 */

utils.isString = function(value) {
  return utils.typeOf(value) === 'string';
};

/**
 * Returns true if a the given `value` is an object.
 *
 * ```js
 * utils.isObject('foo');
 * //=> false
 *
 * utils.isObject({});
 * //=> true
 * ```
 *
 * @param {any} `value`
 * @return {Boolean}
 * @api public
 */

utils.isObject = function(value) {
  return utils.typeOf(value) === 'object';
};

/**
 * Cast the given `value` to an array.
 *
 * ```js
 * utils.arrayify('foo');
 * //=> ['foo']
 *
 * utils.arrayify(['foo']);
 * //=> ['foo']
 * ```
 * @param {String|Array} `value`
 * @return {Array}
 * @api public
 */

utils.arrayify = function(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
};

/**
 * Expose `utils`
 */

module.exports = utils;

