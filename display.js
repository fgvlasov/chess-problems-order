// Module Imports
const Chess = require("chess.js");
const URI = require("urijs");
const $ = require("jquery");
const { ChessBoard } = require("./chessboard/chessboard.js");
const { problems } = require("./problems.json");
const random = require("./random.js");
const { enableScroll, disableScroll } = require("./toggle-scrollbar.js");
let url_parameters = getUrlParameters();

const TOTAL_PROBLEMS = 4462;
const HIGHLIGHT_COLORS = {
  black: "#696969",
  white: "#a9a9a9"
};

function getUrlParameters() {
  return new URI(window.location.href).search(true);
}

function unhighlight() {
  $("#board .square-55d63").css("background", "");
}

function highlight(square) {
  const squareEl = $("#board .square-" + square);
  const color = squareEl.hasClass("black-3c85d") ? HIGHLIGHT_COLORS.black : HIGHLIGHT_COLORS.white;
  squareEl.css("background", color);
}

function parse_move(move) {
  var parts = move.split("-");
  var source = parts[0];
  var target = parts[1];
  var promotion = target.length === 2 ? "q" : target[2];
  target = target.slice(0, 2);
  return { source: source, target: target, promotion: promotion };
}

var game;
var correct_moves;

// ===== Helpers for problem navigation =====
function clampProblemId(n) {
  if (isNaN(n)) return null;
  if (n < 1) return 1;
  if (n > TOTAL_PROBLEMS) return TOTAL_PROBLEMS;
  return n;
}

function pushState(problemId) {
  if (window.history && window.history.pushState && ("o" in url_parameters)) {
    url_parameters["id"] = problemId;
    if (window.history.state && window.history.state["id"] === problemId) return;
    window.history.pushState(url_parameters, "", new URI(window.location.href).search(url_parameters).toString());
  }
}

// Вернуть фактический загруженный id или false
function loadProblemById(problemId, useAnimation) {
  if (typeof useAnimation === "undefined") useAnimation = true;
  var id = clampProblemId(parseInt(problemId, 10));
  if (!id) return false;
  var p = problems[id - 1];
  if (!p) return false;
  next(p, useAnimation);
  pushState(p.problemid);
  return p.problemid;
}

// Будем помнить текущий id
var currentProblemId = null;

// Обновляем значение инпута (ставим следующий номер)
function updateProblemInput(nextFromId) {
  var input = document.querySelector("#problem-input");
  if (!input) return;
  var base = (typeof nextFromId === "number") ? nextFromId : currentProblemId;
  if (!base) return;
  input.value = String(clampProblemId(base + 1));
}

// ===== Moves playback =====
function make_move() {
  var parsed = parse_move(correct_moves[0]);
  game.move({ from: parsed.source, to: parsed.target, promotion: parsed.promotion });
  board.move(parsed.source + "-" + parsed.target);
  correct_moves.shift();
}

// ===== Core UI actions =====
function next(problem, useAnimation) {
  if (typeof problem === "undefined") problem = random.choice(problems);
  if (typeof useAnimation === "undefined") useAnimation = true;

  //$("#next-btn").css("display", "none");
  $("#hint-btn").css("display", "");

  var problem_type = problem.type;
  var problem_title = problem_type + " - " + problem.first;

  document.title = "Шахматная задача #" + problem.problemid;
  if ("o" in url_parameters) problem_title = "#" + problem.problemid + " " + problem_title;

  var titleEl = document.querySelector("#problem-title");
  if (titleEl) titleEl.innerHTML = problem_title;

  var numEl = document.querySelector("#problem-num");
  if (numEl) numEl.innerHTML = String(problem.problemid);

  var linkEl = document.querySelector("#problem-link");
  if (linkEl) {
    linkEl.href = ("o" in url_parameters) ? ("?o&id=" + problem.problemid) : ("?id=" + problem.problemid);
  }

  game = new Chess(problem.fen);
  board.position(problem.fen, useAnimation);
  correct_moves = problem.moves.split(";");

  var boardEl = document.querySelector("#board");
  if (boardEl) boardEl.style.opacity = "1";

  var hintBtn = document.querySelector("#hint-btn");
  if (hintBtn) {
    hintBtn.onclick = function() {
      var m = parse_move(correct_moves[0]);
      highlight(m.source);
      highlight(m.target);
    };
  }

  // обновим инпут на следующий номер
  updateProblemInput(problem.problemid);
}

