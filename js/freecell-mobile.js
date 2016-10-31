/*
 * Copyright 2015 Shirl Hart
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the the Artistic License (2.0). You may obtain a copy
 * of the full license at:
 *
 * http://www.perlfoundation.org/artistic_license_2_0
 *
 * Any use, modification, and distribution of the Standard or Modified
 * Versions is governed by this Artistic License. By using, modifying or
 * distributing the Package, you accept this license. Do not use, modify, or
 * distribute the Package, if you do not accept this license.
 *
 * If your Modified Version has been derived from a Modified Version made by
 * someone other than you, you are nevertheless required to ensure that your
 * Modified Version complies with the requirements of this license.
 *
 * This license does not grant you the right to use any trademark, service
 * mark, tradename, or logo of the Copyright Holder.
 *
 * This license includes the non-exclusive, worldwide, free-of-charge patent
 * license to make, have made, use, offer to sell, sell, import and otherwise
 * transfer the Package with respect to any patent claims licensable by the
 * Copyright Holder that are necessarily infringed by the Package. If you
 * institute patent litigation (including a cross-claim or counterclaim)
 * against any party alleging that the Package constitutes direct or
 * contributory patent infringement, then this Artistic License to you shall
 * terminate on the date that such litigation is filed.
 *
 * Disclaimer of Warranty: THE PACKAGE IS PROVIDED BY THE COPYRIGHT HOLDER
 * AND CONTRIBUTORS "AS IS' AND WITHOUT ANY EXPRESS OR IMPLIED WARRANTIES.
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE, OR NON-INFRINGEMENT ARE DISCLAIMED TO THE EXTENT PERMITTED BY
 * YOUR LOCAL LAW.  UNLESS REQUIRED BY LAW, NO COPYRIGHT HOLDER OR
 * CONTRIBUTOR WILL BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR
 * CONSEQUENTIAL DAMAGES ARISING IN ANY WAY OUT OF THE USE OF THE PACKAGE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * */

String.prototype.format = function () {
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function (m, n) { return args[n]; });
};

$(document).ready(function (){ 
    try {
      go.solver = new Worker('js/solver.js');
      go.solver.addEventListener('message', function(e) {
        if (e.data.result.length>0){
          stack.trimLists();
          stack.list = stack.list.concat(e.data.result);
          go.setSolved(true);
        }else{
          go.setSolved(false);
          $('.icon').eq(7).css("background-position", "40% 75%");
          setTimeout(function (){$('.icon').eq(7).css("background-position", "35% 75%");},2500); 
        }
        go.audit = e.data.audit;
        setTimeout(function (){$('.icon').eq(6).css({left: "-=1", top: "-=2"});},100); 
        go.isBusy = false;
        hint();
      }, false);
    } catch (e){
      go.webworker = false;
    }
    xhrrequest("~", false); // ping the server

    if (screen.width < 895.5) {
      $('meta[name=viewport]').attr('content','width=device-width, initial-scale='+(screen.width/895.5))
    }
 
    if (!!navigator.userAgent.match(/Android/)){ // works for Nexus 7
      var childheight = $('.container').width() * 
        (Math.max(screen.availWidth,screen.availHeight) - 74) / 
         Math.min(screen.availWidth,screen.availHeight);
      $('.container').css('height', childheight);
  }
  go.game = layout();
  setupLayout();
});

function setupLayout(){
  $('.container').html( go.game.layout );
  addEvents();  // game, list & nodelist init'd at page load & new game
  stack.index = 0, stack.hist = [], stack.tableauInit(), go.slow = go.NORMAL;
  go.setSolved(); // need to reset solve button
  gray();
  hint();
}

function hint(){
  // show/hide solved hint
  if(stack.isEof() || !go.isSolved){
    $('.hint').hide();
  } else {
    $('.hint').show();
    $('.hint').text( stack.move() );
  }

  // enable/disable frwd/bkwd buttoms
  $('.icon').eq(2).css("background-position", 
    stack.isEob() ? "10% 87.5%" : "10% 75%");
  $('.icon').eq(3).css("background-position", 
    stack.isEof() ? "15% 87.5%" : "15% 75%");

  $('.icon').eq(7).attr('title', "#" + go.game.gameno + " - click for help");
}

