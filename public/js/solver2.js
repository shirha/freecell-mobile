/*
./lib/node-solver.js
var gen       = require('./module-gen');
var Entry     = require('./module-entry');
var fromToken = require('./module-fromtoken');
var autoplay  = require('./module-autoplay');
var backtrack = require('./module-backtrack');
var heuristic = require('./module-heuristic');
var util      = require('./module-util'),
    message   = util.message,
    isKings   = util.isKings,
    zeroArray = util.zeroArray,
    undo      = util.undo;
*/

// global
var MAXDEPTH = 50, MAXNODES = 2000, MAXSCORE = 64+8+8*6*2,
    SRCCOL = 0, SRCROW = 1, DSTCOL = 2, DSTROW = 3, KING = 13, 
    HOMEOFFSET = 4, MAXFREE = 4, MAXCOLS = 8, MAXROWS = 20,

    position, size, depth, found, nextstack, staged, stats, 
    loscore, midscore, hiscore, totscore, cnt, result_scores;

function solve (e) {
  // init global at each entry to solve
  position = Object.create(null), 
  size  = 0, 
  depth = 0, 
  found = 0, 
  result_scores = {
    result: [], 
    scores: []
  }; 

  var tableau  = [], 
      stack    = [], 
      stacklen = 0,
      init = () => { // init global before each search
        nextstack = [], 
        staged    = Object.create(null), 
        stats     = zeroArray(MAXSCORE + 2),
        loscore   = MAXSCORE, 
        midscore  = MAXSCORE, 
        hiscore   = 0, 
        totscore  = 0, 
        cnt       = 0
      },
      f = (d, n) => ('      ' + n + ' ').slice(-d);
      out = () => [
        ' depth=', f(4, depth),
        ' score=', f(4, loscore), 
                   f(4, midscore), 
                   f(4, hiscore), 
        ' stats[mid]=', f(6, stats[midscore]), 
                        f(6, stats[midscore + 1]), 
        ' stk=', f(6, stacklen), 
        ' p=',   f(7, size),
        ' cnt=', f(7, cnt)
      ].join('');

  init();
  var start = new Date().getTime();
  if (e.length) {
    tableau = e;
    console.log( message(tableau, '\n') );
    var entre         = new Entry(tableau);
    entre.value.score = heuristic(tableau);
    nextstack.push(entre);
  }

  while (depth < MAXDEPTH && nextstack.length > 0 && !found) {

  // _.merge(position, _.pickBy(nextstack, function(entry) {            
  //     if (entry.value.score <= midscore) { size++;
  //       stack.push(entry);
  //       return true;
  //     }
  //     return false;
  //   }))            

    var stack = nextstack.filter(function (entry) {   
      if (entry.value.score <= midscore) {
        position[entry.key] = entry.value; size++;
        return true;
      }
      return false;
    });
    stacklen = stack.length, depth++, init(); 

    for (var i = 0; i < stack.length; i++) {
      tableau = fromToken(stack[i]);
      search(tableau);
      if (found) break;
    }
    console.log(out());
  }
  position = nextstack = staged = null;  // free memory

  console.log(result_scores.scores.map(function (s, i) {
      return i++ + ':' + s;  // result.entry.value.score
    }, 0).join(' ')
  );
  var elapsed = (new Date().getTime() - start) / 1000 + 's';
  console.log(elapsed);

  return { 
    audit: '    d: ' + depth + ', p: ' + size + ', e: ' + elapsed, 
    result: result_scores.result 
  };
}

