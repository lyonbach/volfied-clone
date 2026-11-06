(function () {
  'use strict';
  var W = 80, H = 60, S = 8, GOAL = 75, START_LIVES = 3;
  var EMPTY = 0, CLAIMED = 1, TRAIL = 2;
  var canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
  var hud = document.getElementById('hud');
  var grid, player, enemies, lives, percent, state, dir, tick;

  function init() {
    grid = [];
    for (var y = 0; y < H; y++) {
      grid.push([]);
      for (var x = 0; x < W; x++) {
        grid[y].push(x < 2 || y < 2 || x >= W - 2 || y >= H - 2 ? CLAIMED : EMPTY);
      }
    }
    lives = START_LIVES;
    state = 'play';
    enemies = [];
    for (var i = 0; i < 3; i++) {
      enemies.push({ x: 20 + i * 15, y: 20 + i * 8, dx: i % 2 ? 1 : -1, dy: i ? 1 : -1 });
    }
    resetPlayer();
    updatePercent();
  }

  function resetPlayer() {
    clearTrail();
    player = { x: W >> 1, y: H - 1, drawing: false };
    dir = null;
  }

  function clearTrail() {
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (grid[y][x] === TRAIL) grid[y][x] = EMPTY;
  }

  function updatePercent() {
    var total = (W - 4) * (H - 4), c = 0;
    for (var y = 2; y < H - 2; y++) for (var x = 2; x < W - 2; x++) if (grid[y][x] === CLAIMED) c++;
    percent = Math.floor(100 * c / total);
    hud.textContent = 'Claimed: ' + percent + '% / ' + GOAL + '%   Lives: ' + lives;
  }

  function loseLife() {
    lives--;
    if (lives <= 0) { state = 'lost'; updatePercent(); return; }
    resetPlayer();
    updatePercent();
  }

  function closeTrail() {
    // flood fill empty cells reachable from enemies; everything else is claimed
    var seen = [], stack = [], y, x;
    for (y = 0; y < H; y++) seen.push(new Array(W).fill(false));
    enemies.forEach(function (e) { stack.push([e.x, e.y]); seen[e.y][e.x] = true; });
    while (stack.length) {
      var p = stack.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = p[0] + d[0], ny = p[1] + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx] || grid[ny][nx] !== EMPTY) return;
        seen[ny][nx] = true;
        stack.push([nx, ny]);
      });
    }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (grid[y][x] === TRAIL || (grid[y][x] === EMPTY && !seen[y][x])) grid[y][x] = CLAIMED;
    }
    player.drawing = false;
    updatePercent();
    if (percent >= GOAL) state = 'won';
  }

  function movePlayer() {
    if (!dir) return;
    var nx = player.x + dir[0], ny = player.y + dir[1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    var t = grid[ny][nx];
    if (t === TRAIL) return; // can't cross own trail
    if (t === EMPTY) {
      grid[ny][nx] = TRAIL;
      player.drawing = true;
      player.x = nx; player.y = ny;
    } else {
      player.x = nx; player.y = ny;
      if (player.drawing) closeTrail();
    }
  }

  function moveEnemies() {
    enemies.forEach(function (e) {
      var nx = e.x + e.dx, ny = e.y + e.dy;
      if (grid[e.y][nx] === CLAIMED) { e.dx = -e.dx; nx = e.x + e.dx; }
      if (grid[ny][e.x] === CLAIMED) { e.dy = -e.dy; ny = e.y + e.dy; }
      if (grid[ny][nx] === CLAIMED) { e.dx = -e.dx; e.dy = -e.dy; return; }
      e.x = nx; e.y = ny;
      if (grid[e.y][e.x] === TRAIL) loseLife();
      else if (e.x === player.x && e.y === player.y) loseLife();
    });
  }

  function step() {
    if (state !== 'play') return;
    movePlayer();
    if (state !== 'play') return;
    tick++;
    if (tick % 2 === 0) moveEnemies();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = grid[y][x];
      if (t === EMPTY) continue;
      ctx.fillStyle = t === CLAIMED ? '#2a6' : '#fc0';
      ctx.fillRect(x * S, y * S, S, S);
    }
    ctx.fillStyle = '#f33';
    enemies.forEach(function (e) { ctx.fillRect(e.x * S - 4, e.y * S - 4, S + 8, S + 8); });
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x * S - 2, player.y * S - 2, S + 4, S + 4);
    if (state !== 'play') {
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state === 'won' ? 'You win!' : 'Game over', canvas.width / 2, canvas.height / 2);
      ctx.font = '16px sans-serif';
      ctx.fillText('Press Space to restart', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  var KEYS = {
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
    ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1]
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ') { if (state !== 'play') { init(); } e.preventDefault(); return; }
    var d = KEYS[e.key];
    if (d) { dir = d; e.preventDefault(); }
  });
  document.addEventListener('keyup', function (e) {
    var d = KEYS[e.key];
    if (d && dir === d && !(player && player.drawing)) dir = null;
  });

  tick = 0;
  init();
  setInterval(function () { step(); draw(); }, 40);
})();