function gray(){
  // hilight gray next card to go home
  $( [0, 1, 2, 3]
    .map(function (i) {return [$('.homecell').eq(i).children().length + 1, i];})
    .filter(function (r) {return r[0] < 14;})
    .map(function (c) {return "#" + new Card(c[0],c[1]);})
    .join(", ")
   ).addClass('hilite-next');
}

function layout(){
  var shuffle = function (demo) {
    var seed = demo || Math.floor(Math.random() * 1000000000), 
      gameno = seed, 
      deck = [],
      i    = 52,
      rand = function() {
        seed = (seed * 214013 + 2531011) % 2147483648;
        return seed >> 16;
    };
    for (var j = 0; j < 52; j++) {deck.push(j);}
    while (--i) {
      j   = rand() % (i + 1);
      var tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    deck = deck.reverse();
    console.log("gameno: " + gameno);
    go.audit = "";
    return {
      deck: deck, 
      gameno: gameno,
      layout: null     // set below !
    };
  },
  card = shuffle(arguments[0]),

  fx = function(i) {
    return Math.floor(card.deck[i] / 4);
  },
  fy = function(i) {
    var y = card.deck[i] % 4; // swap D & C
    return y === 0 ? 1 : y === 1 ? 0 : y;
  },
  f0 = function() {
    return 0;
  },
  ft = function(i) {
    return Math.floor(i / 8);
  },
  fl = function(i, j) {
    return i - j * 8;
  },
  createDivs = function(cls, n, ofsLeft, ofsTop, imgWidth, imgHeight, ft, fl, bpx, bpy){ 
    for (var arrayDivs = [], i = 0; i < n; i++) {
      var y = ft(i), top = ofsTop  + y * imgHeight, x = fl(i, y), left = ofsLeft + x * imgWidth;
      arrayDivs.push( go.template.format(cls, bpx(i), bpy(i), top, left) );
    }
    return arrayDivs.join("");
  };

  card.layout = createDivs("icon",  8,  10,  10, 110, 0, ft, fl, function (i) {return 5 * i}, function (i) {return 75})+          //buttons
    createDivs("img freecell", 4,  10, 120, 110, 0, ft, fl, function (i) {return 65},    function (i) {return 80})+               //parent anchors
    createDivs("img homecell", 4, 450, 120, 110, 0, ft, fl, function (i) {return 65},    function (i) {return 20 * i})+           //parent anchors
    createDivs("img cascades", 8,  10, 280, 110, 0, ft, fl, function (i) {return 65},    function (i) {return 80})+               //parent anchors
    createDivs("img deck",    52,   0,   0, 110,  
                                    go.deltaHeight, ft, f0, function (i) {return  5 * fx(i)}, function (i) {return 20 * fy(i)})+  // children cards
    '<div class="bus"  style="display: none"></div>';
    // create bus last for z-index !

  return card;
}

function Card(src) {
  if (src === undefined){
    this.rank = 0;
    this.suit = 4;
  } else if (arguments.length==2) {
    this.rank = arguments[0];
    this.suit = arguments[1];
  } else {                    //        <div class="img deck" style="background-position: 25% 60%; top: 250px; left: 0px;" id="6S"></div>
    var pos = src.css('backgroundPosition').match(/\d+/g);
    this.rank = pos[0] / 5 + 1;
    this.suit = pos[1] / 20;
} };

Card.prototype = { 
  asuit: new Array("D","C","H","S"," "),
  arank: new Array(" ","A","2","3","4","5","6","7","8","9","T","J","Q","K"),
  toString: function (){
    return this.arank[this.rank]+this.asuit[this.suit];
  }
};

function inSequence(bot_card, top_card) { // used once in make-a-selection
  var src = new Card(bot_card);
  var dst = new Card(top_card);
  return (src.suit & 1) != (dst.suit & 1) && dst.rank == src.rank+1; 
}  

function nodeSequence(tableau, node) { // used 4 times in gen()
  var src = tableau[node[0]][node[1]],
      dst = tableau[node[2]][node[3]-1];
  return (src.suit & 1) != (dst.suit & 1) && dst.rank == src.rank+1;
}

function nodeString(tableau, node) { // used in stack.move to build hint
  var src = tableau[node[0]][node[1]].toString(),
      dst = node[3] > 1 ? tableau[node[2]][node[3]-1].toString() :
        node[3] == 1 ? 'e' : node[2] < 4 ? 'f' : 'h';
  return src + " " + dst;
}

// when a selection is made, hilite-yellow all available moves 
// if solved is also true and you choose the same selection,
// hilite-orange destination card and hilite-autoplay also

function checkAvailable() { 
  var node, src, hilite, i;
  removehilight('hilite-purple'); 
  hilite = $('.hilite-blue').map(function(){  // [div#6S.img.deck.hilite-blue, ...
    return new Card($( this )).toString();
  }).toArray().join(",");                     // "6S,5D,4C,3D"

  if (stack.nodelist[stack.index] === undefined) 
    stack.nodelist[stack.index] = gen(stack.tableau);
  for (i = 0; i < stack.nodelist[stack.index].length; i++){  // check if in all possible moves (nodelist)
    node = stack.nodelist[stack.index][i][0];
    src  = new Card(source(node)).toString();
    if (hilite.match(src))         // src="3D",node=[5, 9, 1, 0, "cf"]; src = "6S",node=[5, 6, 6, 6, "cc"]
      addhilight(node,'hilite-yellow');
  }
  if (go.isSolved){ 
    src = stack.list[stack.index].filter(function (node){  
      return node[4].match(/^(?!a)/);}).map(function(node){
        return new Card(source(node));
      }).join(",");
//  if (hilite === src){   
    if (hilite.match(src)){              // check if hilite is same as solved (list)
      node = stack.list[stack.index][0];
      addhilight(node,'hilite-orange');  // NOTE: already has hilite-yellow !
      stack.list[stack.index].filter(function (node){
        return node[4].match(/^a/);
      }).forEach(function(node){
        source(node).addClass('hilite-auto');
      });
} } }

function source(node) { // used above to hilite-auto
  return node[1] === 0 ? 
    $('.freecell').eq(node[0]).children() : 
    $('.cascades').eq(node[0]).children().eq(node[1]-1);
}

function addhilight(node, color) {         // add hilite to destination
  if (node[3] === 0){
    if(node[2]<4){
      $('.freecell').eq(node[2]).addClass(color);
    } else {
      var home = $('.homecell').eq(node[2]-4);
      if (home.children().length === 0){
        home.addClass(color);
      } else {
        home.children().last().addClass(color);
    } }
  } else if(node[3]==1){
    $('.cascades').eq(node[2]).addClass(color);
  } else {
    $('.cascades').eq(node[2]).children().last().addClass(color);
} }

function removehilight(extra) {                     // remove hilite
  $('.img').removeClass('hilite-yellow hilite-auto hilite-orange '+extra); 
}

// "destination selection ..."
function dstselectFree(element) {
  var dstparent = $('.freecell:empty:first');
  if (element.parent().hasClass('freecell')){
    removehilight('hilite-blue');
  } else if (dstparent.length==0) { // do nothing
  } else {
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row =  element.last().position().top / go.deltaHeight,
        dst_col = (dstparent.offset().left - 10) / 110,
        node = [];
    node.push([src_col, src_row+1, dst_col, 0, 'cf']);
    stack.add(autoplay(node));
    element.removeClass('hilite-blue').last().addClass('hilite-blue');
    redo();
  }
}

function dstselectHome(element) {
  var src = new Card(element.last()),
      dstparent = $('.homecell').eq(src.suit);
  if(dstparent.children().length == src.rank-1){
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row =  element.last().position().top / go.deltaHeight,
        node = [];
    if(element.parent().hasClass('freecell')){
      node.push([src_col, src_row, src.suit+4, 0, 'fh']);
    } else {
      node.push([src_col, src_row+1, src.suit+4, 0, 'ch']);
    }
    stack.add(autoplay(node));
    element.removeClass('hilite-blue').last().addClass('hilite-blue');
    redo();
  }
}

function dstselectCasc(element, $this) {
  var dstparent, dstofstop;
  if ($this.hasClass('cascades')){ // target is an empty column
    dstparent  = $('.cascades:empty:first');
    dstofstop  = 0;
  } else {
    dstparent  = $this.parent();
    dstofstop  =  dstparent.children().last().position().top + go.deltaHeight;
  }
  var src_col = (element.parent().offset().left - 10) / 110,
      dst_col = (dstparent.offset().left - 10) / 110,
      dst_row = dstofstop / go.deltaHeight,
      src_row = element.parent().children().length - 
               (element.parent().hasClass('freecell') ? 1 : 0),
      src     = stack.tableau[src_col][src_row].toString(),

      nodestr = stack.nodelist[stack.index].filter(function (list){
        return list[0][2] == this && list[0][3]  !== 0 && list.some(function (node){
          return stack.tableau[node[0]][node[1]].toString() == this;
        }, src);
      }, dst_col).map(function (list){
        return list.map(function(node){
          return stack.tableau[node[0]][node[1]].toString();
        }).join(",");
      }).join(",");

  if (!!nodestr &&  // NOTE: could also have hilite-orange FIX: #44098
     (dstparent.hasClass('hilite-yellow') || 
      dstparent.children().hasClass('hilite-yellow'))){
    element.each(function (){
      var card = new Card($( this )).toString();
      if (!nodestr.match(card))
        $( this ).removeClass('hilite-blue').addClass('hilite-purple');
    });

    element = $('.hilite-blue');
    setTimeout(function (){$('.deck').removeClass('hilite-purple');}, 2500);
    src_row = element.first().position().top / go.deltaHeight;

    var node = [], i;
    if(element.parent().hasClass('freecell')){
      if(dstofstop === 0){
        node.push([src_col, src_row, dst_col, 1, 'fe']);
      } else {
        node.push([src_col, src_row, dst_col, dst_row+1, 'fc']);
      }
    } else if(dstofstop === 0){
      for (i=0; i<element.length; i++){
        node.push([src_col, src_row+1+i, dst_col, 1+i, 'ce']);
      }
    } else {
      for (i=0; i<element.length; i++){
        node.push([src_col, src_row+1+i, dst_col, dst_row+1+i, 'cc']);
    } }
    stack.add(autoplay(node));
    redo();
} }

function addEvents() { 

  var n = 0, i;  // store shuffled deck into the cascades
  $('.deck').each(function (index, element){
    var card = $(element);
    card.attr('id', new Card(card).toString()); // used by beginFactory
    $('.cascades').eq(n++ % 8).append(card);
  });
  for (i=0; i < 7; i++) $('.icon').eq(i).attr('title', go.tooltips[i]);

  $('.deck, .freecell, .homecell, .cascades').on('click', function(){
    if (go.isBusy) return false;
    var $this = $(this);

  // was a hilite-blue cascade column clicked? toggle off
    if ($this.hasClass('hilite-blue') ||
        $this.parent().children().hasClass('hilite-blue')){
      removehilight('hilite-blue'); // hilite-purple');

  // "make a selection"
  // no hilite-blue cards? then hilite-blue excl. home 
    } else if ($('.hilite-blue').length === 0){
      if ($this.hasClass('deck')){
        if ($this.parent().hasClass('freecell')){
          $this.addClass('hilite-blue');
          checkAvailable();
        } else if ($this.parent().hasClass('cascades')){
          var child = $this.parent().children(),
              index = child.length-1;
          while(index > $this.index() &&
             inSequence(child.eq(index), child.eq(index-1))) index--;
          child.slice( index ).addClass('hilite-blue');
          checkAvailable();
        } else {}
      } else {}
    } else {
      var element = $('.hilite-blue'); 

  // "choose a destination"
      if ($this.hasClass('freecell') ||
          $this.parent().hasClass('freecell')){
        dstselectFree(element);

      } else if ($this.hasClass('homecell') ||
                 $this.parent().hasClass('homecell')){
        dstselectHome(element);

      } else {        
        dstselectCasc(element, $this);
    } }
    hint();
    return false;
  });

  $('.icon').on('click', function(){
    var $this = $(this);
    if (go.isBusy) return false;
  switch ($this.index()){

   case 0: // new game
    removehilight('hilite-blue hilite-purple');
    $this.css({left: "+=1", top: "+=2"});
    setTimeout(function (){
      $this.css({left: "-=1", top: "-=2"}); 
      // download your favorite images @ 2560x1600 from desktopnexus.com and rename to nexus[0-99].jpg
      // e.g. http://www.desktopnexus.com/search/dragonflies+maple+leaves/ - then uncomment next line
      if(!go.isMobile){ $('body').css('background-image', 'url("i/nexus' + go.nexus++ % 11 + '.jpg")'); }
      stack.nodelist = [];
      stack.list = [];
      go.setSolved(false);
      go.game = layout();
      setupLayout();
    },100);
    break;

   case 1: // reset game
    removehilight('hilite-blue hilite-purple');
    $this.css({left: "+=1", top: "+=2"});
    setTimeout(function (){
      $this.css({left: "-=1", top: "-=2"});
      setupLayout();
    },100);
    break;

   case 2: // undo
    if(!stack.isEob()){
      removehilight('hilite-blue hilite-purple');
      $this.css({left: "+=1", top: "+=2"});
      setTimeout(function (){$this.css({left: "-=1", top: "-=2"});},100);
      undo();
      stack.dec();
      hint();
    }
    break;

   case 3: // redo
    if(!stack.isEof()){
      $this.css({left: "+=1", top: "+=2"});
      setTimeout(function (){$this.css({left: "-=1", top: "-=2"});},100);
      stack.inc();
      redo();
      hint();
    }
    break;

   case 4: // info
    $this.css({left: "+=1", top: "+=2"});
    var gameint = prompt($('meta[name=viewport]').attr('content')+"\n\n"+go.audit+"\n\nPlease enter gameno: ", go.game.gameno);
    if (!!gameint && gameint.length < 10 && !!gameint.match(/^\d+$/)){
      gameint = parseInt(gameint, 10);
      if (gameint > 0){
        stack.nodelist = [];
        stack.list = [];
        go.setSolved(false);
        go.game = layout(gameint);
        setupLayout();
        audit = "";
    } }
    $this.css({left: "-=1", top: "-=2"});
    break;

   case 5: // speed
    $this.css({left: "+=1", top: "+=2"});
    setTimeout(function (){$this.css({left: "-=1", top: "-=2"});},100);
    go.setSpeed();
    break;

   case 6: // solve
    removehilight('hilite-blue hilite-purple');
    if (go.isSolved) {
      go.setSolved(false);
      hint();
      break;
    }
    if ($this.css('backgroundPosition') == "30% 87.5%") break;

    if (go.xhrconnect)
      xhrrequest(message('~'), true);
    else if (go.webworker){
      go.isBusy = true;
      $this.css({left: "+=1", top: "+=2"});
      $this.css("background-position", "35% 87.5%");
      go.solver.postMessage(stack.tableau);
    }
    break;

   case 7: // help
    location = "instructions.html";
  }
  return false;
 });
}

function message(sep) {
  var msg, flag, r, c, card;
  for (msg = "", flag = true, r = 0; flag; ) {
    r > 0 && (flag = false);
    for (c = 0; c < 8; c++) card = stack.tableau[c][r].toString(), card != "  " && (flag = true), msg += card + " ";
    msg += sep, r++;
  }
  return msg;
}

function xhrrequest(msg, flag) {
  go.xhrconnect = true;
  var xmlhttp = new XMLHttpRequest(), 
    icon = $('.icon').eq(6);
  if (flag) icon.css({left: "+=1", top: "+=2"});

  xmlhttp.onreadystatechange = function(){
    if (xmlhttp.readyState==4){ // done
      if (xmlhttp.status==200){ // normal response
        var resp = xmlhttp.responseText;
        if (resp.length){
          stack.trimLists();
          var result = resp.replace(/~/g, ",").replace(/([acefh]+)/g, '"$1"');
          stack.list = stack.list.concat(JSON.parse("["+result+"]"));
          go.setSolved(true);
        } else {
          go.setSolved(false);
          if (flag){
            $('.icon').eq(7).css("background-position", "40% 75%");
            setTimeout(function (){$('.icon').eq(7).css("background-position", "35% 75%");},2500); 
        } }
      } else {
        if (!go.webworker) $('.icon').eq(6).css("background-position", "30% 87.5%");
        go.xhrconnect = false;
      }
      go.isBusy = false;
      if (flag) {
        setTimeout(function (){$('.icon').eq(6).css({left: "-=1", top: "-=2"});},100); 
        hint();
  } } };

  stack.hist.push("HTTP:");
  var host = location.href;
  host = host.replace(/8080\/.+/, "8080/");
  if (host.match(/^http:/)) {
    xmlhttp.open("GET", host + "dynamic/solve/" + msg, true);
    go.isBusy = true;
    if (flag) icon.css("background-position", "35% 87.5%");
    try {
      xmlhttp.send();
    } catch(err) {
      if (!go.webworker) icon.css("background-position", "30% 87.5%");
      go.xhrconnect = false;
  } } else {
    if (!go.webworker) icon.css("background-position", "30% 87.5%");
    go.xhrconnect = false;
} }

function undo () {
  var node = stack.get(), seq = [], first = true;
  node = node.map(function (a){return [a[2], a[3], a[0], a[1], a[4]];});
  while( node[node.length-1][4].match(/^a/) ) 
    seq.push(playAll({entry: [node.pop()], 
      auto: true, frwd: false, done: false, first: first})); 
  seq.push(playAll({entry: node, auto: false, frwd: false, done: true, first: first}));
  //console.log(message('\n'));
  go.isBusy = true;
  $.Velocity.RunSequence(seq);
}

function redo () {
  var node = stack.get(), seq = [], heap = [], first = true;
  while( node.length && node[0][4].match(/^(?!a)/) ) 
    heap.push(node.shift());
  seq.push(playAll({entry: heap, 
    auto: false, frwd: true, done: node.length ? false : true, first: first}));
  while(node.length>0)
    seq.push(playAll({entry: [node.shift()], 
      auto: true, frwd: true, done: node.length ? false : true, first: first})); 
  //console.log(message('\n'));
  go.isBusy = true;
  $.Velocity.RunSequence(seq);
}

function beginFactory(ids) {
  function begin(){
    var src = $(ids);
    $('.bus').toggle().css({top: src.offset().top, left: src.offset().left});
    var ytop = 0;
    $('.bus').append(src).children()
      .each( function (){ 
        $( this ).css({top: ytop});
        ytop+=go.deltaHeight;
      });
  }
  return begin;
}

function completeFactory(dstparent, ytop, done, first, hilite) {
  function complete(){
    if (first) $('.img').removeClass('hilite-yellow hilite-orange hilite-next');
    $('.bus').children().removeClass(hilite);
    dstparent.append( $('.bus').toggle().children()
      .each( function (){
        $(this).css({top: ytop, left: 0}); // this==dst
        ytop+=go.deltaHeight;
      })
    );
    if (done) gray();
    go.isBusy = !done;
  }
  return complete;
}

function playAll(q) {
  var p = Play(q.entry),  // autoplay is twice as fast as redo & undo is twice as that !
    speed = function (p, q){ 
      return p.delta * (q.auto ? 0.5 : 1) * (q.frwd ? 1 : 0.5) * go.slow * 0.2;
    },
    result = {
      e: $('.bus'),
      p: {top: p.dst.offset().top + p.top * go.deltaHeight, left: p.dst.offset().left},      
      o: {duration: speed(p, q),
        begin: beginFactory( p.src.map(function (id){return "#" + id;}).join(", ") ), // .deck #id's
        complete: completeFactory(p.dst, p.top * go.deltaHeight, q.done, q.first, q.auto ? "hilite-auto": "hilite-blue") 
    } };

  q.entry.forEach(function (move) {
    stack.tableauPlay(move);
  });

  if (q.frwd){
    if (q.auto){
      $("#" + p.src).addClass('hilite-auto');
    } else {
      $( p.src.map(function (id){return "#" + id;}).join(", ") ).addClass('hilite-blue');
      p.dst.children().length ?
        p.dst.children().last().addClass('hilite-orange') :
        p.dst.addClass('hilite-orange');
    }
    if (stack.isKings()) go.setSolved(true);
  }
  q.first = false;
  return result;
}

function Play(entry) {
  var element = entry.map(function (move){
      return stack.tableau[move[0]][move[1]].toString();
    }),
    src_col = entry[0][0], src_row = entry[0][1], 
    dst_col = entry[0][2], dst_row = entry[0][3],
    dy = (src_row ? -280 - (src_row-1) * go.deltaHeight : -120),
    dstparent, dx;

  if (dst_row === 0){
    if (dst_col<4){
      dstparent = $('.freecell').eq(dst_col);
    } else {
      dstparent = $('.homecell').eq(dst_col-4);
    }
    dy += 120; 
  } else {
    dy += 280 + (dst_row-1) * go.deltaHeight;
    dst_row--;
    dstparent = $('.cascades').eq(dst_col);
  }
  dx = dstparent.offset().left - (10 + src_col * 110); // element.offset().left;
  return {src: element, dst: dstparent, top: dst_row,
          delta: Math.floor(Math.sqrt(dx * dx + dy * dy))
}; }

function autoplay(list) {
  var tableau = $.extend(true, [], stack.tableau),
    adjacentHomecells = function (src){
      return ((src.suit & 1) === 0 &&
         src.rank <= tableau[5][0].rank + 1 &&
         src.rank <= tableau[7][0].rank + 1
      ||
         (src.suit & 1)  !== 0 &&
         src.rank <= tableau[4][0].rank + 1 &&
         src.rank <= tableau[6][0].rank + 1);
    },
    play = function(move) {
      tableau[move[2]][move[3]] = tableau[move[0]][move[1]];
      tableau[move[0]][move[1]] = new Card();
    };

  list.forEach(function (move) {
    play(move);
  });

  var safe = true, c, r, src, entry;
  while (safe) {
    safe = false;
    for (c=0; c<4; c++){
      src = tableau[c][0];
      if (!src.rank) continue;
      if (src.rank == tableau[src.suit+4][0].rank + 1 &&
         (src.rank < 3 || adjacentHomecells(src))){
        entry = [c, 0, src.suit+4, 0, 'afh'];
        list.push(entry);
        play(entry);
        safe = true;
    } }

    for (c=0; c<8; c++){
      r = 0;
      while(tableau[c][r+1].rank) r++;
      if (!r) continue;
      src = tableau[c][r];
      if (src.rank == tableau[src.suit+4][0].rank + 1 &&
         (src.rank < 3 || adjacentHomecells(src))){
        entry = [c, r, src.suit+4, 0, 'ach'];
        list.push(entry);
        play(entry);
        safe = true;
    } }
  }
  return list;
}    

function gen(tableau) {

  var node, c, r, j, k, x, y, src, nodelist = [], 
    z = [], ecount = 0, fcount = 0, eindex = -1, findex = -1;

  for(c=0;8>c;c++){   // helpers
    0 === tableau[c][1].rank&&(ecount++,eindex<0&&(eindex=c)),z[c]=0;
    for(r=1;19>r&&0 !== tableau[c][r].rank;r++) z[c]=r;
  }
  for(c=0;4>c;c++)
    0 === tableau[c][0].rank&&(fcount++,findex<0&&(findex=c));

  for(c=0;4>c;c++){   // freecells
    src=tableau[c][0];
    if(src.rank !== 0){
      src.rank-1==tableau[src.suit+4][0].rank&&
        nodelist.push([[c,0,src.suit+4,0,"fh"]]);

      ecount>0&&nodelist.push([[c,0,eindex,1,"fe"]]);

      for(j=0;8>j;j++)
        if(z[j] !== 0){
          node=[c,0,j,z[j]+1,"fc"];
          nodeSequence(tableau, node)&&nodelist.push([node]);
  } }   }

  for (c=0;c<8;c++){  // cascades
    if (z[c] === 0) continue;
    src = tableau[c][z[c]];
    src.rank-1==tableau[src.suit+4][0].rank&&
      nodelist.push([[c,z[c],src.suit+4,0,"ch"]]);

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

function dump() { return JSON.stringify($.extend(go, stack)); } 

var stack = {
  list: [],         // init @ page load && new game  -- used by redo, undo & solve
  nodelist: [],     // init @ page load && new game  -- used to hilite, filled in by gen
  index: 0,         // init @ setup
  hist: [],         // init @ setup
  tableau: [],      // init @ setup       -- setupLayout -> initTableau = new Card
  trimLists: function (){
    while (this.list.length > this.index) this.list.pop();
    while (this.nodelist.length > this.index + 1) this.nodelist.pop();
  },
  add: function (entry){
    if (this.list.length == this.index){
      this.list.push(entry);
      this.hist.push("add: "+ this.move());
      this.index++;
    } else {
      this.hist.push("add: "+ this.move());
      if (JSON.stringify(entry) != JSON.stringify(this.list[this.index])  ){
        this.trimLists();
        this.list.push(entry); 
        this.index++;
        go.setSolved(false);
      } else {
        this.index++;  
  } } }, // get makes a copy for destructive undo & redo
  get:   function (){ return $.extend(true, [], this.list[this.index - 1]); }, 
  isEob: function (){ return this.index < 1; },
  isEof: function (){ return this.list.length == this.index; },
  isKings: function (){
    for(var f=!0,c=4;8>c;c++)if(13!=this.tableau[c][0].rank){f=!1;break;}return f;},
  dec:   function (){ 
    this.index--; 
    this.hist.push("dec: "+ this.move()); 
  },
  inc:   function (){ 
    this.hist.push("inc: "+ this.move()); 
    this.index++; 
  },
  move: function () {
    return nodeString(this.tableau, this.list[this.index][0]);
  }
}, go = { 
  isBusy: false, NORMAL: 4, slow: this.NORMAL, xhrconnect: true, solver: null, webworker: true, audit: "", nexus: 0,
  isMobile: !!("ontouchstart" in window), 
  deltaHeight: this.isMobile ? 69 : 50,
  template: '<div class="{0}" style="background-position: {1}% {2}%; top: {3}px; left: {4}px; "></div>',
  tooltips: ['new game','reset game','prev','next','info','speed','solve','hint'],
  isSolved: false,
  
  setSolved: function (flag){
    (this.isSolved = arguments.length > 0 ? flag : this.isSolved) ?
      $('.icon').eq(6).css("background-position", "30% 100%") :
    !(this.xhrconnect||this.webworker) ?
      $('.icon').eq(6).css("background-position", "30% 87.5%") :
      $('.icon').eq(6).css("background-position", "30% 75%"  );
  },
  setSpeed: function (){ 
    if (this.slow == this.NORMAL) {
      this.slow = 1;
      $('.icon').eq(5).css("background-position", "25% 87.5%");
    } else if (this.slow ==1){
      this.slow = 16;
      $('.icon').eq(5).css("background-position", "25% 100%");
    } else {
      this.slow = this.NORMAL;
      $('.icon').eq(5).css("background-position", "25% 75%");
    }
  }, game: null
};

// Uncaught DataCloneError: Failed to execute 'postMessage' 
//   if stack.tableau.init and stack.tableau.play
// the DataCloneError is from trying to pass an object with methods to postMessage
// go.solver.postMessage(JSON.parse(JSON.stringify(stack.tableau))); works!

stack.tableauInit = function (){
  for (var i = 0; i < 8; i++){
    stack.tableau[i] = [];
    stack.tableau[i][0] = new Card(); 
    var src = $('.cascades').eq(i).children();
    for (var j = 0; j < 19; j++){
      stack.tableau[i][j + 1] = new Card(j < src.length ? src.eq(j) : undefined);
} } };

stack.tableauPlay = function(move) {
  var src = stack.tableau[move[0]][move[1]];
  stack.tableau[move[2]][move[3]] = src;
  move[1] === 0 && move[0] >= 4 && src.rank > 1 ? 
    stack.tableau[move[0]][move[1]] = new Card(src.rank - 1, src.suit) : 
    stack.tableau[move[0]][move[1]] = new Card();
};

