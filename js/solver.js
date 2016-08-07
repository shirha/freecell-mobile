self.addEventListener('message', function(e) {  // todo: Tableau class
  var start = new Date().getTime();
  var data = solve(e);
  var elapsed = (new Date().getTime() - start)/1000+'s';
  var log = '    d: '+depth+', p: '+size+', e: '+elapsed;
  self.postMessage({audit: log, result: data});
  console.log(elapsed);
  position = nextstack = nextkeys = null;
}, false);

var MAXCOLS = 8, MAXROWS = 20, HOMEOFFSET = 4, MAXDEPTH = 50, MAXNODES = 2000, MAXSCORE = 64+8+6*8*2,
  position = Object.create(null), size = depth = found = 0,

  rank = function (r){ return r      & 15 }, 
  suit = function (s){ return s >> 4 &  3 },
  isKings = function (tableau){ for (var f=!0, c=4; 8>c; c++) if (13 !== rank(tableau[c][0])){ f=!1; break; } return f; },
  zeroArray = function (len){ for (var i = 0, array = Array(len); i < len; ++i) array[i] = 0; return array; };

function Entry (tableau){ // Class
  this.value = { token: [], depth: 0, score: 0, node: [] };
  var foundation = [], cascades = [], self = this,
    ascii = function (a,b){ if (a[0] < b[0]) return -1; if (a[0] > b[0]) return 1; return 0; }; // quickSort 25% faster !
  for (var c = 0; c < MAXCOLS; c++){
    var i = tableau[c][0], str = "";
    if (i) foundation.push([String.fromCharCode(i), c]);
    for (var r = 1; r < MAXROWS; r++){
      var j = tableau[c][r];
      if (j) str += String.fromCharCode(j);
    }
    if (str) cascades.push([str, c]);
  }
//  var f = foundation.sort(ascii)
  var f = quickSort(foundation)
    .map(function (p){ 
      self.value.token.push(p[1]);
      return p[0]; 
    })
    .join("");
//  var k = cascades.sort(ascii)
  var k = quickSort(cascades)
    .map(function (p){
      self.value.token.push(p[1]);
      return p[0]; 
    });
  this.key = [f].concat(k).join(" ");
}


function fromToken (entry){
  var tableau = Array(8), cascades = entry.key.split(" "), c, r; // cascades[0] is foundation
  for (c = 0; c < MAXCOLS; c++)
    tableau[c] = zeroArray(20); //Array(20).fill(0); !IE

  for (c = 0; c < cascades[0].length; c++)
    tableau[entry.value.token[c]][0] = cascades[0].charCodeAt(c);

  var offset = cascades[0].length - 1;
  for (c = 1; c < cascades.length; c++)
    for (r = 0; r < cascades[c].length; r++)
      tableau[entry.value.token[c + offset]][r + 1] = cascades[c].charCodeAt(r); 

  return tableau;
}

function m (tableau){
  for (var msg = "\n", flag = true, r = 0; flag;){
    r > 0 && (flag = false); // bottom row blank ok!
    for (var c = 0; c < 8; c++){
      var card = tableau[c][r]?" A23456789TJQK"[rank(tableau[c][r])]+"DCHS"[suit(tableau[c][r])]:"  ";
      card !== "  " && (flag = true),  msg += card + " ";
    } msg += "\n", r++;
  } return msg;
} 

function solve (e){
  var tableau = [], stack = [], lvl = 0,
    init = function (){
      nextstack = [], nextkeys = Object.create(null), stats = zeroArray(MAXSCORE), loscore = midscore = MAXSCORE-2, hiscore = totscore = cnt = 0; 
    },
    out = function (){
      return 'depth='+f(depth,3)+' score='+f(loscore,3)+f(midscore,3)+f(hiscore,3)+' stats[mid]='+f(stats[midscore],5)+f(stats[midscore+1],5)+' lvl='+f(lvl,5)+' cnt='+f(cnt,6)+' p='+f(size,6); 
    },
    f = function (n, d){ 
      return ('      '+n+' ').substring( Number(n).toString().length +6-d ); 
    };

  for (var c = 0; c < MAXCOLS; c++) {
    tableau[c] = [];
    for (var r = 0; r < MAXROWS; r++) {
      tableau[c][r] = e.data[c][r].rank === 0 ? 0 : e.data[c][r].rank + e.data[c][r].suit * 16 + 64;
  } } 
  tableau = test(); 
  console.log( m(tableau) );
  
  init(), cnt++;
  var entre = new Entry(tableau);
  entre.value.score = loscore = hiscore = heuristic(tableau);
  midscore = MAXSCORE-2
  position[entre.key] = entre.value;
  nextstack.push(entre);
  console.log(out());

  while (depth < MAXDEPTH && nextstack.length > 0 && !found){
    var stack = nextstack.filter(function (entry) { 
      if (entry.value.score <= midscore) {
        position[entry.key] = entry.value; size++;
        return true;
      } 
      return false;
    });
    lvl = stack.length, depth++;

    init(); 
    for (var i = 0; i < stack.length; i++){
      tableau = fromToken(stack[i]);
      search(tableau);
      if (found) break;
    }
    console.log(out());
  }
  console.log(scores.reverse().map(function (s, i){return i+++':'+s},0).join(' '));
  return result.reverse();
}