function onDropHandler(src, tgt) {
  enableScroll();

  if (game.in_checkmate()) {
    return "snapback";
  }

  var first = parse_move(correct_moves[0]);

  if (correct_moves.length === 1) {
    var sim_game = new Chess(game.fen());
    sim_game.move({ from: src, to: tgt, promotion: first.promotion });

    if (!sim_game.in_checkmate()) {
      return "snapback";
    } else {
      game.move({ from: src, to: tgt, promotion: first.promotion });
      correct_moves.shift();
    }
  } else {
    if (src !== first.source || tgt !== first.target) {
      return "snapback";
    }
    game.move({ from: first.source, to: first.target, promotion: first.promotion });
    correct_moves.shift();
    setTimeout(make_move, 500);
  }

  if (game.in_checkmate()) {
    $("#hint-btn").css("display", "none");
    $("#next-btn").css("display", "");

    var nextBtn = document.querySelector("#next-btn");
    if (nextBtn) nextBtn.onclick = next_problem;

    var pt = document.querySelector("#problem-title");
    if (pt) pt.innerHTML = pt.innerHTML.split("-")[0] + " - Решено!";

    var boardEl2 = document.querySelector("#board");
    if (boardEl2) boardEl2.style.opacity = "0.5";
  }
}

var board = ChessBoard("board", {
  draggable: true,
  dropOffBoard: "snapback",
  onDragStart: function() { disableScroll(); },
  onDrop: onDropHandler,
  onMoveEnd: function() { board.position(game.fen()); },
  onSnapEnd: function() { board.position(game.fen()); unhighlight(); }
});

// ===== Navigation API (Следующая / Случайно / Ручной ввод) =====
function next_problem() {
  // если не знаем currentProblemId — попробуем взять из DOM
  if (currentProblemId === null) {
    var numEl = document.querySelector("#problem-num");
    if (numEl) {
      var fromDom = parseInt(numEl.innerHTML, 10);
      if (!isNaN(fromDom)) currentProblemId = clampProblemId(fromDom);
    }
  }
  var nextId = clampProblemId((currentProblemId || 1) + 1);
  var loadedId = loadProblemById(nextId, true);
  if (loadedId) {
    currentProblemId = loadedId;
    updateProblemInput(currentProblemId);
  }
}

function random_problem() {
  var p = random.choice(problems);
  next(p, true);
  pushState(p.problemid);
  currentProblemId = p.problemid;
  updateProblemInput(currentProblemId);
}

function jump_to_input() {
  var input = document.querySelector("#problem-input");
  if (!input) return;
  var val = input.value;
  if (!val || String(val).trim() === "") return;
  var loadedId = loadProblemById(val, true);
  if (loadedId) {
    currentProblemId = loadedId;
    updateProblemInput(currentProblemId);
  }
}

// ===== Keyboard shortcuts (НЕ мешаем вводу в инпут) =====
document.body.onkeydown = function(e) {
  var tag = (e && e.target && e.target.tagName) ? String(e.target.tagName).toUpperCase() : "";
  var isEditable = (e && e.target) ? !!e.target.isContentEditable : false;

  // если фокус в input/textarea/редакторе — не перехватываем
  if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) {
    return;
  }

  // Пробел на решенной — следующая
  if (game && game.in_checkmate && game.in_checkmate() && (e.key === " " || e.code === "Space")) {
    e.preventDefault();
    next_problem();
    return;
  }

  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    var pm = parse_move(correct_moves[0]);
    highlight(pm.source);
    highlight(pm.target);
  } else {
    unhighlight();
  }

  if (e.code === "ArrowRight") {
    e.preventDefault();
    next_problem();
  }
  if (e.code === "KeyR") {
    e.preventDefault();
    random_problem();
  }
};

// ===== History pop =====
window.onpopstate = function(event) {
  if (event && event.state && ("id" in event.state)) {
    var problemId = event.state["id"];
    next(problems[problemId - 1], false);
    currentProblemId = problemId;
    updateProblemInput(currentProblemId);
  }
};

// ===== Init =====
function init() {
  var problem;
  if (("id" in url_parameters) && url_parameters["id"] <= TOTAL_PROBLEMS && url_parameters["id"] > 0) {
    problem = problems[url_parameters["id"] - 1];
  } else {
    problem = random.choice(problems);
  }

  next(problem);
  pushState(problem.problemid);
  currentProblemId = problem.problemid;

  // кнопки
  var nextBtn = document.querySelector("#next-btn");
  if (nextBtn) nextBtn.onclick = next_problem;

  var randomBtn = document.querySelector("#random-btn");
  if (randomBtn) randomBtn.onclick = random_problem;

  // инпут: Enter = прыгнуть к номеру
  var input = document.querySelector("#problem-input");
  if (input) {
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        jump_to_input();
      }
    });
  }

  updateProblemInput(currentProblemId);
}

// Exports
module.exports = {
  init: init
};
