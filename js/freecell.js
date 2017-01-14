"use strict";
$(document).ready(function () {
  initsolvers();
  initheight();
  go.game = layout();
  setupLayout();
});

function setupLayout() {
  addEvents(); // game, list & nodelist init'd at page load & new game
  stack.index = 0, stack.hist = [], stack.tableauInit(), go.speed = go.NORMAL;
  go.setSolved(); // need to reset solve button
  gray();
  hint();
}

function gray() {
  // hilight gray next card to go home
  $([0, 1, 2, 3].map(function (i) {
    return [$('.homecell').eq(i).children().length + 1, i];
  }).filter(function (r) {
    return r[0] < 14;
  }).map(function (c) {
    return "#" + new Card(c[0], c[1]);
  }).join(", ")).addClass('hilite-next');
}

function hint() {
  // show/hide solved hint
  if (stack.isEof() || !go.isSolved) {
    $('.hint').hide();
  } else {
    $('.hint').show();
    $('.hint').text(stack.move());
  }

  // enable/disable frwd/bkwd buttons
  $('.icon').eq(2).css("background-position", stack.isEob() ? "10% 87.5%" : "10% 75%");
  $('.icon').eq(3).css("background-position", stack.isEof() ? "15% 87.5%" : "15% 75%");

  $('.icon').eq(7).attr('title', "#" + go.game.gameno + " - click for help");
}

function message(sep) {
  var msg, flag, r, c, card;
  for (msg = "", flag = true, r = 0; flag;) {
    r > 0 && (flag = false);
    for (c = 0; c < 8; c++) {
      card = stack.tableau[c][r].toString(), card != "  " && (flag = true), msg += card + " ";
    }msg += sep, r++;
  }
  return msg;
}
//
function initsolvers() {
  try {
    go.solver = new Worker('js/solver.js');
    go.solver.addEventListener('message', function (e) {
      if (e.data.result.length > 0) {
        stack.trimLists();
        stack.list = stack.list.concat(e.data.result);
        go.setSolved(true);
      } else {
        go.setSolved(false);
        $('.icon').eq(7).css("background-position", "40% 75%"); // none (gray)
        setTimeout(function () {
          $('.icon').eq(7).css("background-position", "35% 75%"); // hint normal
        }, 2500);
      }
      go.audit = e.data.audit;
      go.isBusy = false;
      hint();
    }, false);
  } catch (e) {
    go.webworker = false;
  }
  xhrrequest("~", false); // ping the server
}

