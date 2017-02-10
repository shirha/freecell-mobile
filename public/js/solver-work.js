self.module = {}, self.solve = null; 
self.addEventListener('message', function(e) {
  var data = solve(e.data);
  self.postMessage(data);
}, false);
importScripts('solver2.js'); // module.exports = solve;