function search (tableau) {
  var nodelist = gen(tableau);
  for (var i = 0; i < nodelist.length; i++) {
    autoplay(tableau, nodelist[i]);

    var score = heuristic(tableau),
        entry = new Entry(tableau);
    entry.value.score = score,
    entry.value.depth = depth,
    entry.value.node  = nodelist[i];
    
    if (score < loscore) loscore = score;
    if (score > hiscore) hiscore = score;
    if (score > midscore      || // midscore tracks MAXNODES
        entry.key in position || // must search position for dups
        entry.key in staged) {   // must search staged   for dups
    } else {
      stats[score]++;
      totscore++;
      nextstack.push(entry);     // keep track of entry
      staged[entry.key] = true;  // keep track of entry.key
      
      if (isKings(tableau)) { 
        result_scores = backtrack(position, entry);
        found = true;
    } }

    while(totscore - stats[midscore] > MAXNODES) {
      totscore -= stats[midscore];
      midscore--; 
    }

    cnt++;
    if (found) break;
    undo(tableau, nodelist[i]);
  } 
}
/*
//
./module-entry.js
var quickSort = require('./module-sort');
*/
function Entry (tableau){ // Class

  this.value = { 
    token: [], 
    depth: 0, 
    score: 0, 
    node: [] 
  };
  var foundation = [], cascades = []; 
  // ascii = (a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  // quickSort 25% faster !
  for (var c = 0; c < MAXCOLS; c++){
    var i = tableau[c][0];
    if (i) foundation.push([String.fromCharCode(i), c]);

    for (var r = 1, str = ""; r < MAXROWS; r++){
      var j = tableau[c][r];
      if (j) str += String.fromCharCode(j);
    }
    if (str) cascades.push([str, c]);
  }

  // var f = foundation.sort(ascii)
  var f = quickSort(foundation)
    .map(function (p){ 
      this.value.token.push(p[1]);
      return p[0]; 
    }, this)
    .join("");

  // var k = cascades.sort(ascii)
  var k = quickSort(cascades)
    .map(function (p){
      this.value.token.push(p[1]);
      return p[0]; 
    }, this);

  this.key = [f].concat(k).join(" ");
}

/*
module.exports = Entry;
//
./module-fromToken.js
var zeroArray = require('./module-util').zeroArray;
*/
function fromToken (entry){
  var tableau = Array(8), c, r; 
  for (c = 0; c < MAXCOLS; c++)
    tableau[c] = zeroArray(MAXROWS);

  var cascades = entry.key.split(" ");  // cascades[0] is foundation
  for (c = 0; c < cascades[0].length; c++)  
    tableau[entry.value.token[c]][0] = cascades[0].charCodeAt(c);

  var offset = cascades[0].length - 1;
  for (c = 1; c < cascades.length; c++)
    for (r = 0; r < cascades[c].length; r++)
      tableau[entry.value.token[c + offset]][r + 1] = cascades[c].charCodeAt(r); 

  return tableau;
}

/*
module.exports = fromToken;
//
./module-heuristic.js
var util       = require('./module-util'),
    rank       = util.rank,
    zeroArray  = util.zeroArray,
    inSequence = util.inSequence;
*/
function heuristic (tableau) {
  var score = 64, // h = new Helper(tableau);
    z = zeroArray(MAXCOLS), ecount = 0, fcount = 0, eindex = -1, findex = -1;

  for(c=0;8>c;c++){   // helpers
    0 === rank(tableau[c][1])&&(ecount++,eindex<0&&(eindex=c)); 
    for(r=1;19>r&&0 !== rank(tableau[c][r]);r++) z[c]=r;
  }
  for(c=0;4>c;c++)
    0 === rank(tableau[c][0])&&(fcount++,findex<0&&(findex=c));

  for (var c = HOMEOFFSET; c < MAXCOLS; c++)
    score -= rank(tableau[c][0]);

  score -= ecount;
  score -= fcount;
  for (c = 0; c < MAXCOLS; c++){
    if (z[c] > 1)
      for (var r = 1; r < z[c]; r++){
        var src = tableau[c][r + 1];
        var dst = tableau[c][r];
        score  += inSequence(src, dst)  ? 0 : 1;
        score  += rank(src) > rank(dst) ? 1 : 0;
     // major sequence break if src > dst
     // score  += (ecount + fcount) ? 0 : 1; // penalty if 0
  }   } 
  return score;
}

