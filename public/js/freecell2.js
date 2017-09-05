"use strict";
$(document).ready(function () {
  initservers();
  initialize();
  stack.init();
  setupLayout();
});

function setupLayout() {
  addEvents(); 
  stack.rset(); // game, list & nodelist init'd at page load & new game
  if (go.options.box) $('.bus').addClass("box");
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
  }).join(", ")).addClass(go.hilite.next);
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

// when a selection is made, hilite-yellow all available moves 
// if solved is also true and you choose the same selection,
// hilite-orange destination card and hilite-autoplay also

function removehilight(extra) {
  $('.img').removeClass([go.hilite.yellow, go.hilite.auto, go.hilite.orange, extra].join(' '));
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

  return {
    deck: deck,
    gameno: gameno
  };
}

var layout = (function () {

  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function (m, n) {
      return args[n];
    });
  };

  var template = '<div class="{0}" style="background-position: {1}% {2}%; top: {3}px; left: {4}px; "></div>',
    f0 = ()     => 0,
    ft = (i)    => Math.floor(i / 8),
    fl = (i, y) => i - y * 8,
    fx = (i)    => Math.floor(i / 4),
    fy = (i)    => {    
      var y = i % 4;    // swap D & C
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

  return function (deltaHeight, gameno) {
    var card = shuffle(gameno);
    card.layout = [
      [ "icon btn",     8,  10,  10, 110, 0, ft, fl, (i) => 5*i, ()  => 75   ], 
      [ "img freecell", 4,  10, 120, 110, 0, ft, fl, ()  => 65,  ()  => 80   ], 
      [ "img homecell", 4, 450, 120, 110, 0, ft, fl, ()  => 65,  (i) => 20*i ], 
      [ "img cascades", 8,  10, 280, 110, 0, ft, fl, ()  => 65,  ()  => 80   ], 
      [ "img deck",    52,   0,   0, 110, deltaHeight, ft, f0, 
        (i) => 5 * fx(card.deck[i]), (i) => 20 * fy(card.deck[i]) ]
    ]
    .reduce(function (divs, clas) {
        return divs += createDivs.apply(this, clas);
      },                            // preload spysheet.png
      "") + '<div class="bus"></div><div class="busy"></div>'; 
    // create bus last for z-index ! -- velocity.js anchor
    return card;
  };
})();

//
function testservers () {
  if (go.javaserver || go.nodeserver || go.webworker) {
    $('.icon').eq(6).css("background-position", "30% 75%"); // enabled
  } else {
    $('.icon').eq(6).css("background-position", "30% 87.5%"); // disabled
  }
}

function initservers() {
  javarequest("~");
  noderequest([]);

  try {
    go.solver = new Worker('js/solver-work.js');
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
      clearInterval(window._busy);
    }, false);
  } catch (e) {
    console.log(e);
    go.isBusy = false;
    go.webworker = false;
    testservers();
    clearInterval(window._busy);
  }
}
//
function noderequest(message) { 
  var post = {
    type: "POST",
    url: "/solve",
    dataType: "json",
    data: JSON.stringify(message),
    contentType: "application/json; charset=utf-8"
  };
  $.ajax(post)
    .done(function (resp) {
//      console.log(JSON.stringify({message: message, resp: resp}));
      if (message.length === 0) {
      } 
      else if (resp.result.length > 0) {
        go.setSolved(true);
        stack.trimLists();
        stack.list = stack.list.concat(resp.result);
      } 
      else {
        go.setSolved(false);
        $('.icon').eq(7).css("background-position", "40% 75%"); // none (gray)
        setTimeout(function () {
          $('.icon').eq(7).css("background-position", "35% 75%"); // hint normal
        }, 2500);
      }
      go.audit = resp.audit;
      go.isBusy = false;
      hint();
      clearInterval(window._busy);
    })
    .fail(function () {
      go.isBusy = false;
      go.nodeserver = false;
      testservers();
      clearInterval(window._busy);
    });
}

