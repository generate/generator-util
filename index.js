/*!
 * generate-util <https://github.com/jonschlinkert/generate-util>
 *
 * Copyright (c) 2016, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var path = require('path');

/**
 * Module dependencies
 */

var debug = require('debug')('generators:util');
var utils = require('lazy-cache')(require);

/* eslint-disable no-native-reassign */
var fn = require;
/* eslint-disable no-undef */
require = utils;

/**
 * Lazily required module dependencies
 */

require('extend-shallow', 'extend');
require('global-modules', 'gm');
require('is-absolute');
require('kind-of', 'typeOf');
require('resolve');
require('try-open');
require = fn;

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
  if (typeof opts.prefix === 'string') {
    var re = new RegExp('^' + opts.prefix + '-?');
    return name.replace(re, '');
  }
  var basename = path.basename(name, path.extname(name));
  return basename.slice(basename.indexOf('-') + 1);
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
  if (alias.indexOf(opts.prefix) === -1) {
    return opts.prefix + '-' + alias;
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

utils.toGeneratorPath = function(name) {
  if (/[\\\/]/.test(name)) {
    return null;
  }
  if (name.indexOf('generators.') === 0) {
    name = name.slice('generators.'.length);
  }
  if (~name.indexOf('.')) {
    name = name.split(/\.generators\.|\./g).join('.generators.');
  }
  return 'generators.' + name;
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

  if (utils.isAbsolute(name) && utils.exists(name)) {
    return name;
  }

  var filepath = path.resolve(name);
  if (utils.exists(filepath)) {
    return filepath;
  }

  filepath = opts.cwd ? path.resolve(opts.cwd, name) : name;
  if (filepath.indexOf(opts.configfile) === -1) {
    filepath = path.join(filepath, opts.configfile);
  }

  // try to resolve `name` from working directory
  try {
    debug('resolving: "%s", from cwd: "%s"', filepath, opts.cwd);
    return utils.resolve.sync(filepath);
  } catch (err) {}

  // if a cwd was defined, go directly to jail, don't pass go.
  if (typeof opts.cwd === 'string' && opts.cwd !== utils.gm) {
    return;
  }

  // try resolve `name` in global npm modules
  try {
    debug('resolving from global modules: "%s"', name);
    return utils.resolve.sync(name, {basedir: utils.gm});
  } catch (err) {}
};

/**
 * Try to require the given module, failing silently if
 * it doesn't exist.
 *
 * ```js
 * utils.tryRequire('foo');
 * ```
 * @param  {String} `name` The module name or file path
 * @param  {Object} `options`
 * @return {any|Null} Returns the value of requiring the specified module, or `null`
 * @api public
 */

utils.tryRequire = function(fp, options) {
  try {
    return require(utils.tryResolve(fp, options));
  } catch (err) {}
};

/**
 * Expose `utils`
 */

module.exports = utils;