function xhrrequest(msg, flag) {
  stack.hist.push("HTTP:");
  go.isBusy = true;
  $('.icon').eq(6).css("background-position", "35% 87.5%"); // busy
  $.ajax({ url: "/dynamic/solve/" + msg }).done(function (resp) {
    go.isBusy = false;
    if (resp.length) {
      go.setSolved(true);
      stack.trimLists();
      var result = resp.replace(/~/g, ",").replace(/([acefh]+)/g, '"$1"');
      stack.list = stack.list.concat(JSON.parse("[" + result + "]"));
      hint();
    } else {
      go.setSolved(false);
      if (flag) {
        $('.icon').eq(7).css("background-position", "40% 75%"); // none (gray)
        setTimeout(function () {
          $('.icon').eq(7).css("background-position", "35% 75%"); // hint normal
        }, 2500);
      }
    }
  }).fail(function () {
    go.isBusy = false;
    go.xhrconnect = false;
    if (flag) {
      if (go.webworker) {
        go.isBusy = true;
        go.solver.postMessage(stack.tableau);
      } else {
        $('.icon').eq(6).css("background-position", "30% 87.5%"); // disabled
      }
    } else {
      go.setSolved(false);
    }
  });
}
//
function shuffle(demo) {
  var seed = demo || Math.floor(Math.random() * 1000000000),
      gameno = seed,
      deck = [],
      i = 52,
      rand = function rand() {
    seed = (seed * 214013 + 2531011) % 2147483648;
    return seed >> 16;
  };
  for (var j = 0; j < 52; j++) {
    deck.push(j);
  }
  while (--i) {
    j = rand() % (i + 1);
    var tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  deck = deck.reverse();
  console.log("gameno: " + gameno);
  go.audit = "";

  return {
    deck: deck,
    gameno: gameno
  };
}
//
var layout = (function () {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function (m, n) {
      return args[n];
    });
  };

  var template = '<div class="{0}" style="background-position: {1}% {2}%; top: {3}px; left: {4}px; "></div>',
    f0 = function ()     { return 0;                 },
    ft = function (i)    { return Math.floor(i / 8); },
    fl = function (i, y) { return i - y * 8;         },
    fx = function (i)    { return Math.floor(i / 4); },
    fy = function (i)    {    
      var y = i % 4; // swap D & C
      return y === 0 ? 1 : y === 1 ? 0 : y;
    };

  function createDivs(cls, n, ofsLeft, ofsTop, imgWidth, imgHeight, ft, fl, bpx, bpy) {
    for (var arrayDivs = [], i = 0; i < n; i++) {
      var y = ft(i),
          top = ofsTop + y * imgHeight,
          x = fl(i, y),
          left = ofsLeft + x * imgWidth;
      arrayDivs.push(template.format(cls, bpx(i), bpy(i), top, left));
    }
    return arrayDivs.join("");
  };

  return function () {
    var card = shuffle(arguments[0]);
    card.layout = [
      ["icon btn",     8,  10,  10, 110, 0, ft, fl, function (i){return 5*i;}, function () {return 75;}], 
      ["img freecell", 4,  10, 120, 110, 0, ft, fl, function () {return 65;},  function () {return 80;}], 
      ["img homecell", 4, 450, 120, 110, 0, ft, fl, function () {return 65;},  function (i){return 20*i;}], 
      ["img cascades", 8,  10, 280, 110, 0, ft, fl, function () {return 65;},  function () {return 80;}], 
      ["img deck",    52,   0,   0, 110, go.deltaHeight, ft, f0, 
        function (i){return 5 * fx(card.deck[i]);}, function (i){return 20 * fy(card.deck[i]);}]
    ].reduce(function (a, p) {
        return a += createDivs.apply(this, p);
      }, "") + '<div class="bus"  style="display: none"></div>';
    // create bus last for z-index ! -- velocity.js anchor
    return card;
  };
})();
//
function inSequence(bot_card, top_card) {
  // used once in make-a-selection
  var src = new Card(bot_card);
  var dst = new Card(top_card);
  return (src.suit & 1) != (dst.suit & 1) && dst.rank == src.rank + 1;
}