/*
module.exports = heuristic;
//
./module-backtrack.js
var fromToken = require('./module-fromtoken');
var Entry     = require('./module-entry');
var undo      = require('./module-util').undo;
*/
function backtrack (position, entry){
  var result = [], 
      scores = []; 
  while (true) {
    scores.push(entry.value.score);
    if (entry.value.depth === 0) 
      break;
    result.push(entry.value.node); 

    tableau = fromToken(entry);
    undo(tableau, entry.value.node);
    entry = new Entry(tableau);
    entry.value = position[entry.key];
  } 
  return {
    result: result.reverse(), 
    scores: scores.reverse() 
  };
}
/*
module.exports = backtrack;
//
./module-sort.js
  http://blog.mgechev.com/2012/11/24/javascript-sorting-performance-quicksort-v8/
*/
var quickSort = (function () {

    function partition(array, left, right) {
        var cmp = array[right - 1][0], // [0] AoA!
            minEnd = left,
            maxEnd;
        for (maxEnd = left; maxEnd < right - 1; maxEnd += 1) {
            if (array[maxEnd][0] <= cmp) { // [0] AoA!
                swap(array, maxEnd, minEnd);
                minEnd += 1;
            }
        }
        swap(array, minEnd, right - 1);
        return minEnd;
    }

    function swap(array, i, j) {
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
        return array;
    }

    function quickSort(array, left, right) {
        if (left < right) {
            var p = partition(array, left, right);
            quickSort(array, left, p);
            quickSort(array, p + 1, right);
        }
        return array;
    }

    return function (array) {
        return quickSort(array, 0, array.length);
    };
})();
/*
module.exports = quickSort;
//
./module-gen.js
var util       = require('./module-util'),
    rank       = util.rank,
    suit       = util.suit,
    inSequence = util.inSequence;
*/                                                  // Sorry! uglify did this.
function gen (tableau){  
  var nodelist = [], node, src, c, r, j, k, x, y, // h = new Helper(tableau);
    z = [], ecount = 0, fcount = 0, eindex = -1, findex = -1;

  for(c=0;8>c;c++){   // helpers
    0 === rank(tableau[c][1])&&(ecount++,eindex<0&&(eindex=c)),z[c]=0;
    for(r=1;19>r&&0 !== rank(tableau[c][r]);r++) z[c]=r;
  }
  for(c=0;4>c;c++)
    0 === rank(tableau[c][0])&&(fcount++,findex<0&&(findex=c));

  for(c=0;4>c;c++){   // freecells
    src=tableau[c][0];
    if(rank(src) !== 0){
      rank(src)-1==rank(tableau[suit(src)+HOMEOFFSET][0])&&
        nodelist.push([[c,0,suit(src)+HOMEOFFSET,0,"fh"]]);

      ecount>0&&nodelist.push([[c,0,eindex,1,"fe"]]);

      for(j=0;8>j;j++)
        if(z[j] !== 0){
          node=[c,0,j,z[j]+1,"fc"];
          nodeSequence(tableau, node)&&nodelist.push([node]);
  } }   }

  for (c=0;c<8;c++){  // cascades
    if (z[c] === 0) continue;
    src = tableau[c][z[c]];
    rank(src)-1==rank(tableau[suit(src)+HOMEOFFSET][0])&&
      nodelist.push([[c,z[c],suit(src)+HOMEOFFSET,0,"ch"]]);

    fcount>0&&nodelist.push([[c,z[c],findex,0,"cf"]]);

    if (ecount>0){
      for (k=z[c]; k>1; k--){
        if(!(z[c] == k || nodeSequence(tableau, [c, k+1, c, k+1]))) // ce
          break;

        if(ecount*(fcount+1)>z[c]-k){
          for(node=[],x=k,y=1;x<=z[c];)
            node.push([c,x++,eindex,y++,"ce"]);
          nodelist.push(node);
    } } }

    for (j=0; j<8; j++){
      if (z[j] === 0 || j==c) continue;
      for (k=z[c]; k>0; k--){
        if(!(z[c] == k || nodeSequence(tableau, [c, k+1, c, k+1]))) // cc
          break;
        if ((ecount+1)*(fcount+1)>z[c]-k && 
            nodeSequence(tableau, [c, k, j, z[j]+1]) ){
          for (node=[],x=k,y=z[j]+1;x<=z[c];)
            node.push([c,x++,j,y++,'cc']);
          nodelist.push(node);
  } } } }
  return nodelist;
}

function nodeSequence (tableau, node){
  var src = tableau[node[0]][node[1]],
      dst = tableau[node[2]][node[3] - 1];
  return inSequence(src, dst);
}

