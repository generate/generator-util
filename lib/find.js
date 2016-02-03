'use strict';

var path = require('path');
var tryOpen = require('try-open');
var extend = require('extend-shallow');
var gm = require('global-modules');
var globalCache = {};
var localCache = {};

function setCache(cache) {
  return function(name, val) {
    cache[name] = val;
    return val;
  }
}

function findLocal(name, options) {
  var opts = extend({prefix: null}, options);
  var cwd = opts.cwd || process.cwd();

  if (localCache[name]) {
    return localCache[name];
  }

  var set = setCache(localCache);

  if (exists(name)) {
    return set(name, path.resolve(name));
  }

  var filepath = path.resolve(cwd, name);
  if (exists(filepath)) {
    return set(name, filepath);
  }

  var fullname = toFullname(name, opts.prefix);
  var modulepath = path.join('node_modules', fullname);

  filepath = path.resolve(cwd, modulepath);
  if (exists(filepath)) {
    return set(name, filepath);
  }
}

function findGlobal(name, options) {
  var opts = extend({}, options);
  if (globalCache[name]) {
    return globalCache[name];
  }

  var set = setCache(globalCache);

  var filepath = path.resolve(gm, name);
  if (exists(filepath)) {
    return set(name, filepath);
  }

  if (typeof opts.prefix === 'string') {
    var fullname = toFullname(name, opts.prefix);
    if (name === fullname) {
      return;
    }

    filepath = path.resolve(gm, fullname);
    if (exists(filepath)) {
      return set(name, filepath);
    }
  }
}

function findModule(name, options) {
  var opts = extend({}, options);
  var filepath = findLocal(name, opts);
  if (filepath) {
    return filepath;
  }
  if (!opts.cwd) {
    return findGlobal(name, opts);
  }
}

function toFullname(name, prefix) {
  if (!prefix || name.indexOf(prefix) === 0) {
    return name;
  }
  return prefix + '-' + name;
}

function exists(fp) {
  return fp && (typeof tryOpen(fp, 'r') === 'number');
}

exports.resolveModule = findModule;
exports.resolveGlobal = findGlobal;
exports.resolveLocal = findLocal;

// console.log(findModule('foo'));
// console.log(findModule('foo', {prefix: 'generate'}));
// console.log(findModule('generate-foo'));
// console.log(findModule('generate-bar'));
// console.log(findModule('ex'));
// console.log(findModule('ex', {prefix: 'generate'}));
// console.log(findModule('generate-ex'));
// console.log(findModule('./'));
// console.log(findModule('.'));
// console.log(findModule('/'));
// console.log(findModule('baz'));