function addEvents() {
  $('.container').html(go.game.layout);
  if (!go.isMobile) $('.bus').addClass('scale');
  var n = 0, i; // store shuffled deck into the cascades
  $('.deck').each(function (index, element) {
    var card = $(element);
    card.attr('id', new Card(card).toString()); // used by beginFactory
    $('.cascades').eq(n++ % 8).append(card);
  });
  for (i = 0; i < 7; i++) {
    $('.icon').eq(i).attr('title', go.tooltips[i]);
  }
  $('.deck, .freecell, .homecell, .cascades').on('click', function () {
    if (go.isBusy) return false;
    var $this = $(this);

    // was a hilite-blue cascade column clicked? toggle off
    if ($this.hasClass('hilite-blue') || $this.parent().children().hasClass('hilite-blue')) {
      removehilight('hilite-blue'); // hilite-purple');

      // "make a selection"
      // no hilite-blue cards? then hilite-blue excl. home 
    } else if ($('.hilite-blue').length === 0) {
      if ($this.hasClass('deck')) {
        if ($this.parent().hasClass('freecell')) {
          $this.addClass('hilite-blue');
          checkAvailable();
        } else if ($this.parent().hasClass('cascades')) {
          var child = $this.parent().children(),
              index = child.length - 1;
          while (index > $this.index() && inSequence(child.eq(index), child.eq(index - 1))) {
            index--;
          }
          child.slice(index).addClass('hilite-blue');
          checkAvailable();
        } else {}
      } else {}
    } else {
      var element = $('.hilite-blue');

      // "choose a destination"
      if ($this.hasClass('freecell') || $this.parent().hasClass('freecell')) {
        dstselectFree(element);
      } else if ($this.hasClass('homecell') || $this.parent().hasClass('homecell')) {
        dstselectHome(element);
      } else {
        dstselectCasc(element, $this);
      }
    }
    hint();
    return false;
  });
  //
  $('.icon').on('click', function () {
    if (go.isBusy) return false;
    var $this = $(this);

    switch ($this.index()) {

      // new game - style="background-position: 0% 75%; top: 10px; left: 10px;"
      case 0:
        // download your favorite images @ 2560x1600 from desktopnexus.com and rename to nexus[12-99].jpg
        // e.g. http://www.desktopnexus.com/search/dragonflies+maple+leaves/ -- then increment next line
        if (!go.isMobile) {
          $('body').css('background-image', 'url("i/nexus' + go.nexus++ % 11 + '.jpg")');
        }
        stack.nodelist = [];
        stack.list = [];
        go.setSolved(false);
        go.game = layout();
        setupLayout();
        break;

      // reset game - style="background-position: 5% 75%; top: 10px; left: 120px;"
      case 1:
        setupLayout();
        break;

      // undo - style="background-position: 10% 75%;   top: 10px; left: 230px;" - enabled
      //        style="background-position: 10% 87.5%; top: 10px; left: 230px;" - disabled
      case 2:
        if (!stack.isEob()) {
          removehilight('hilite-purple');
          undo();
          stack.dec();
          hint();
        }
        break;

      // redo - style="background-position: 15% 75%;   top: 10px; left: 340px;" - enabled
      //        style="background-position: 15% 87.5%; top: 10px; left: 340px;" - disabled
      case 3:
        if (!stack.isEof()) {
          removehilight('hilite-purple');
          stack.inc();
          redo();
          hint();
        }
        break;

      // info - style="background-position: 20% 75%; top: 10px; left: 450px;"
      case 4:
        var gameint = prompt($('meta[name=viewport]').attr('content') + "\n\n" + 
            go.audit + "\n\nPlease enter gameno: ", go.game.gameno);
        if (gameint == "scale") $('.bus').hasClass('scale') ? $('.bus').removeClass('scale') : $('.bus').addClass('scale');
        if (gameint == "box"  ) $('.bus').hasClass('box')   ? $('.bus').removeClass('box')   : $('.bus').addClass('box');
        if (!!gameint && gameint.length < 10 && !!gameint.match(/^\d+$/)) {
          gameint = parseInt(gameint, 10);
          if (gameint > 0) {
            stack.nodelist = [];
            stack.list = [];
            go.setSolved(false);
            go.game = layout(gameint);
            setupLayout();
            go.audit = "";
          }
        }
        break;
      //
      // speed - style="background-position: 25% 75%;   top: 10px; left: 560px; " - normal
      //         style="background-position: 25% 87.5%; top: 10px; left: 560px; " - fast
      //         style="background-position: 25% 100%;  top: 10px; left: 560px; " - slow
      case 5:
        go.setSpeed();
        break;

      // solve - style="background-position: 30% 75%;   top: 10px; left: 670px; " - enabled
      //         style="background-position: 30% 87.5%; top: 10px; left: 670px; " - disabled
      //         style="background-position: 35% 87.5%; top: 10px; left: 670px; " - busy
      //         style="background-position: 30% 100%;  top: 10px; left: 670px; " - solved
      case 6:
        if ($this.css('backgroundPosition') == "30% 87.5%") // disabled
          break;

        if (go.isSolved) {
          go.setSolved(false);
          hint();
          break;
        }

        removehilight('hilite-blue hilite-purple');
        if (go.xhrconnect) xhrrequest(message('~'), true);else if (go.webworker) {
          go.isBusy = true;
          $this.css("background-position", "35% 87.5%"); // busy
          go.solver.postMessage(stack.tableau);
        }
        break;

      // help - style="background-position: 35% 75%; top: 10px; left: 780px; "
      //        style="background-position: 40% 75%; top: 10px; left: 780px; " - none (gray)
      case 7:
        // location = "instructions.html";
        $(".help").load("help.html", function () {
          $(".help").show();
          $('.hint').hide();
          $(".container").hide();
        });
    }
    return false;
  });
}

function closehelp() {
  $('.container').show();
  $('.help').hide();
  hint();
}

