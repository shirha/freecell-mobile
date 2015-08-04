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

$(document).ready(function (){ 
  setupLayout();
});

function setupLayout(){
  if (firsttime){
    firsttime = false; 
    xhrrequest("~", false); // ping the server

    if (!!navigator.userAgent.match(/Android/)){ // works for Nexus 7
      var childheight = $('.container').width() * 
        (Math.max(window.screen.availWidth,window.screen.availHeight) - 74) / 
         Math.min(window.screen.availWidth,window.screen.availHeight);
      $('.container').css('height', childheight);
  } }

  $('.container').html( game.layout );
  addEvents();  // game, list & nodelist init'd at page load & new game
  stack.index = 0, stack.hist = [], stack.initTableau(), slow = NORMAL;
  setSolved(); // need to reset 'i' button
  hint();
}

function hint(){
  if(stack.isEof() || !isSolved){
    $('.hint').hide();
  } else {
    $('.hint').show();
    $('.hint').text( stack.move() );
  }
  $('.icon').eq(2).css("background-position", 
    stack.isEob() ? "10% 87.5%" : "10% 75%");
  $('.icon').eq(3).css("background-position", 
    stack.isEof() ? "15% 87.5%" : "15% 75%");

  $('.icon').eq(7).attr('title', "#" + game.gameno + " - click for help");
}

var busy = false, NORMAL = 4, slow = NORMAL, firsttime = true, xhrconnect = true, 
  isMobile = !!("ontouchstart" in window), 
  offset_height = isMobile ? 69 : 50,
  isSolved = false,
  setSolved = function (flag){
    (isSolved = arguments.length > 0 ? flag : isSolved) ?
      $('.icon').eq(6).css("background-position", "30% 100%") :
    xhrconnect ?
      $('.icon').eq(6).css("background-position", "30% 75%"  ) :
      $('.icon').eq(6).css("background-position", "30% 87.5%");
  },
  setSpeed = function (){
    if (slow == NORMAL) {
      slow = 1;
      $('.icon').eq(5).css("background-position", "25% 87.5%");
    } else if (slow ==1){
      slow = 16;
      $('.icon').eq(5).css("background-position", "25% 100%");
    } else {
      slow = NORMAL;
      $('.icon').eq(5).css("background-position", "25% 75%");
    }
  },
  tooltip = ['new game','reset game','prev','next','play','speed','solve','hint'],
  dump = function () { 
    return JSON.stringify($.extend(stack,{gameno: game.gameno}));
  },
  game = layout();

function layout(){
  var shuffle = function (demo) {
    var seed = demo || Math.floor(Math.random() * 100000), 
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
    return {
      deck: deck, 
      gameno: gameno
    };
  },
  fy = function(i, deck) {
    if ("undefined" == typeof deck) return 0;
    var y = deck[i] % 4; // swap D & C
    return 0 === y ? 1 : 1 == y ? 0 : y;
  },
  fx = function(i, deck) {
    return "undefined" == typeof deck ? i : Math.floor(deck[i] / 4);
  },
  fj = function(i) {
    return Math.floor(i / 8);
  },
  fk = function(i, j) {
    return i - 8 * j;
  },
  f0 = function() {
    return 0;
  },
  createDivs = function(cls, n, ofsleft, ofsheight, imgpad, imgwidth, imgheight,
                        fj, fk, fx, fy, deck) {
    for (var sliceArr = [], i = 0, bpx = 0, bpy = 0; n > i; i++) {
      var j = fj(i),
        k = fk(i, j);
      switch (cls) {
        case "icon":
          bpx = 5 * i, bpy = 75;
          break;
        case "img freecell":
          bpx = 65, bpy = 80;
          break;
        case "img homecell":
          bpx = 65, bpy = 20 * i;
          break;
        case "img cascades":
          bpx = 65, bpy = 80;
          break;
        case "img deck":
          bpx = 5 * fx(i, deck), bpy = 20 * fy(i, deck);
      }
      sliceArr.push('<div class="' + cls + 
        '" style="background-position: ' + bpx + "% " + bpy + "%; "+
        "left: " + (ofsleft + k * (imgwidth + imgpad)) + "px; "+
        "top: " + (ofsheight + j * imgheight) + 'px; "></div>');
    }
    return sliceArr.join("");
  },
  card   = shuffle(arguments[0]),
  divstr = createDivs("icon",  8,  10,  10, 10, 100,  0, fj, fk, fx, fy)+
    createDivs("img freecell", 4,  10, 120, 10, 100,  0, fj, fk)+
    createDivs("img homecell", 4, 450, 120, 10, 100,  0, fj, fk, fx, fy)+
    createDivs("img cascades", 8,  10, 280, 10, 100,  0, fj, fk)+
    createDivs("img deck",    52,   0,   0, 10, 100, offset_height, 
               fj, f0, fx, fy, card.deck)+
    '<div class="bus"  style="display: none"></div>';
      // create bus last for z-index !

  return $.extend(card, {layout: divstr}); // also deck:, gameno:
}