function javarequest(message) { 
  $.ajax({ url: "/dynamic/solve/" + message })
    .done(function (resp) {
      if (message === "~") {
      }
      else if (resp.length) {
        go.setSolved(true);
        stack.trimLists();
        var result = resp.replace(/~/g, ",").replace(/([acefh]+)/g, '"$1"');
        stack.list = stack.list.concat(JSON.parse("[" + result + "]"));
      } 
      else {
        go.setSolved(false);
        $('.icon').eq(7).css("background-position", "40% 75%"); // none (gray)
        setTimeout(function () {
          $('.icon').eq(7).css("background-position", "35% 75%"); // hint normal
        }, 2500);
      }
      go.audit = '';
      go.isBusy = false;
      hint();
      clearInterval(window._busy);
    })
    .fail(function () {
      go.isBusy = false;
      go.javaserver = false;
      testservers();
      clearInterval(window._busy);
    });
}
//
function cardSequence(bot_card, top_card) { // used once in make-a-selection
  var src = new Card(bot_card);
  var dst = new Card(top_card);
  return src.rank + 1 === dst.rank && (src.suit & 1) !== (dst.suit & 1);
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

    // was a hilite-blue freecell or cascade column clicked? toggle off
    if ($this.hasClass(go.hilite.blue) || 
      $this.parent().children().hasClass(go.hilite.blue)) {
        removehilight(go.hilite.blue); 

      // "make a selection"
      // no hilite-blue cards? then hilite-blue excl. home 
    } else if ($('.' + go.hilite.blue).length === 0) {
      if ($this.hasClass('deck')) {
        if ($this.parent().hasClass('freecell')) {
          $this.addClass(go.hilite.blue);
          checkAvailable();
        } else if ($this.parent().hasClass('cascades')) {
          var child = $this.parent().children(),
              index = child.length - 1;
          while (index > $this.index() && 
            cardSequence(child.eq(index), child.eq(index - 1))) {
              index--;
          }
          child.slice(index).addClass(go.hilite.blue);
          checkAvailable();
        } else {}
      } else {}
    } else {
      var element = $('.' + go.hilite.blue);

      // "choose a destination"
      if ($this.hasClass('freecell') || 
        $this.parent().hasClass('freecell')) {
          dstselectFree(element);
      } else if ($this.hasClass('homecell') || 
        $this.parent().hasClass('homecell')) {
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
        // http://www.desktopnexus.com/search/dragonflies+maple+leaves/
        // download your favorite images @ 2560x1600 from desktopnexus.com 
        // and rename them to nexus[12-99].jpg then increment next line
        if (go.options.bkg) {
          $('body').css('background-image', 'url("i/nexus' + go.nexus++ % 11 + '.jpg")');
        }
        stack.init();
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
          removehilight(go.hilite.purple);
          bkwd();
          stack.dec();
          hint();
        }
        break;

      // redo - style="background-position: 15% 75%;   top: 10px; left: 340px;" - enabled
      //        style="background-position: 15% 87.5%; top: 10px; left: 340px;" - disabled
      case 3:
        if (!stack.isEof()) {
          removehilight(go.hilite.purple);
          stack.inc();
          frwd();
          hint();
        }
        break;

      // info - style="background-position: 20% 75%; top: 10px; left: 450px;"
      case 4:
        $('#gameno').val(go.game.gameno);
        $('#elapsed').html('<table>' + go.options.screen + 
          '<tr><td colspan=4>' + go.audit + '</table>');
        $(".options").fadeIn('fast'); //'slow', function () {
      //$(".options").fadeIn.show();

          var focusedElement;
          $(document).on('focus', '#gameno', function () {
            if (focusedElement == this) return;
            focusedElement = this;
            setTimeout(function () { focusedElement.select(); }, 50);
          });

//      });
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
        if ($this.css('background-position') == "30% 87.5%") // disabled
          break;

        if (go.isSolved) {
          go.setSolved(false);
          hint();
          break;
        }
        // go.javaserver = true;
        removehilight('hilite-blue');
        if (go.javaserver) {
          go.isBusy = true;
          startinterval($this);
          javarequest( message(stack.tableau, '~') );
        } else if (go.nodeserver) {
          go.isBusy = true;
          $this.css("background-position", "35% 87.5%"); // busy
          startinterval($this);
          noderequest(stack.tableau);
        } else if (go.webworker) {
          go.isBusy = true;
          $this.css("background-position", "35% 87.5%"); // busy
          startinterval($this);
          go.solver.postMessage(stack.tableau);
        } else {
          $this.css("background-position", "30% 87.5%") // disabled
        }
        break;

      // help - style="background-position: 35% 75%; top: 10px; left: 780px; "
      //        style="background-position: 40% 75%; top: 10px; left: 780px; " - none (gray)
      case 7:
        // location = "instructions.html";
        $("#guide").load("help.html", function () {
          $(".help").show();
          $(".options").hide();
          $('.hint').hide();
          $(".container").hide();
        });
    }
    return false;
  });
}