function initheight() {
  if (screen.width < 895.5) {
    $('meta[name=viewport]').attr('content', 'width=device-width, initial-scale=' + screen.width / 895.5);
  }

  if (!!navigator.userAgent.match(/Android.*AppleWebKit/i)) {
    // works for Nexus 7
    var childheight = $('.container').width() * 
      (Math.max(screen.availWidth, screen.availHeight) - 74) / 
       Math.min(screen.availWidth, screen.availHeight);
    $('.container').css('height', childheight);
  }
}
//
// when a selection is made, hilite-yellow all available moves 
// if solved is also true and you choose the same selection,
// hilite-orange destination card and hilite-autoplay also

function removehilight(extra) {
  // remove hilite
  $('.img').removeClass('hilite-yellow hilite-auto hilite-orange ' + extra);
}

  function addhilight(node, color) {
    // add hilite to destination
    if (node[3] === 0) {
      if (node[2] < 4) {
        $('.freecell').eq(node[2]).addClass(color);
      } else {
        var home = $('.homecell').eq(node[2] - 4);
        if (home.children().length === 0) {
          home.addClass(color);
        } else {
          home.children().last().addClass(color);
        }
      }
    } else if (node[3] == 1) {
      $('.cascades').eq(node[2]).addClass(color);
    } else {
      $('.cascades').eq(node[2]).children().last().addClass(color);
    }
  }

  function source(node) {
    // used below to hilite-auto
    return node[1] === 0 ? 
      $('.freecell').eq(node[0]).children() : 
      $('.cascades').eq(node[0]).children().eq(node[1] - 1);
  }
//
function checkAvailable() {
  var node, src, hilite, i;
  removehilight('hilite-purple');
  hilite = $('.hilite-blue').map(function () {
    // [div#6S.img.deck.hilite-blue, ...
    return new Card($(this)).toString();
  }).toArray().join(","); // "6S,5D,4C,3D"

    // gen all possible moves minus autoplay
  if (stack.nodelist[stack.index] === undefined) stack.nodelist[stack.index] = gen(stack.tableau); 
  for (i = 0; i < stack.nodelist[stack.index].length; i++) {
    // check if in all possible moves (nodelist)
    node = stack.nodelist[stack.index][i][0];
    src = new Card(source(node)).toString();
    if (hilite.match(src)) // src="3D",node=[5, 9, 1, 0, "cf"]; src = "6S",node=[5, 6, 6, 6, "cc"]
      addhilight(node, 'hilite-yellow');
  }
  if (go.isSolved) {
    // if isSolved is set, then show autoplay cards as well
    src = stack.list[stack.index].filter(function (node) {
      return node[4].match(/^(?!a)/);
    }).map(function (node) {
      return new Card(source(node));
    }).join(",");

    if (hilite.match(src)) {
      // check if hilite is same as solved (list)
      node = stack.list[stack.index][0];
      addhilight(node, 'hilite-orange'); // NOTE: already has hilite-yellow !
      stack.list[stack.index].filter(function (node) {
        return node[4].match(/^a/);
      }).forEach(function (node) {
        source(node).addClass('hilite-auto');
      });
} } }
//
// "destination selection ..."
function dstselectFree(element) {
  var dstparent = $('.freecell:empty:first');
  if (element.parent().hasClass('freecell')) {
    removehilight('hilite-blue');
  } else if (dstparent.length == 0) { 
  // do nothing
  } else {
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row = element.last().position().top / go.deltaHeight,
        dst_col = (dstparent.offset().left - 10) / 110,
        node = [];
    node.push([src_col, src_row + 1, dst_col, 0, 'cf']);
    stack.add(autoplay(node)); // append autoplay moves to node before adding to stack
    element.removeClass('hilite-blue').last().addClass('hilite-blue');
    redo();
  }
}