var nextstack, nextkeys, stats, loscore, midscore, hiscore, totscore, cnt;
function search (tableau) {
  var nodelist = gen(tableau);
  for (var i = 0; i < nodelist.length; i++){
    for (var j = 0; j < nodelist[i].length; j++)
      play(tableau, nodelist[i][j]);
    autoplay(tableau, nodelist[i]);

    var entry = new Entry(tableau), score;
        entry.value.depth = depth;
        entry.value.node  = nodelist[i];
        entry.value.score = score = heuristic(tableau);
    
        if (score < loscore) loscore = score;
        if (score > hiscore) hiscore = score;
    if (!(score > midscore)){ 
      if (!(entry.key in position)){
        if (!(entry.key in nextkeys)){
          stats[score]++; // bug if moved up, cnts dups, breaks while
          totscore++;
          nextstack.push(entry);
          nextkeys[entry.key] = true;
          
          if (isKings(tableau)){ // !score
            backtrack(entry);
            found = true;
    } } } }
    while(totscore - stats[midscore] > MAXNODES){
      totscore -= stats[midscore];
      midscore--; 
    }
    cnt++;
    if (found) break;
    undo(tableau, nodelist[i]);
} }

var result = [], scores = []; 
function backtrack (entry){
  while (true) {
    scores.push(entry.value.score);
    if (entry.value.depth == 0) break;
    result.push(entry.value.node); 

    tableau = fromToken(entry);
    undo(tableau, entry.value.node);
    entry = new Entry(tableau);
    entry.value = position[entry.key];
} }

// http://blog.mgechev.com/2012/11/24/javascript-sorting-performance-quicksort-v8/
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
}()); // IIFE

function heuristic (tableau) {
  var score = 64; //, h = new Helper(tableau);
    z = zeroArray(8), ecount = fcount = 0, eindex = findex = -1;

  for(c=0;8>c;c++){   // helpers
    0 === rank(tableau[c][1])&&(ecount++,eindex<0&&(eindex=c)); //,z[c]=0;
    for(r=1;19>r&&0 !== rank(tableau[c][r]);r++) z[c]=r;
  }
  for(c=0;4>c;c++)
    0 === rank(tableau[c][0])&&(fcount++,findex<0&&(findex=c));

  for (var c = HOMEOFFSET; c < MAXCOLS; c++)
    score -= rank(tableau[c][0]);

  // score += (ecount + fcount) ? 0 : 1; // penalty if 0
  score -= ecount;
  score -= fcount;
  for (c = 0; c < MAXCOLS; c++){
    if (z[c] > 1)
      for (var r = 1; r < z[c]; r++){
        var src = tableau[c][r + 1];
        var dst = tableau[c][r];
        score  += inSequence(src, dst)  ? 0 : 1;
        score  += rank(src) < rank(dst) ? 0 : 1;
  }   } // major sequence break if !src < dst
  return score;
}

var SRCCOL = 0, SRCROW = 1, DSTCOL = 2, DSTROW = 3;

function play (tableau, move) {
  tableau[move[DSTCOL]][move[DSTROW]] = tableau[move[SRCCOL]][move[SRCROW]];
  tableau[move[SRCCOL]][move[SRCROW]] = 0;
};

function undo (tableau, node){
  for (var i = node.length - 1; i >= 0; i--){
    var move = node[i];
    tableau[move[SRCCOL]][move[SRCROW]] = tableau[move[DSTCOL]][move[DSTROW]];

    if (move[DSTROW] == 0 
    &&  move[DSTCOL] >= HOMEOFFSET 
    &&  rank(tableau[move[DSTCOL]][move[DSTROW]]) > 1) { // homecell > Ace
      tableau[move[DSTCOL]][move[DSTROW]]--;
    } else {
      tableau[move[DSTCOL]][move[DSTROW]] = 0;
} } }

function autoplay (tableau, node){         // WARNING: updates tableau & node!
  var adjacentHomecells = function (src){
      return ((src & 16) === 0 &&
         rank(src) <= rank(tableau[5][0]) + 1 &&
         rank(src) <= rank(tableau[7][0]) + 1
      ||
         (src & 16)  !== 0 &&
         rank(src) <= rank(tableau[4][0]) + 1 &&
         rank(src) <= rank(tableau[6][0]) + 1);
    };

  var safe = true, c, r, src, move;
  while (safe) {
    safe = false;
    for (c=0; c<4; c++){
      src = tableau[c][0];
      if (!rank(src)) continue;
      if (rank(src) == rank(tableau[suit(src)+HOMEOFFSET][0]) + 1 &&
         (rank(src) < 3 || adjacentHomecells(src))){
        move = [c, 0, suit(src)+HOMEOFFSET, 0, 'afh'];
        node.push(move);
        play(tableau, move);
        safe = true;
    } }

    for (c=0; c<8; c++){
      r = 0;
      while(rank(tableau[c][r+1])) r++;
      if (!r) continue;
      src = tableau[c][r];
      if (rank(src) == rank(tableau[suit(src)+HOMEOFFSET][0]) + 1 &&
         (rank(src) < 3 || adjacentHomecells(src))){
        move = [c, r, suit(src)+HOMEOFFSET, 0, 'ach'];
        node.push(move);
        play(tableau, move);
        safe = true;
    } }
  }
  //return node;
}    

function inSequence (src, dst){ 
  return rank(src) + 1 == rank(dst) && (src & 16) !== (dst & 16); 
}

function nodeSequence (tableau, node){
  var src = tableau[node[0]][node[1]],
      dst = tableau[node[2]][node[3] - 1];
  return inSequence(src, dst);
}

function gen (tableau){
  var nodelist = [], node, src, c, r, j, k, x, y, //h = new Helper(tableau);
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