var stack = {
  move: function () {return nodeString(this.tableau, this.list[this.index][0]);},
  list: [],         // init @ page load && new game
  nodelist: [],     // init @ page load && new game
  index: 0,         // init @ setup
  hist: [],         // init @ setup
  tableau: [],      // init @ setup
  trimLists: function (){
    while (this.list.length > this.index) this.list.pop();
    while (this.nodelist.length > this.index+1) this.nodelist.pop();
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
        this.list.push(entry); this.index++;
        setSolved(false);
      } else {
        this.index++;  
  } } }, // get makes a copy for destructive undo & redo
  get:   function (){ return $.extend(true, [], this.list[this.index-1]); }, 
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
  initTableau: function (){ var i, j, src;
    for (i=0; i<4; i++){
      this.tableau[i] = new Array(20);
      src = $('.freecell').eq(i).children();
      this.tableau[i][0] = new Card(src.length>0 ? src.eq(0) : void 0);
    }
    for (i=0; i<4; i++){
      this.tableau[i+4] = new Array(20);
      src = $('.homecell').eq(i).children().last();
      this.tableau[i+4][0] = new Card(src.length>0 ? src.eq(0) : void 0);
    }
    for (i=0; i<8; i++){
      src = $('.cascades').eq(i).children();
      for (j=0; j<19; j++){
        this.tableau[i][j+1] = new Card(src.length>j ? src.eq(j) : void 0);
  } } },
  playTableau: function(move) {
    var src = this.tableau[move[0]][move[1]];
    this.tableau[move[2]][move[3]] = src;
    move[1] === 0 && move[0] >= 4 && src.rank > 1 ? 
      this.tableau[move[0]][move[1]] = new Card(src.rank - 1, src.suit) : 
      this.tableau[move[0]][move[1]] = new Card(); // void 0
  }
};