function dstselectHome(element) {
  var src = new Card(element.last()),
      dstparent = $('.homecell').eq(src.suit);
  if (dstparent.children().length == src.rank - 1) {
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row = element.last().position().top / go.deltaHeight,
        node = [];
    if (element.parent().hasClass('freecell')) {
      node.push([src_col, src_row, src.suit + 4, 0, 'fh']);
    } else {
      node.push([src_col, src_row + 1, src.suit + 4, 0, 'ch']);
    }
    stack.add(autoplay(node)); // append autoplay moves to node before adding to stack
    element.removeClass('hilite-blue').last().addClass('hilite-blue');
    redo();
  }
}
//
function dstselectCasc(element, $this) {
  var dstparent, dstofstop;
  // WARNING! if you click fast enough, you can cause $this.hasClass('cascades') && $this.children().length>0 to true. should just exit!
  if ($this.hasClass('cascades')) {
    // target is an empty column
    dstparent = $('.cascades:empty:first');
    dstofstop = 0;
  } else {
    dstparent = $this.parent();
    dstofstop = dstparent.children().last().position().top + go.deltaHeight;
  }
  var src_col = (element.parent().offset().left - 10) / 110,
      dst_col = (dstparent.offset().left - 10) / 110,
      dst_row = dstofstop / go.deltaHeight,
      src_row = element.parent().children().length - (element.parent().hasClass('freecell') ? 1 : 0),
      src = stack.tableau[src_col][src_row].toString(),
      nodestr = stack.nodelist[stack.index].filter(function (list) {
    return list[0][2] == this && list[0][3] !== 0 && list.some(function (node) {
      return stack.tableau[node[0]][node[1]].toString() == this;
    }, src);
  }, dst_col).map(function (list) {
    return list.map(function (node) {
      return stack.tableau[node[0]][node[1]].toString();
    }).join(",");
  }).join(",");

  if (!!nodestr && ( // NOTE: could also have hilite-orange FIX: #44098
  dstparent.hasClass('hilite-yellow') || dstparent.children().hasClass('hilite-yellow'))) {
    element.each(function () {
      var card = new Card($(this)).toString();
      if (!nodestr.match(card)) $(this).removeClass('hilite-blue').addClass('hilite-purple');
    });

    element = $('.hilite-blue');
    setTimeout(function () {
      $('.deck').removeClass('hilite-purple');
    }, 2500);
    src_row = element.first().position().top / go.deltaHeight;

    var node = [], i;
    if (element.parent().hasClass('freecell')) {
      if (dstofstop === 0) {
        node.push([src_col, src_row, dst_col, 1, 'fe']);
      } else {
        node.push([src_col, src_row, dst_col, dst_row + 1, 'fc']);
      }
    } else if (dstofstop === 0) {
      for (i = 0; i < element.length; i++) {
        node.push([src_col, src_row + 1 + i, dst_col, 1 + i, 'ce']);
      }
    } else {
      for (i = 0; i < element.length; i++) {
        node.push([src_col, src_row + 1 + i, dst_col, dst_row + 1 + i, 'cc']);
      }
    }
    stack.add(autoplay(node)); // append autoplay moves to node before adding to stack
    redo();
  }
}
//
function undo() {
  var node = stack.get(),
      seq = []; 
      go.first = true;
  node = node.map(function (a) {
    return [a[2], a[3], a[0], a[1], a[4]];
  });
  while (node[node.length - 1][4].match(/^a/)) {
    seq.push(buildSeq({ entry: [node.pop()],
      auto: true, frwd: false, done: false, first: go.first }));
  }seq.push(buildSeq({ entry: node,
    auto: false, frwd: false, done: true, first: go.first }));
  go.isBusy = true; /*1*/
  $.Velocity.RunSequence(seq);
}

function redo() {
  var node = stack.get(),
      seq = [],
      heap = [];go.first = true;
  while (node.length && node[0][4].match(/^(?!a)/)) {
    heap.push(node.shift());
  }seq.push(buildSeq({ entry: heap,
    auto: false, frwd: true, done: node.length ? false : true, first: go.first }));
  while (node.length > 0) {
    seq.push(buildSeq({ entry: [node.shift()],
      auto: true, frwd: true, done: node.length ? false : true, first: go.first }));
  }
  go.isBusy = true; /*3*/
  $.Velocity.RunSequence(seq);
}

// move bus into position then everyone on the bus !
function beginFactory(ids) {
  /*4*/
  function begin() {
    var src = $(ids);
    $('.bus').toggle().css({ top: src.offset().top, left: src.offset().left });
    var ytop = 0; // ytop is relative to .bus anchor
    $('.bus').append(src).children().each(function () {
      $(this).css({ top: ytop });
      ytop += go.deltaHeight;
    });
  }
  return begin;
}