// function startinterval ($this) {
//   $this.css({"background-image": "url('i/spysheet.png')", 
//     "background-position": "0% 0%" });
//   window._busy = setInterval(function () { 
//     var offset = (parseInt($this.css("background-position").match(/\d+/)[0]) + 4) % 96;
//     $this.css("background-position", offset + '% 0%');
//   }, 1000);
// }

function startinterval ($this) {
  $this.css( "background-position", "75% 0%" );
  window._busy = setInterval(function () { 
    var offset = $this.css("background-position").match(/[\.\d]+/g);
    var frames = (6 * (parseFloat(offset[1]) / 12.5) + (parseFloat(offset[0]) / 5) - 14) % 24;
    var str = ( 75 + 5 * (frames % 6)) + '% ' + (12.5 * Math.floor(frames / 6))  + '%';
//    console.log(offset, frames, str); // 675471110
    $this.css("background-position", str); 
  }, 1000);
}

function initialize() {
  if (screen.width < 895.5) {
    $('meta[name=viewport]')
      .attr('content', 'width=device-width, initial-scale=' + screen.width / 895.5);
  }

  if (!!navigator.userAgent.match(/Android.*AppleWebKit/i)) {
    // works for Nexus 7
    var childheight = $('.container').width() * 
      (Math.max(screen.availWidth, screen.availHeight) - 74) / 
       Math.min(screen.availWidth, screen.availHeight);
    $('.container').css('height', childheight);
  }

  $(".help button").on('click', function () {
    $('.container').show();
    $('.help').hide();
    hint();
  });

  function closeoptions () {
    var gameint = parseInt($('#gameno').val(), 10);
    if (gameint > 0 && gameint !== go.game.gameno) {
      stack.init(gameint);
      setupLayout();
      go.audit = "";
    }
    $('.options').fadeOut('fast'); //'slow', function () { // .hide();
      hint();
  //});
  };
  $(".options button").on('click', closeoptions);

  $('#gameno').on("keypress", function(e) {
    if (e.keyCode == 13) {
      closeoptions();
      return false;
    }
  });

  $('#scale').change( function () {
    var value = (.5 + $('#scale').val() / 200).toFixed(3);
    $('#value').html(value);
    $('meta[name=viewport]').attr('content', 'width=device-width, initial-scale=' + value);
  });
  $('#scale').val(200 * ($('meta[name=viewport]').attr('content')
    .match(/initial-scale=([\d.]+)/)[1] - .5) );
  $('#value').html( (.5 + $('#scale').val() / 200).toFixed(3) );

  $('#blur').change(function () { // allow change if gray only
    if (stack.isEob() && $('.' + go.hilite.blue).length === 0) {
      $('.' + go.hilite.next).removeClass(go.hilite.next);
      go.options.blur = !go.options.blur;
      go.setHilite(go.options.blur);
      gray();
    }
    $('#blur').prop("checked", go.options.blur);
  });
  go.options.blur = !go.isMobile;
  $('#blur').prop("checked", go.options.blur);
  go.setHilite(go.options.blur);


  $('#box').change( function () {
    $('.bus').toggleClass("box");
    go.options.box = $('#box').prop("checked");
   });
  go.options.box  = false;
  $('#box').prop("checked", go.options.box);

  $('#bkg').change( function () {
    go.options.bkg = !go.options.bkg;
  });
  go.options.bkg  = !go.isMobile;
  $('#bkg').prop("checked", go.options.bkg);

  go.options.screen = 
    '<tr><td>width:<td>' + screen.width + '<td>avail:<td>' + screen.availWidth +
    '<tr><td>heigth:<td>' + screen.height + '<td>avail:<td>' + screen.availHeight; 
}
//
function checkAvailable() {
  var node, src, hilite, i;
  removehilight(go.hilite.purple);
  hilite = $('.' + go.hilite.blue).map(function () {
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
      addhilight(node, go.hilite.yellow);
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
      addhilight(node, go.hilite.orange); // NOTE: already has hilite-yellow !
      stack.list[stack.index].filter(function (node) {
        return node[4].match(/^a/);
      }).forEach(function (node) {
        source(node).addClass(go.hilite.auto);
      });
} } }

