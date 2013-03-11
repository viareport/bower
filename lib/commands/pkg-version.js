var nopt        = require('nopt');
var util        = require('util');
var semver      = require('semver');
var path        = require('path');
var fs          = require('fs');

var Manager     = require('../core/manager');
var config      = require('../core/config');


var Init = function (name) {
  Manager.call(this);
};

util.inherits(Init, Manager);

Init.prototype.pkgVersion = function (name) {
  if(name) {
    this.json.version = semver.inc(this.json.version, name);
  }
  this.emit('version', this.json.version);
};

Init.prototype.save = function (data) {
  fs.writeFileSync(path.join(this.cwd, config.json), JSON.stringify(data, null, 2));
};

module.exports = function (name) {
 var init = new Init();

  init
    .on('loadJSON', init.pkgVersion.bind(init, name))
    .on('version', function(data){
      init.save(init.json);
      init.emit('end', data);
    })
    .loadJSON();

  return init;
};



module.exports.line = function (argv) {
  var options  = nopt({}, {}, argv);
  var paths    = options.argv.remain.slice(1);
  return module.exports(paths[0]);
};