// once in final position then everyone off the bus !
function completeFactory(dst, ytop, done, first, hilite) {
  /*5*/
  function complete() {
    if (first) $('.img').removeClass('hilite-yellow hilite-orange hilite-next');
    $('.bus').children().removeClass(hilite);
    dst.append($('.bus').toggle().children().each(function () {
      $(this).css({ top: ytop, left: 0 }); // this==dst, ytop is relative to dst anchor (.freecell, .homecell, .cascades)
      ytop += go.deltaHeight;
    }));
    if (done) {
      removehilight('hilite-blue');
      gray();
    }
    go.isBusy = !done;
  }
  return complete;
}
//
// Note. there are two different top and left offsets,  one relative to 
// .container, the other relative to an anchor (.homecell, .freecell, .cascades and .bus!)     
// .deck cards are always a child of some anchor

function buildSeq(q) {
  /*6*/
  var k = calc(q.entry),
      duration = function duration(k, q) {
      // autoplay is twice as fast as redo & undo is twice as that !
      return k.delta * (q.auto ? 0.5 : 1) * (q.frwd ? 1 : 0.5) * go.speed * 0.2;
  },
      result = {  // result is the runSequence object
    e: $('.bus'), // animate the .bus element (highest z-order!)
    p: { top: k.dst.offset().top + k.idx * go.deltaHeight, // final position relative to the .container
      left: k.dst.offset().left
    },
    o: { duration: duration(k, q), // the animate before and after functions uses closures!
      begin: beginFactory(k.src.map(function (id) {
        return "#" + id;
      }).join(", ")), // .deck #id's
      complete: completeFactory(k.dst, k.idx * go.deltaHeight, q.done, q.first, q.auto ? "hilite-auto" : "hilite-blue")
    }
  }; /*7*/

  q.entry.forEach(function (move) {
    stack.tableauPlay(move);
  });

  if (q.frwd) {
    if (q.auto) {
      $("#" + k.src).addClass('hilite-auto');
    } else {
      $(k.src.map(function (id) {
        return "#" + id;
      }).join(", ")).addClass('hilite-blue');
      k.dst.children().length ? k.dst.children().last().addClass('hilite-orange') : k.dst.addClass('hilite-orange');
    }
    if (stack.isKings()) go.setSolved(true);
  }
  go.first = false;
  return result;
}

function calc(entry) {
  var element = entry.map(function (move) {
    return stack.tableau[move[0]][move[1]].toString();
  }),
      src_col = entry[0][0],
      src_row = entry[0][1],
      dst_col = entry[0][2],
      dst_row = entry[0][3],
      dy = src_row ? -280 - (src_row - 1) * go.deltaHeight : -120,
      dstparent,
      dx,
      delta;

  if (dst_row === 0) {
    if (dst_col < 4) {
      dstparent = $('.freecell').eq(dst_col);
    } else {
      dstparent = $('.homecell').eq(dst_col - 4);
    }
    dy += 120;
  } else {
    dy += 280 + (dst_row - 1) * go.deltaHeight;
    dst_row--;
    dstparent = $('.cascades').eq(dst_col);
  }
  dx = dstparent.offset().left - (10 + src_col * 110); // element.offset().left;
  delta = Math.floor(Math.sqrt(dx * dx + dy * dy)); /*8*/

  return { src: element, dst: dstparent, idx: dst_row, delta: delta };
}
//
  function adjacentHomecells(tableau, src) {
    return (src.suit & 1) === 0 && 
      src.rank <= tableau[5][0].rank + 1 && 
      src.rank <= tableau[7][0].rank + 1 
    || 
      (src.suit & 1) !== 0 && 
      src.rank <= tableau[4][0].rank + 1 && 
      src.rank <= tableau[6][0].rank + 1;
  }

  function play(tableau, move) {
    tableau[move[2]][move[3]] = tableau[move[0]][move[1]];
    tableau[move[0]][move[1]] = new Card();
  }

