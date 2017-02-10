var express = require('express');
var bodyParser = require('body-parser');
var solver = require('./public/js/solver-node');

var app = express();

var router = express.Router();
router.use(bodyParser.json());

router.route('/')
  .post(function (req, res, next) {
    res.send( solver(req.body) );
  });

app.use(express.static(__dirname + '/public'))
  .use('/solve', router)
  .listen(4000, function () {
    console.log(require('colors/safe').yellow('Starting express-4.14 on localhost:4000'))
  });