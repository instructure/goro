const fs = require('fs');
const chokidar = require('chokidar');
const exec = require('child_process').exec;
const {
  validate,
  strictShape,
  string,
  instanceOf,
  bool,
  arrayOf,
  func,
  object
} = require('./PropTypes');

function GoroTracker(dependencies) {
  validate(strictShape({
    config: strictShape({
      root: string,

      specPattern: instanceOf(RegExp),

      continue: bool,
      focus: bool,

      grep: string,
      grepDir: string,

      cache: bool,
      cachePath: string,

      watchPattern: string,

      watchSources: bool,
      watchSourcePattern: string,

      exclude: arrayOf(string),
    }),

    console: object,

    onChange: func,
  }), dependencies, 'GoroTracker');

  const { console, config } = dependencies;

  const watcher = new chokidar.FSWatcher({
    usePolling: true,
    ignorePermissionErrors: true,
    ignoreInitial: true,
    followSymlinks: false,
    cwd: config.root
  });

  const testFiles = [];

  let focus = config.focus;

  watcher
    .on('add', function(file) {
      if (track(file)) {
        console.log('File "%s" has been created.', file);
        emitChange();
      }
    })
    .on('change', function(file) {
      console.log('File "%s" was modified.', file);
      track(file);
      emitChange();
    })
    .on('unlink', function(file) {
      if (untrack(file)) {
        console.log('File "%s" is no longer tracked as it was deleted.');
        emitChange();
      }
    })
    // If we don't subscribe; unhandled errors from Chokidar will bring Karma down
    // (see GH Issue #959)
    .on('error', function() {})
  ;

  if (config.continue) {
    if (loadFromCache()) {
      console.log('Reloaded previously tracked test files.');
    }
  }

  if (config.grep && config.grep.length) {
    grep(config.grep, function(fileList) {
      fileList.forEach(track);

      emitChange();
    });
  }

  function track(filePath) {
    if (filePath.match(config.specPattern) && !isExcluded(filePath)) {
      untrack(filePath);

      testFiles.push(filePath);

      return true;
    }
  }

  function isExcluded(filePath) {
    return config.exclude.some(function(pattern) {
      return filePath.match(pattern);
    });
  }

  function untrack(filePath) {
    var index = testFiles.indexOf(filePath);

    if (index > -1) {
      testFiles.splice(index, 1);
      return true;
    }
  }

  function loadFromCache() {
    if (fs.existsSync(config.cachePath)) {
      var cache = JSON.parse(fs.readFileSync(config.cachePath, 'utf-8'));

      // ignore removed files, happens when switching branches yo
      var cacheFiles = cache.filter(function(filePath) {
        return fs.existsSync(filePath);
      });

      if (cacheFiles.length > 0) {
        cacheFiles.forEach(track);
        return true;
      }
    }
  }

  function grep(pattern, callback) {
    exec(`egrep -rl "describe ['\\"]?.*${pattern}['\\"]?" ${config.grepDir}`, {
      cwd: config.root
    }, function(error, stdout/*, stderr*/) {
      if (!error) {
        callback(stdout.split('\n').filter(function(fileName) {
          return fileName.match(config.specPattern);
        }));
      }
    });
  }

  function emitChange() {
    dependencies.onChange();
  }

  function clear() {
    while (testFiles.length) {
      testFiles.pop();
    }
  }

  return {
    start() {
      watcher.add(config.watchPattern);

      console.log(`Application root: ${config.root}`);
      console.log(`Watching "${config.watchPattern}" for test file changes.`);

      if (config.watchSources) {
        console.log(`Watching "${config.watchSourcePattern}" for source file changes.`);
        watcher.add(config.watchSourcePattern);
      }
    },

    stop() {
      if (config.cache) {
        fs.writeFileSync(config.cachePath, JSON.stringify(testFiles, null, 2));
      }

      watcher.close();
    },

    getTestFiles: function() {
      if (focus) {
        return testFiles.slice(-1);
      }

      return testFiles;
    },

    clear: function() {
      clear();
      emitChange();
    },

    toggleFocusMode: function() {
      focus = !focus;

      emitChange();
    },

    inFocusMode() {
      return focus;
    },

    grep: function(pattern) {
      grep(pattern, function(fileList) {
        clear();
        fileList.forEach(track);
        emitChange();
      });
    }
  };
}

module.exports = GoroTracker;