function autoplay (list) {
  var tableau = $.extend(true, [], stack.tableau), safe = true, c, r, src, entry;
  list.forEach(function (move) {
    play(this, move);
  }, tableau);

  while (safe) {
    safe = false;
    for (c = 0; c < 4; c++) {
      src = tableau[c][0];
      if (!src.rank) continue;
      if (src.rank == tableau[src.suit + 4][0].rank + 1 && (src.rank < 3 || 
          adjacentHomecells(tableau, src))) {
        entry = [c, 0, src.suit + 4, 0, 'afh'];
        list.push(entry);
        play(tableau, entry);
        safe = true;
      }
    }

    for (c = 0; c < 8; c++) {
      r = 0;
      while (tableau[c][r + 1].rank) {
        r++;
      }if (!r) continue;
      src = tableau[c][r];
      if (src.rank == tableau[src.suit + 4][0].rank + 1 && (src.rank < 3 || 
          adjacentHomecells(tableau, src))) {
        entry = [c, r, src.suit + 4, 0, 'ach'];
        list.push(entry);
        play(tableau, entry);
        safe = true;
      }
    }
  }
  return list;
};
//
  function nodeSequence(tableau, node) {
    // used 4 times in gen()
    var src = tableau[node[0]][node[1]],
        dst = tableau[node[2]][node[3] - 1];
    return (src.suit & 1) != (dst.suit & 1) && dst.rank == src.rank + 1;
  }

function gen (tableau) {
    var node, c, r, j, k, x, y, src, 
        nodelist = [], z = [], ecount = 0, fcount = 0, eindex = -1, findex = -1;

    for (c = 0; 8 > c; c++) {
      // helpers
      0 === tableau[c][1].rank && (ecount++, eindex < 0 && (eindex = c)), z[c] = 0;
      for (r = 1; 19 > r && 0 !== tableau[c][r].rank; r++) {
        z[c] = r;
    } }
    for (c = 0; 4 > c; c++) {
      0 === tableau[c][0].rank && (fcount++, findex < 0 && (findex = c));
    }for (c = 0; 4 > c; c++) {
      // freecells
      src = tableau[c][0];
      if (src.rank !== 0) {
        src.rank - 1 == tableau[src.suit + 4][0].rank && nodelist.push([[c, 0, src.suit + 4, 0, "fh"]]);

        ecount > 0 && nodelist.push([[c, 0, eindex, 1, "fe"]]);

        for (j = 0; 8 > j; j++) {
          if (z[j] !== 0) {
            node = [c, 0, j, z[j] + 1, "fc"];
            nodeSequence(tableau, node) && nodelist.push([node]);
    } } } }

    for (c = 0; c < 8; c++) {
      // cascades
      if (z[c] === 0) continue;
      src = tableau[c][z[c]];
      src.rank - 1 == tableau[src.suit + 4][0].rank && nodelist.push([[c, z[c], src.suit + 4, 0, "ch"]]);

      fcount > 0 && nodelist.push([[c, z[c], findex, 0, "cf"]]);

      if (ecount > 0) {
        for (k = z[c]; k > 1; k--) {
          if (!(z[c] == k || nodeSequence(tableau, [c, k + 1, c, k + 1]))) // ce
            break;

          if (ecount * (fcount + 1) > z[c] - k) {  // e*(f+1)
            for (node = [], x = k, y = 1; x <= z[c];) {
              node.push([c, x++, eindex, y++, "ce"]);
            }
            nodelist.push(node);
      } } }

      for (j = 0; j < 8; j++) {
        if (z[j] === 0 || j == c) continue;
        for (k = z[c]; k > 0; k--) {
          if (!(z[c] == k || nodeSequence(tableau, [c, k + 1, c, k + 1]))) // cc
            break;
          if ((ecount + 1) * (fcount + 1) > z[c] - k && // (e+1)*(f+1)
          nodeSequence(tableau, [c, k, j, z[j] + 1])) {
            for (node = [], x = k, y = z[j] + 1; x <= z[c];) {
              node.push([c, x++, j, y++, 'cc']);
            } 
            nodelist.push(node);
    } } } }
    return nodelist;
  };