var Card = function (src){
  if (src === undefined){
    this.rank = 0;
    this.suit = 4;
  } else if (arguments.length==2) {
    this.rank = arguments[0];
    this.suit = arguments[1];
  } else {
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

function inSequence (bot_card, top_card){
  var src = new Card(bot_card);
  var dst = new Card(top_card);
  return (src.suit & 1) != (dst.suit & 1) && dst.rank == src.rank+1; 
}  

function nodeSequence (tableau, node){
  var src = tableau[node[0]][node[1]],
      dst = tableau[node[2]][node[3]-1];
  return (src.suit & 1) != (dst.suit & 1) && dst.rank == src.rank+1;
}

function nodeString (tableau, node){
  var src = tableau[node[0]][node[1]].toString(),
      dst = node[3] > 1 ? tableau[node[2]][node[3]-1].toString() :
        node[3] == 1 ? 'e' : node[2] < 4 ? 'f' : 'h';
  return src + " " + dst;
}

// when a selection is made, hilite-yellow all available moves 
// if solved is also true and you choose the same selection,
// hilite-orange destination card and hilite-autoplay also

function checkAvailable(){ var i, node, src, auto;
  removehilite('hilite-purple'); 
  var hilite = $('.hilite-blue').map(function(){
    return new Card($( this )).toString();}).toArray().join(",");

  if (stack.nodelist[stack.index] === undefined) 
    stack.nodelist[stack.index]=gen(stack.tableau);
  for (i=0; i<stack.nodelist[stack.index].length; i++){
    node = stack.nodelist[stack.index][i][0];
    src  = new Card(source(node)).toString();
    if (!hilite.match(src)) continue;
    hilight(node,'hilite-yellow');
  }
  if (isSolved){ 
    src = stack.list[stack.index].filter(function (node){
      return node[4].match(/^(?!a)/);}).map(function(node){
      return new Card(source(node));
      }).join(",");
    if (hilite == src){
      node = stack.list[stack.index][0];
      hilight(node,'hilite-orange');
      auto = stack.list[stack.index].filter(function (node){
        return node[4].match(/^a/);});
      auto.forEach(function(node){
        source(node).addClass('hilite-auto');
      });
} } }

function removehilite (extra){ 
  $('.img').removeClass('hilite-yellow hilite-auto hilite-orange '+extra); 
}

function source (node){
  return node[1] === 0 ? 
    $('.freecell').eq(node[0]).children() : 
    $('.cascades').eq(node[0]).children().eq(node[1]-1);
}

function hilight(node, color){
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

function dstselectFree(element) {
  var dstparent = $('.freecell:empty:first');
  if (dstparent.length==4 ||
      element.parent().hasClass('freecell')){
    removehilite('hilite-blue');
  } else {
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row =  element.last().position().top / offset_height,
        dst_col = (dstparent.offset().left - 10) / 110,
        node = [];
    node.push([src_col, src_row+1, dst_col, 0, 'cf']);
    stack.add(autoplay(node));
    element.removeClass('hilite-blue').last().addClass('hilite-blue');
    redo();
  }
}

function dstselectHome(element) {
  var src = new Card(element.last());
  dstparent = $('.homecell').eq(src.suit);
  if(dstparent.children().length == src.rank-1){
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row =  element.last().position().top / offset_height,
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
    dstofstop  =  dstparent.children().last().position().top + offset_height;
  }
  var src_col = (element.parent().offset().left - 10) / 110,
      dst_col = (dstparent.offset().left - 10) / 110,
      dst_row = dstofstop / offset_height,
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

  if (!!nodestr){
    element.each(function (){
      var card = new Card($( this )).toString();
      if (!nodestr.match(card)){
        $( this ).removeClass('hilite-blue').addClass('hilite-purple');
      }
    });

    element = $('.hilite-blue');
    setTimeout(function (){$('.deck').removeClass('hilite-purple');}, 2500);
    src_row = element.first().position().top / offset_height;

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

function addEvents(){ 
  var n = 0;  // store shuffled deck into the cascades
  $('.deck').each(function (index, element){
    var card = $(element);
    card.attr('id', new Card(card).toString()); // used by beginFactory
    $('.cascades').eq(n++ % 8).append(card);
  });
  for (var i=0; i < 7; i++) $('.icon').eq(i).attr('title', tooltip[i]);

  $('.deck, .freecell, .homecell, .cascades').on('click', function(){
    var $this = $(this);

  // was a hilite-blue cascade column clicked? toggle off
    if ($this.hasClass('hilite-blue') ||
        $this.parent().children().hasClass('hilite-blue')){
      removehilite('hilite-blue'); // hilite-purple');

  // no hilite-blue cards? then hilite-blue excl. home
    } else if ($('.hilite-blue').length === 0){
      if ($this.hasClass('deck')){
        if ($this.parent().hasClass('freecell')){
          $this.addClass('hilite-blue');
          checkAvailable(new Card($this));
        } else if ($this.parent().hasClass('cascades')){
          var child = $this.parent().children();
          var index = child.length-1;
          while(index > $this.index() &&
             inSequence(child.eq(index), child.eq(index-1))) index--;
          child.slice( index ).addClass('hilite-blue');
          checkAvailable(new Card($('.hilite-blue').first()));
        } else {}
      } else {}
    } else {
      if (busy) return false;
      var element = $('.hilite-blue'); 

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
    if (busy) return false;
  switch ($this.index()){

   case 0: // new game
    removehilite('hilite-blue hilite-purple');
    $this.css({left: "+=1", top: "+=2"});
    setTimeout(function (){
      $this.css({left: "-=1", top: "-=2"});
      // download your favorite images @ 2560x1600 from desktopnexus.com and rename to nexus[0-99].jpg
      // e.g. http://www.desktopnexus.com/search/dragonflies+maple+leaves/ - then uncomment next line
      $('body').css('background-image', 'url("i/nexus' + Math.floor(Math.random() * 11) + '.jpg")');
      game = layout();
      stack.nodelist = [];
      stack.list = [];
      setSolved(false);
      setupLayout();
    },100);
    break;

   case 1: // reset game
    removehilite('hilite-blue hilite-purple');
    $this.css({left: "+=1", top: "+=2"});
    setTimeout(function (){
      $this.css({left: "-=1", top: "-=2"});
      setupLayout();
    },100);
    break;

   case 2: // undo
    if(!stack.isEob()){
      removehilite('hilite-blue hilite-purple');
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

   case 4: // play
    $this.css({left: "+=1", top: "+=2"});
    var gameint = prompt("Please enter gameno: ");
    if (!!gameint && gameint.length < 7 && !!gameint.match(/^\d+$/)){
      gameint = parseInt(gameint, 10);
      if (gameint > 0){
        game = layout(gameint);
        stack.nodelist = [];
        stack.list = [];
        setSolved(false);
        setupLayout();
    } }
    $this.css({left: "-=1", top: "-=2"});
    break;

   case 5: // speed
    $this.css({left: "+=1", top: "+=2"});
    setTimeout(function (){$this.css({left: "-=1", top: "-=2"});},100);
    setSpeed();
    break;

   case 6: // solve
    removehilite('hilite-blue hilite-purple');
    if (isSolved) {
      setSolved(false);
      hint();
      break;
    }
    if ($this.css('backgroundPosition') == "30% 87.5%") break;

    xhrrequest(message('~'), true);
    break;

   case 7: // help
    window.location = "instructions.html";
  }
  return false;
 });
}

function message(sep){
  for (var msg = "", flag = true, r = 0; flag;){
    r > 0 && (flag = false); // bottom row blank ok!
    for (var c = 0; c < 8; c++){
      var card = stack.tableau[c][r].toString();
      card != "  " && (flag = true),  msg += card + " ";
    } 
    msg += sep, r++;
  } 
  return msg;
}

function xhrrequest(msg, flag){
  xhrconnect = true;
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
          setSolved(true);
      } } else {
        $('.icon').eq(6).css("background-position", "30% 87.5%");
        xhrconnect = false;
      }
      busy = false;
      if (flag) {
        setTimeout(function (){$('.icon').eq(6).css({left: "-=1", top: "-=2"});},100); 
        hint();
  } } };

  stack.hist.push("HTTP:");
  var host = window.location.href;
  host = host.replace(/8080\/.+/, "8080/");
  if (host.match(/^http:/)) {
    xmlhttp.open("GET", host + "dynamic/solve/" + msg, true);
    busy = true;
    if (flag) icon.css("background-position", "35% 87.5%");
    try {
      xmlhttp.send();
    } catch(err) {
      icon.css("background-position", "30% 87.5%");
      xhrconnect = false;
  } } else {
    icon.css("background-position", "30% 87.5%");
    xhrconnect = false;
} }

function undo (){
  var node = stack.get(), seq = [], first = true;
  node = node.map(function (a){return [a[2], a[3], a[0], a[1], a[4]];});
  while( node[node.length-1][4].match(/^a/) ) 
    seq.push(playAll({entry: [node.pop()], auto: true, frwd: false, done: false, first: first})); 
  seq.push(playAll({entry: node, auto: false, frwd: false, done: true, first: first}));
  //console.log(message('\n'));
  busy = true;
  $.Velocity.RunSequence(seq);
}

function redo (){
  var node = stack.get(), seq = [], heap = [], first = true;
  while( node.length && node[0][4].match(/^(?!a)/) ) 
    heap.push(node.shift());
  seq.push(playAll({entry: heap, 
    auto: false, frwd: true, done: node.length ? false : true, first: first}));
  while(node.length>0)
    seq.push(playAll({entry: [node.shift()], 
      auto: true, frwd: true, done: node.length ? false : true, first: first})); 
  //console.log(message('\n'));
  busy = true;
  $.Velocity.RunSequence(seq);
}

function beginFactory (ids){
  function begin(){
    var src = $(ids);
    $('.bus').toggle().css({top: src.offset().top, left: src.offset().left});
    var ytop = 0;
    $('.bus').append(src).children().each( function (){ 
      $( this ).css({top: ytop});
      ytop+=offset_height;
    });
  }
  return begin;
}

function completeFactory (dstparent, ytop, done, first, hilite){
  function complete(){
    if (first) $('.img').removeClass('hilite-yellow hilite-orange');
    $('.bus').children().removeClass(hilite);
    dstparent.append( $('.bus').toggle().children()
      .each( function (){
        $(this).css({top: ytop, left: 0}); // this==dst
        ytop+=offset_height;
      })
    );
    busy = !done;
  }
  return complete;
}

function playAll (q){
  var p = Play(q.entry),  // autoplay is twice as fast as redo & undo is twice as that !
    speed = function (p, q){ 
      return p.delta * (q.auto ? 0.5 : 1) * (q.frwd ? 1 : 0.5) * slow * 0.2;
    },
    result = {
      e: $('.bus'),
      p: {top: p.dst.offset().top + p.top * offset_height, left: p.dst.offset().left},      
      o: {duration: speed(p, q),
        begin: beginFactory( p.src.map(function (id){return "#" + id;}).join(", ") ), // .deck #id's
        complete: completeFactory(p.dst, p.top * offset_height, q.done, q.first, q.auto ? "hilite-auto": "hilite-blue") 
    } };

  q.entry.forEach(function (move) {
    stack.playTableau(move);
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
    if (stack.isKings()) setSolved(true);
  }
  q.first = false;
  return result;
}

function Play (entry){
  var element = entry.map(function (move){
      return stack.tableau[move[0]][move[1]].toString();
    }),
    src_col = entry[0][0], src_row = entry[0][1], 
    dst_col = entry[0][2], dst_row = entry[0][3],
    dy = (src_row ? -280 - (src_row-1) * offset_height : -120),
    dstparent;

  if (dst_row === 0){
    if (dst_col<4){
      dstparent = $('.freecell').eq(dst_col);
    } else {
      dstparent = $('.homecell').eq(dst_col-4);
    }
    dy += 120; 
  } else {
    dy += 280 + (dst_row-1) * offset_height;
    dst_row--;
    dstparent = $('.cascades').eq(dst_col);
  }
  var dx = dstparent.offset().left - (10 + src_col * 110); // element.offset().left;
  return {src: element, dst: dstparent, top: dst_row,
          delta: Math.floor(Math.sqrt(dx * dx + dy * dy))
}; }

function autoplay (list){
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

function gen(tableau){
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
