// ==========================================
// BOWER: prune
// ==========================================
// Copyright 2012 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================

var semver = require('semver');
var sort   = require('stable');

var versionRequirements = function (dependencyMap) {
  var result = {};

  for (var type in dependencyMap) {
    for (var name in dependencyMap[type]) {
      dependencyMap[type][name].forEach(function (pkg) {
        result[type] = result[type] || [];
        result[type][name] = result[type][name] || [];
        if (pkg.originalTag && result[type][name].indexOf(pkg.originalTag) === -1) {
          result[type][name].push(pkg.originalTag);
        }
      });
    }
  }

  return result;
};

var validVersions = function (versions, dependency) {
  if (!versions || !versions.length) return true;

  // If a non resolved dependency is passed, we simply ignore it
  if (!dependency.version) return false;

  if (!semver.valid(dependency.version)) {
    throw new Error('Invalid semver version ' + dependency.version + ' specified in ' + dependency.name);
  }

  return versions.every(function (version) {
    return semver.satisfies(dependency.version, version);
  });
};

module.exports = function (dependencyMap, forceLatest) {
  // generate version requirements
  // compare dependency map with version requirements
  // check for conflicts
  // select best version
  // return an object with the resolved deps, conflict deps and forcebly resolved ones

  var resolved   = {};
  var conflicted = null;
  var forceblyResolved = null;
  var versionMap = versionRequirements(dependencyMap);

  var sortFunc = function (a, b) {
    if (semver.gt(a.version, b.version)) return -1;
    if (semver.lt(a.version, b.version)) return 1;

    // If the comparison determines that both packages are equal, do not give priority to local ones
    if (a.path === a.localPath && b.path !== b.localPath) return 1;
    return 0;
  };

  // Note that bellow we use a stable sort algorithm
  // This is because if two packages are equal, the initial order should be respected
  for (var type in dependencyMap) {
    for (var name in dependencyMap[type]) {
      var matches = dependencyMap[type][name].filter(validVersions.bind(this, versionMap[type][name]));
      if (!matches.length) {
        // No resolvable dependency
        // We resolve to the latest package if the forceLatest is true
        // Otherwise, check if any of those are root packages
        // If so, we assume that as the resolver (with a warning)
        // Otherwise there's a conflict
        if (forceLatest) {
          forceblyResolved = forceblyResolved || {};
          forceblyResolved[type][name] = sort(dependencyMap[type][name], sortFunc);
          continue;
        }
  
        matches = dependencyMap[type][name].filter(function (pkg) { return !!pkg.root; });
        if (matches.length) {
          forceblyResolved = forceblyResolved || {};
          forceblyResolved[type] = forceblyResolved[type] || {};
          forceblyResolved[type][name] = dependencyMap[type][name].sort(function (a, b) {
            if (a.root && b.root) return sortFunc(a, b);
            if (a.root) return -1;
            if (b.root) return 1;
            return sortFunc(a, b);
          });
        } else {
          conflicted = conflicted || {};
          conflicted[type] = conflicted[type] || {};
          conflicted[type][name] = dependencyMap[type][name];
        }
      } else {
        resolved[type] = resolved[type] || [];
        resolved[type][name] = [ sort(matches, sortFunc)[0] ];
      }
    }
  }

  return {
    resolved: resolved,
    conflicted: conflicted,
    forceblyResolved: forceblyResolved
  };
};