/*
module.exports = gen;
//
./module-autoplay.js
var util = require('./module-util'),
    play = util.play,
    rank = util.rank,
    suit = util.suit;
*/
function autoplay (tableau, node){   // WARNING: mutates tableau & node!

// var tableau = $.extend(true, [], tableax);
  node.forEach(function (move) {
    play(this, move);
  }, tableau);

  var safe = true, c, r, src, move;
  while (safe) {
    safe = false;
    for (c = 0; c < MAXFREE; c++){
      src = tableau[c][0];
      if (!rank(src)) continue;
      if (rank(src) === rank(tableau[suit(src) + HOMEOFFSET][0]) + 1 &&
         (rank(src) < 3 || adjacentHomecells(tableau, src))){
        move = [c, 0, suit(src) + HOMEOFFSET, 0, 'afh'];
        node.push(move);
        play(tableau, move);
        safe = true;
    } }

    for (c = 0; c < MAXCOLS; c++){
      r = 0;
      while(rank(tableau[c][r + 1])) r++;
      if (!r) continue;
      src = tableau[c][r];
      if (rank(src) === rank(tableau[suit(src) + HOMEOFFSET][0]) + 1 &&
         (rank(src) < 3 || adjacentHomecells(tableau, src))){
        move = [c, r, suit(src) + HOMEOFFSET, 0, 'ach'];
        node.push(move);
        play(tableau, move);
        safe = true;
    } }
  }
  return node;
}    

function adjacentHomecells (tableau, src) {
  return ((src & 16) === 0 &&
     rank(src) <= rank(tableau[5][0]) + 1 &&
     rank(src) <= rank(tableau[7][0]) + 1
  ||
     (src & 16)  !== 0 &&
     rank(src) <= rank(tableau[4][0]) + 1 &&
     rank(src) <= rank(tableau[6][0]) + 1);
};

/*
module.exports = autoplay;
//
./module-util.js
*/
function play(tableau, move) {
  tableau[move[DSTCOL]][move[DSTROW]] = tableau[move[SRCCOL]][move[SRCROW]];
  tableau[move[SRCCOL]][move[SRCROW]] = 0;
}

function undo(tableau, node) {
  for (var i = node.length - 1; i >= 0; i--) {
    var move = node[i];
    tableau[move[SRCCOL]][move[SRCROW]] = tableau[move[DSTCOL]][move[DSTROW]];

    if (move[DSTROW] == 0 && 
      move[DSTCOL] >= HOMEOFFSET && 
      rank(tableau[move[DSTCOL]][move[DSTROW]]) > 1) { // homecell > Ace
      tableau[move[DSTCOL]][move[DSTROW]]--;
    } else {
      tableau[move[DSTCOL]][move[DSTROW]] = 0;
} } }

function message (tableau, sep, ascii){
  for (var msg = '\n' === sep ? sep : '', flag = true, r = 0, n, card; flag;){
    r > 0 && (flag = false); // bottom row blank ok!
    for (var c = 0; c < MAXCOLS; c++){
      n = tableau[c][r];
      card = ascii ? String.fromCharCode(n||32) : asString(n);
      n && (flag = true);  
      msg += card + " ";
    }   
    msg += sep, r++;
  } 
  return msg;
} 

function Card(src) {  // Class
  if (arguments.length == 2) {
    this.rank = arguments[0];
    this.suit = arguments[1];
  } else {
// <div class="img deck" style="background-position: 25% 60%; top: 250px; left: 0px;" id="6S"></div>
    var pos = src.css("backgroundPosition").match(/\d+/g);
    this.rank = pos[0] / 5 + 1;
    this.suit = pos[1] / 20;
} }
Card.prototype.toString = function () {return " A23456789TJQK" [this.rank] + "DCHS " [this.suit];};

// Array(20).fill(0); not in IE 11
var zeroArray = (len) => Array.apply(null, Array(len)).map(Number.prototype.valueOf, 0),

  isKings = (tableau) => { 
    for (var f = true, c = HOMEOFFSET; c < MAXCOLS; c++) {
      if (rank(tableau[c][0]) !== KING) { 
        f = false; 
        break; 
    } }
    return f; 
  },

  inSequence = (src, dst) => rank(src) + 1 == rank(dst) && (src & 16) !== (dst & 16),
  asString = (n) => n ? ' A23456789TJQK' [rank(n)] + 'DCHS ' [suit(n)] : '  ',
  rank = (r) => r      & 15, 
  suit = (s) => s >> 4 &  3;

/*
module.exports = {
  Card: Card,
  rank: rank,
  suit: suit,
  play: play,
  undo: undo,
  isKings: isKings,
  message: message,
  asString: asString,
  zeroArray: zeroArray,
  inSequence: inSequence
}
*/
module.exports = solve;