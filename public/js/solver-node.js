var solve = require('./solver2');
function solver (e) {
  var data = solve(e);
  return JSON.stringify(data);
}
module.exports = solver;