// "destination selection ..."
function dstselectFree(element) {
  var dstparent = $('.freecell:empty:first');
  if (element.parent().hasClass('freecell')) {
    removehilight(go.hilite.blue);
  } else if (dstparent.length == 0) { 
  // do nothing
  } else {
    var src_col = (element.parent().offset().left - 10) / 110,
        src_row = element.last().position().top / go.deltaHeight,
        dst_col = (dstparent.offset().left - 10) / 110,
        node = [];
    node.push([src_col, src_row + 1, dst_col, 0, 'cf']);
    // append autoplay moves to node before adding to stack
    stack.add(autoplay(stack.tableau, node)); 
    undo(stack.tableau, stack.list[stack.index - 1]);
    element.removeClass(go.hilite.blue).last().addClass(go.hilite.blue);
    frwd();
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
    // append autoplay moves to node before adding to stack
    stack.add(autoplay(stack.tableau, node)); 
    undo(stack.tableau, stack.list[stack.index - 1]);
    element.removeClass(go.hilite.blue).last().addClass(go.hilite.blue);
    frwd();
  }
}
//
Array.prototype.uniq = function() {
  var n = Object.create(null);
  for(var i = 0; i < this.length; i++) n[this[i]] = true; 
  return Object.keys(n);
}

function dstselectCasc(element, $this) {
  var dstparent, dstofstop;
  // WARNING! if you click fast enough, you can cause $this.hasClass('cascades') && 
  //          $this.children().length>0 to true. should just exit!
  if ($this.hasClass('cascades')) {
    // target is an empty column
    dstparent = $('.cascades:empty:first');
    dstofstop = 0;
  } else {
    dstparent = $this.parent();
    dstofstop = dstparent.children().last().position().top + go.deltaHeight;
  }
  var src_col = (element.parent().offset().left - 10) / 110, 
      src_row =  element.parent().children().length -(element.parent().hasClass('freecell')?1:0),
      dst_col = (dstparent.offset().left - 10) / 110,
      dst_row =  dstparent.children().length,
      src     = asString(stack.tableau[src_col][src_row]),

      nodearr = stack.nodelist[stack.index].filter(function (list) {
        return list[0][2] === this &&         // dst_col
               list[0][3] !== 0    &&         // dst_row not free or home
               list.some(function (node) {    // node contains src (some)
                 return asString(stack.tableau[node[0]][node[1]]) == this;
               }, src);
      }, dst_col),

      nodestr = nodearr.reduce(function (acc,list) { // flatten nodearr
        return acc.concat(list);
      }, [])
      .map(function (node) {
          return asString(stack.tableau[node[0]][node[1]]);
      })
      .uniq().join(",");
/*
"[[[4,8,2,1,"ce"]],[[4,7,2,1,"ce"],[4,8,2,2,"ce"]],[[4,6,2,1,"ce"],[4,7,2,2,"ce"],[4,8,2,3,"ce"]],[[4,5,2,1,"ce"],[4,6,2,2,"ce"],[4,7,2,3,"ce"],[4,8,2,4,"ce"]]]"
"[[4,8,2,1,"ce"],[4,7,2,1,"ce"],[4,8,2,2,"ce"],[4,6,2,1,"ce"],[4,7,2,2,"ce"],[4,8,2,3,"ce"],[4,5,2,1,"ce"],[4,6,2,2,"ce"],[4,7,2,3,"ce"],[4,8,2,4,"ce"]]"
["9H", "TS", "9H", "JD", "TS", "9H", "QS", "JD", "TS", "9H"]
"9H,TS,JD,QS"
*/

  if (!!nodestr && ( // NOTE: could also have hilite-orange FIX: #44098
    dstparent.hasClass(go.hilite.yellow) || 
    dstparent.children().hasClass(go.hilite.yellow))) {
      element.each(function () {
        var card = new Card($(this)).toString();
        if (!nodestr.match(card)) $(this).removeClass(go.hilite.blue).addClass(go.hilite.purple);
      });

    element = $('.' + go.hilite.blue);
    setTimeout(function () {
      $('.deck').removeClass(go.hilite.purple);
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
    // append autoplay moves to node before adding to stack
    stack.add(autoplay(stack.tableau, node)); 
    undo(stack.tableau, stack.list[stack.index - 1]);
    frwd();
  }
}
//
function bkwd() {
  var node = stack.get(),
      seq = []; 
  go.first = true;
  node = node.map(function (a) {
    return [a[2], a[3], a[0], a[1], a[4]];
  });
  while (node[node.length - 1][4].match(/^a/)) {
    seq.push(buildSeq({ entry: [node.pop()],
      auto: true, frwd: false, done: false, first: go.first }));
  }
  seq.push(buildSeq({ entry: node,
    auto: false, frwd: false, done: true, first: go.first 
  }));
  go.isBusy = true; /*1*/
  $.Velocity.RunSequence(seq);
}

function frwd() {
  var node = stack.get(),
      seq = [],
      heap = []; 
  go.first = true;
  while (node.length && node[0][4].match(/^(?!a)/)) {
    heap.push(node.shift());
  } 
  seq.push(buildSeq({ entry: heap,
    auto: false, frwd: true, done: node.length ? false : true, first: go.first 
  }));
  while (node.length > 0) {
    seq.push(buildSeq({ entry: [node.shift()],
      auto: true, frwd: true, done: node.length ? false : true, first: go.first 
    }));
  }
   go.isBusy = true; /*3*/
  $.Velocity.RunSequence(seq);
}

function beginFactory(deltaHeight, ids) {

  function begin() {
    var src = $(ids);
    $('.bus').toggle().css({ top: src.offset().top, left: src.offset().left });
    var ytop = 0; // ytop is relative to .bus anchor
    $('.bus').append(src).children().each(function () {
      $(this).css({ top: ytop });
      ytop += deltaHeight;
    });
  }
  return begin;
}

function completeFactory(deltaHeight, notBusy, dst, ytop, done, first, hilite, stack) {

  function complete() {
    if (first) $('.img').removeClass([go.hilite.yellow, go.hilite.orange, go.hilite.next].join(' '));
    $('.bus').children().removeClass(hilite);
    dst.append($('.bus').toggle().children().each(function () {
      // this==dst, ytop is relative to dst anchor (.freecell, .homecell, .cascades)
      $(this).css({ top: ytop, left: 0 });
      ytop += deltaHeight;
    }));
    if (done) {
      removehilight(go.hilite.blue);
      gray();
      notBusy();
      // test(stack); // TODO
    }
  }
  return complete;
}
//
// Note. there are two different top and left offsets,  one relative to 
// .container, the other relative to an anchor (.homecell, .freecell, .cascades and .bus!)     
// .deck cards are always a child of some anchor

function buildSeq(q) {

  var k = calc(q.entry),          // autoplay is twice as fast as frwd & bkwd is twice as that !
      duration = function duration(k, q) {
        return k.delta * (q.auto ? 0.5 : 1) * (q.frwd ? 1 : 0.5) * go.speed * 0.2;
      },
      result = {                  // result is the runSequence object
    e: $('.bus'),                 // animate the .bus element (highest z-order!)
    p: { top: k.dst.offset().top + k.idx * go.deltaHeight, 
      left: k.dst.offset().left   // final position relative to the .container
    },
    o: { 
      duration: duration(k, q),   // the animate before and after functions uses closures!
      begin: beginFactory(go.deltaHeight, 
        k.src.map(function (id) {
          return "#" + id;
        }).join(", ")
      ), // .deck #id's
      complete: completeFactory(go.deltaHeight, 
        () => go.isBusy = !q.done,
        k.dst, 
        k.idx * go.deltaHeight, 
        q.done, 
        q.first, 
        q.auto ? "hilite-auto" : "hilite-blue", 
        stack
      )
    }
  }; 

  q.entry.forEach(function (move) {
    stack.tableauPlay(move);
  });

  if (q.frwd) {
    if (q.auto) {
      $("#" + k.src).addClass(go.hilite.auto);
    } else {
      $(k.src.map(function (id) {
        return "#" + id;
      }).join(", ")).addClass(go.hilite.blue);
      k.dst.children().length ? 
        k.dst.children().last().addClass(go.hilite.orange) : 
        k.dst.addClass(go.hilite.orange);
    }
    if (isKings(stack.tableau)) go.setSolved(true);
  }
  go.first = false;
  return result;
}
//
function calc(entry) {
  var element = entry.map(function (move) {
      return asString(stack.tableau[move[0]][move[1]]);
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
    dst_row--; // adjust idx: for foundation vs cascades
    dstparent = $('.cascades').eq(dst_col);
  }
  dx = dstparent.offset().left - (10 + src_col * 110);
  delta = Math.floor(Math.sqrt(dx * dx + dy * dy)); /*8*/

  return { src: element, dst: dstparent, idx: dst_row, delta: delta };
}

function autoplay (tableau, node){   // WARNING: updates tableau & node!

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
//                      // Sorry! uglify did this.
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
//
function play(tableau, move) {
  tableau[move[DSTCOL]][move[DSTROW]] = tableau[move[SRCCOL]][move[SRCROW]];
  tableau[move[SRCCOL]][move[SRCROW]] = 0;
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
Card.prototype.toString = function () {return ' A23456789TJQK' [this.rank] + 'DCHS ' [this.suit];};

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
  suit = (s) => s >> 4 &  3,
  SRCCOL = 0, SRCROW = 1, DSTCOL = 2, DSTROW = 3, 
  HOMEOFFSET = 4, MAXFREE = 4, MAXCOLS = 8, MAXROWS = 20, KING = 13;

var fromId = (function() {
  var hash = {
    'D':0,'C':1,'H':2,'S':3,
    'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13
  };
  return function(id){ return hash[id[0]] + hash[id[1]] * 16 + 64 };
})();

function fromString (input) {
  var a = input.split('\n')
    .map(function (row) {
      return row.match(/(..) ?/g)
        .map(function (col) {
          return (' A23456789TJQK'.indexOf(col[0]) + 'DCHS '.indexOf(col[1]) * 16 + 64) & 127;
        }) 
    });
  var tableau = Array(8), c, r; 
  for (c = 0; c < MAXCOLS; c++) tableau[c] = zeroArray(MAXROWS);

  for (r = 0; r < a.length; r++)
    for (c = 0; c < a[r].length; c++) tableau[c][r] = a[r][c];
  return tableau;
}

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
//
var stack = {
  list: [],     // init @ page load && new game  -- used by redo, undo & solve
  nodelist: [], // init @ page load && new game  -- used to hilite, filled in by gen
  index: 0,     // init @ setup
  hist: [],     // init @ setup
  tableau: [],  // init @ setup       -- setupLayout -> initTableau = new Card

  init: function(gameno) {
    stack.nodelist = [],
    stack.list = [],
    go.setSolved(false),
    go.game  = layout(go.deltaHeight, gameno);
    go.audit = "";
  },
  rset: function() {
    this.index = 0;
    this.hist = []; 
    this.tableauInit(); 
    go.speed = go.NORMAL; 
    go.setSolved(); // need to reset solve button
  },
  tableauInit: function () {
      for (var i = 0; i < 8; i++) {
        this.tableau[i] = [];
        this.tableau[i][0] = 0;
        var casc = $('.cascades').eq(i).children();
        for (var j = 0; j < 19; j++) {
          if (j < casc.length) {
            this.tableau[i][j + 1] = fromId( casc.eq(j).attr('id') ); // 8x faster
          } else {
            this.tableau[i][j + 1] = 0;
  } } } },
  tableauPlay: function (move) {
    var src = this.tableau[move[0]][move[1]];
    this.tableau[move[2]][move[3]] = src;
    move[1] === 0 && move[0] >= 4 && rank(src) > 1 ? 
      this.tableau[move[0]][move[1]] = src - 1 : 
      this.tableau[move[0]][move[1]] = 0;
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
  dec: function dec() {
    this.index--;
    this.hist.push("dec: " + this.move());
  },
  inc: function inc() {
    this.hist.push("inc: " + this.move());
    this.index++;
  },
//
  move: function move() {
    var node = this.list[this.index][0],
        src  = asString(this.tableau[node[0]][node[1]]),
        dst  = node[3] > 1 ? 
               asString(this.tableau[node[2]][node[3] - 1]) : 
               node[3] == 1 ? 
               'e' :  node[2] < 4 ?  'f' : 'h';
    return src + " " + dst;
} },

// global object
go = { dump: function () {return JSON.stringify($.extend(go, stack)) },

  FAST: 1, NORMAL: 4, SLOW: 16, speed: 4, solver: null, webworker: true, javaserver: true, // game: null,
  nodeserver: true, isBusy: false, isSolved: false, nexus: 0, first: false, audit: "", 
  options: {}, hilite: {}, setHilite: function (flag) {
    ['next','blue','auto','yellow','orange','purple'].forEach(function (color) {
      go.hilite[color] = (flag ? 'pc' : 'mo') + '-hilite-' + color;
    });
  },
  isMobile: !!("ontouchstart" in window),
  tooltips: ['new game', 'reset game', 'prev', 'next', 'info', 'speed', 'solve', 'hint', 'help'],
  
  setSolved: function setSolved(flag) {
    (this.isSolved = arguments.length > 0 ? flag : this.isSolved) ? 
    !(this.javaserver || this.webworker) ? 
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

  ['next','blue','auto','yellow','orange','purple'].forEach(function (color) {
    go.hilite[color] = this + '-hilite-' + color;
  }, go.isMobile ? 'mo' : 'pc');

function test(stack) {
  var child, card, c, r = 0, ok = 1, e = {c: 0, r: 0};
  for (c=0; c<4; c++) {
    child = $('.freecell').eq(c).children();
    if (child.length > 0) {
      if (child.first().attr('id') !== asString(stack.tableau[c][0]) && ok) {
        e.c = c, e.r = r, e.k = child.first(), ok = 0;
  } } }
  for (c=0; c<4; c++) {
    child = $('.homecell').eq(c).children();
    if (child.length > 0) {
      if (child.last().attr('id') !== asString(stack.tableau[c+4][0]) && ok) {
        e.c = c+4, e.r = r, e.k = child.last(), ok = 0;
  } } }
  for (c=0; c<8; c++) {
    child = $('.cascades').eq(c).children();
    if (child.length > 0) {
      for (r=0; r<child.length; r++) { 
        if (child.eq(r).attr('id') !== asString(stack.tableau[c][r+1]) && ok) {
        e.c = c, e.r = r+1, e.k = child.eq(r), ok = 0;
  } } } }
  if (!ok) {
    console.log(msg(stack.tableau, '\n'),'c:',e.c,', r:',e.r,', id:',e.k.attr('id'));
    alert('open console and type "go.dump()"'); 
} }
