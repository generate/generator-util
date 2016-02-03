'use strict';

require('mocha');
var path = require('path');
var assert = require('assert');
var commands = require('spawn-commands');
require('generate-foo/generator.js');
var utils = require('./');

var fixture = path.resolve.bind(path, __dirname, 'fixtures/generators');
function install(name, cb) {
  commands({
    args: ['install', '-g', '--silent', name],
    cmd: 'npm'
  }, cb);
}


describe('utils', function() {
  before(function(cb) {
    if (!utils.exists(path.resolve(utils.gm, 'generate-bar'))) {
      install('generate-bar', cb);
    } else {
      cb();
    }
  });

  describe('.arrayify', function() {
    it('should cast a value to an array', function() {
      assert.deepEqual(utils.arrayify('foo'), ['foo']);
    });
    it('should return an array', function() {
      assert.deepEqual(utils.arrayify(['foo']), ['foo']);
    });
    it('should return an empty array when val is undefined', function() {
      assert.deepEqual(utils.arrayify(), []);
    });
  });

  describe('.exists', function() {
    it('should return true if a path exists', function() {
      assert(utils.exists('./'));
    });
    it('should return false if a path does not exist', function() {
      assert(!utils.exists('foo'));
    });
  });

  describe('.isObject', function() {
    it('should return true if a value is an object', function() {
      assert(utils.isObject({}));
    });
    it('should return false if a value is not an object', function() {
      assert(!utils.isObject('foo'));
    });
  });

  describe('.toAlias', function() {
    it('should create an alias from a name with a dash', function() {
      assert.equal(utils.toAlias('foo-bar'), 'bar');
    });

    it('should create an alias using the given prefix', function() {
      assert.equal(utils.toAlias('foo-bar', {prefix: 'f'}), 'oo-bar');
    });

    it('should create an alias using the given alias function', function() {
      var alias = utils.toAlias('one-two-three', {
        alias: function(name) {
          return name.slice(name.lastIndexOf('-') + 1);
        }
      });
      assert.equal(alias, 'three');
    });
  });

  describe('.tryRequire', function() {
    it('should require a module', function() {
      var actual = path.resolve('fixtures/generator.js');
      assert.equal(typeof utils.tryRequire('fixtures/generator.js'), 'function');
    });

    it('should try to require a module and return undefined when not found', function() {
      assert.equal(typeof utils.tryRequire('fixtures/fsljslj.js'), 'undefined');
    });
  });

  describe('.tryResolve', function() {
    it('should resolve a path to a local file', function() {
      var actual = path.resolve('fixtures/generator.js');
      assert.equal(utils.tryResolve('fixtures/generator.js'), actual);
    });

    it('should resolve a path to a local by absolute path', function() {
      var actual = path.resolve('fixtures/generator.js');
      assert.equal(utils.tryResolve(path.resolve('fixtures/generator.js')), actual);
    });

    it('should resolve a path to a local module by name', function() {
      var actual = path.resolve('node_modules/generate-foo/generator.js');
      assert.equal(utils.tryResolve('generate-foo'), actual);
    });

    it('should resolve a path to a global module by name', function() {
      var actual = path.resolve(utils.gm, 'generate-bar/index.js');
      assert.equal(utils.tryResolve('generate-bar'), actual);
    });

    it('should resolve a path when cwd is given', function() {
      var actual = path.resolve('fixtures/generator.js');
      assert.equal(utils.tryResolve('generator.js', {cwd: 'fixtures'}), actual);
    });

    it('should return undefined when cwd is given and module is not found', function() {
      assert.equal(typeof utils.tryResolve('foo.js', {cwd: 'fixtures'}), 'undefined');
    });
  });

  describe('.toFullname', function() {
    it('should create a fullname by adding the given prefix', function() {
      assert.equal(utils.toFullname('bar', {prefix: 'foo'}), 'foo-bar');
    });

    it('should not double add a prefix', function() {
      assert.equal(utils.toFullname('foo-bar', {prefix: 'foo'}), 'foo-bar');
    });
  });

  describe('.toGeneratorPath', function() {
    it('should create an object path for getting a generator', function() {
      var actual = utils.toGeneratorPath('a.b.c');
      assert.equal(actual, 'generators.a.generators.b.generators.c');
    });

    it('should prefix a path `generators`', function() {
      var actual = utils.toGeneratorPath('a');
      assert.equal(actual, 'generators.a');
    });

    it('should not double-prefix the path with `generators`', function() {
      var actual = utils.toGeneratorPath('generators.a.b.c');
      assert.equal(actual, 'generators.a.generators.b.generators.c');
    });

    it('should not duplicate `generators` paths', function() {
      var actual = utils.toGeneratorPath('generators.a.generators.b.c');
      assert.equal(actual, 'generators.a.generators.b.generators.c');
    });

    it('should return `null` when a filepath with slashes is passed', function() {
      var actual = utils.toGeneratorPath('generators/foo/bar.js');
      assert.equal(actual, null);
    });
  });
});