//
var stack = {
  list: [],     // init @ page load && new game  -- used by redo, undo & solve
  nodelist: [], // init @ page load && new game  -- used to hilite, filled in by gen
  index: 0,     // init @ setup
  hist: [],     // init @ setup
  tableau: [],  // init @ setup       -- setupLayout -> initTableau = new Card

  tableauInit: function tableauInit() {
    for (var i = 0; i < 8; i++) {
      this.tableau[i] = [];
      this.tableau[i][0] = new Card();
      var src = $('.cascades').eq(i).children();
      for (var j = 0; j < 19; j++) {
        this.tableau[i][j + 1] = new Card(j < src.length ? src.eq(j) : undefined);
  } } },
  tableauPlay: function tableauPlay(move) {
    var src = this.tableau[move[0]][move[1]];
    this.tableau[move[2]][move[3]] = src;
    move[1] === 0 && move[0] >= 4 && src.rank > 1 ? 
      this.tableau[move[0]][move[1]] = new Card(src.rank - 1, src.suit) : 
      this.tableau[move[0]][move[1]] = new Card();
  },
  trimLists: function trimLists() {
    while (this.list.length > this.index) {
      this.list.pop();
    }while (this.nodelist.length > this.index + 1) {
      this.nodelist.pop();
  } },
  add: function add(entry) {
    if (this.list.length == this.index) {
      this.list.push(entry);
      this.hist.push("add: " + this.move());
      this.index++;
    } else {
      this.hist.push("add: " + this.move());
      if (JSON.stringify(entry) != JSON.stringify(this.list[this.index])) {
        this.trimLists();
        this.list.push(entry);
        this.index++;
        go.setSolved(false);
      } else {
        this.index++;
  } } }, // get makes a copy for destructive undo & redo
  get: function get() {
    return $.extend(true, [], this.list[this.index - 1]);
  },
  isEob: function isEob() {
    return this.index < 1;
  },
  isEof: function isEof() {
    return this.list.length == this.index;
  },
  isKings: function isKings() {
    for (var f = !0, c = 4; 8 > c; c++) {
      if (13 != this.tableau[c][0].rank) {
        f = !1;break;
    } }
    return f;
  },
  dec: function dec() {
    this.index--;
    this.hist.push("dec: " + this.move());
  },
  inc: function inc() {
    this.hist.push("inc: " + this.move());
    this.index++;
  },
  move: function move() {
    var node = this.list[this.index][0],
    src = this.tableau[node[0]][node[1]].toString(),
        dst = node[3] > 1 ? this.tableau[node[2]][node[3] - 1].toString() : 
          node[3] == 1 ? 'e' : node[2] < 4 ? 'f' : 'h';
    return src + " " + dst;
} },

//
// global object
go = {
  FAST: 1, NORMAL: 4, SLOW: 16, speed: 4, solver: null, webworker: true, xhrconnect: true,
  isMobile: !!("ontouchstart" in window),
  tooltips: ['new game', 'reset game', 'prev', 'next', 'info', 'speed', 'solve', 'hint'],
  isBusy: false, isSolved: false, nexus: 0, first: false, audit: "", // game: null,

  setSolved: function setSolved(flag) {
    (this.isSolved = arguments.length > 0 ? flag : this.isSolved) ? 
      $('.icon').eq(6).css("background-position", "30% 100%") : // solved
    !(this.xhrconnect || this.webworker) ? 
      $('.icon').eq(6).css("background-position", "30% 87.5%") : // disabled
      $('.icon').eq(6).css("background-position", "30% 75%"); // enabled
  },

  setSpeed: function setSpeed() {
    if (this.speed == this.NORMAL) {
      this.speed = this.FAST;
      $('.icon').eq(5).css("background-position", "25% 87.5%"); // fast
    } else if (this.speed == this.FAST) {
      this.speed = this.SLOW;
      $('.icon').eq(5).css("background-position", "25% 100%"); // slow 
    } else {
      this.speed = this.NORMAL;
      $('.icon').eq(5).css("background-position", "25% 75%"); // normal
} } };
go.deltaHeight = go.isMobile ? 69 : 50;

function Card(src) {
  if (src === undefined) {
    this.rank = 0;
    this.suit = 4;
  } else if (arguments.length == 2) {
    this.rank = arguments[0];
    this.suit = arguments[1];
  } else {
    //  <div class="img deck" style="background-position: 25% 60%; top: 250px; left: 0px;" id="6S"></div>
    var pos = src.css('backgroundPosition').match(/\d+/g);
    this.rank = pos[0] / 5 + 1;
    this.suit = pos[1] / 20;
} }

Card.prototype = {
  asuit: new Array("D", "C", "H", "S", " "),
  arank: new Array(" ", "A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"),
  toString: function toString() {
    return this.arank[this.rank] + this.asuit[this.suit];
} };

function dump() { return JSON.stringify($.extend(go, stack)); }
