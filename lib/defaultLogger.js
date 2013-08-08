var clc = require('cli-color')
  ;

var levelColors = { debug: clc.blue, info: clc.yellow, error: clc.red };
var levels = { debug: 0, info: 1, error: 2 };
var sep = ' - ';

function printLevel(level) {
  return (levelColors[level] || clc.white)(level) + sep;
}

module.exports = function defaultLogger (filterLevel) {
  return function (level, message, meta) {
    if (levels[level] >= levels[filterLevel]) {
      var optMeta = (meta) ? sep + JSON.stringify(meta) /*require('util').inspect(meta, { depth: 5 })*/ : '';
      console.log(printLevel(level) +  message + optMeta);
    }
  };
};