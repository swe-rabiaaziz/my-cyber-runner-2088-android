(function () {
  'use strict';
  var canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
  function $(id) { return document.getElementById(id); }
  var GRAV = 2300, JUMP = -780, KEY = 'pf-runner-best';
  var W = 0, H = 0, DPR = 1, state = 'ready', last = 0;
  var best = 0; try { best = Number(localStorage.getItem(KEY)) || 0; } catch (e) {}
  var player, obstacles = [], coins = [], particles = [], stars = [], skyline = [];
  var speed, distance, bonus, spawnT, coinT, shake, overAt = 0, shownScore = -1;

  function groundY() { return H - Math.max(84, H * 0.17); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function buildSky() {
    stars = [];
    for (var i = 0; i < 55; i++) stars.push({ x: Math.random() * W, y: Math.random() * groundY() * 0.75, r: rand(0.4, 1.5), k: rand(0.02, 0.08) });
    skyline = [];
    [{ k: 0.1, c: '#0d1431', lo: 70, hi: 170 }, { k: 0.22, c: '#121c40', lo: 40, hi: 120 }].forEach(function (L) {
      var x = 0, list = [];
      while (x < W + 240) { var w = rand(28, 70), h = rand(L.lo, L.hi); list.push({ x: x, w: w, h: h, win: Math.random() }); x += w + rand(2, 16); }
      skyline.push({ k: L.k, c: L.c, list: list, span: x });
    });
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildSky();
    if (player) { player.x = Math.max(40, W * 0.14); if (player.grounded) player.y = groundY() - player.h; }
  }
  window.addEventListener('resize', resize);

  function hud() {
    var s = Math.floor(distance / 14) + bonus;
    if (s !== shownScore) { shownScore = s; $('scoreV').textContent = s; }
    $('bestV').textContent = best;
    return s;
  }
  function reset() {
    speed = 330; distance = 0; bonus = 0; spawnT = 1.1; coinT = 1.6; shake = 0; shownScore = -1;
    obstacles = []; coins = []; particles = [];
    player = { x: Math.max(40, W * 0.14), y: groundY() - 44, w: 30, h: 44, vy: 0, jumps: 2, grounded: true, dust: 0 };
    hud();
  }

  function overlay(kind, title, text, btn) {
    var ov = $('ov'); ov.hidden = false;
    ov.querySelector('.card').className = 'card' + (kind === 'over' ? ' bad' : '');
    $('ovTitle').textContent = title; $('ovText').textContent = text; $('ovBtn').textContent = btn;
    setTimeout(function () { $('ovBtn').focus(); }, 30);
  }
  function startRun() { reset(); state = 'playing'; $('ov').hidden = true; last = performance.now(); }
  function action() {
    if (state === 'ready') startRun();
    else if (state === 'over') { if (performance.now() - overAt > 450) startRun(); }
    else if (state === 'paused') { state = 'playing'; $('ov').hidden = true; last = performance.now(); }
  }

  function burst(x, y, color, n, spd) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * spd;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rand(0.3, 0.6), color: color, r: rand(1.5, 3.2) });
    }
  }
  function jump() {
    if (state !== 'playing' || player.jumps <= 0) return;
    player.vy = player.jumps === 2 ? JUMP : JUMP * 0.92; player.jumps--; player.grounded = false;
    burst(player.x + player.w / 2, player.y + player.h, '#22e6c4', 8, 140);
  }

  function spawnObstacle() {
    var r = Math.random(), o;
    if (r < 0.45) o = { type: 'spike', w: 28, h: 34 };
    else if (r < 0.75) o = { type: 'block', w: 34, h: 46 };
    else o = { type: 'twin', w: 58, h: 34 };
    o.x = W + 40; obstacles.push(o);
  }
  function spawnCoins() {
    var n = 3, y = groundY() - rand(80, 150);
    for (var i = 0; i < n; i++) coins.push({ x: W + 40 + i * 38, y: y - Math.sin(i / (n - 1) * Math.PI) * 18, r: 9, ph: i });
  }

  function gameOver(sc) {
    state = 'over'; overAt = performance.now(); shake = 0.45;
    burst(player.x + player.w / 2, player.y + player.h / 2, '#ff4d7d', 26, 300);
    if (sc > best) { best = sc; try { localStorage.setItem(KEY, String(best)); } catch (e) {} }
    $('bestV').textContent = best;
    overlay('over', 'SYSTEM FAILURE', 'Score ' + sc + '  ·  Best ' + best, 'RUN AGAIN');
  }

  function update(dt) {
    distance += speed * dt; speed = Math.min(720, 330 + distance * 0.018);
    var p = player, gy = groundY() - p.h;
    p.vy += GRAV * dt; p.y += p.vy * dt;
    if (p.y >= gy) {
      if (!p.grounded) burst(p.x + p.w / 2, gy + p.h, '#7dd3fc', 6, 110);
      p.y = gy; p.vy = 0; p.grounded = true; p.jumps = 2;
      p.dust -= dt; if (p.dust <= 0) { p.dust = 0.07; burst(p.x, gy + p.h, '#1f6f78', 1, 60); }
    } else p.grounded = false;

    spawnT -= dt; if (spawnT <= 0) { spawnObstacle(); spawnT = rand(0.95, 1.65); }
    coinT -= dt; if (coinT <= 0) { spawnCoins(); coinT = rand(2.2, 4); }

    var gyTop = groundY(), hx = p.x + 5, hy = p.y + 4, hw = p.w - 10, hh = p.h - 6, i;
    for (i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i]; o.x -= speed * dt;
      var ox = o.x + 5, oy = gyTop - o.h + 6, ow = o.w - 10, oh = o.h - 6;
      if (hx < ox + ow && hx + hw > ox && hy < oy + oh && hy + hh > oy) { gameOver(hud()); return; }
      if (o.x + o.w < -10) obstacles.splice(i, 1);
    }
    for (i = coins.length - 1; i >= 0; i--) {
      var c = coins[i]; c.x -= speed * dt;
      var nx = clamp(c.x, p.x, p.x + p.w), ny = clamp(c.y, p.y, p.y + p.h);
      if ((c.x - nx) * (c.x - nx) + (c.y - ny) * (c.y - ny) < c.r * c.r) { bonus += 50; burst(c.x, c.y, '#fbbf24', 10, 180); coins.splice(i, 1); }
      else if (c.x < -20) coins.splice(i, 1);
    }
    hud();
  }

  function updateFx(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var q = particles[i]; q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt;
      if (q.life >= q.max) particles.splice(i, 1);
    }
    shake = Math.max(0, shake - dt);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function spike(x, y, w, h) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); }

  function draw(now) {
    var gy = groundY(), i, j;
    var g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, '#05081a'); g.addColorStop(1, '#101a3d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

    ctx.fillStyle = '#9fb4ff';
    for (i = 0; i < stars.length; i++) { var s = stars[i], sx = ((s.x - distance * s.k) % W + W) % W; ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(now / 900 + i)); ctx.fillRect(sx, s.y, s.r, s.r); }
    ctx.globalAlpha = 1;
    for (i = 0; i < skyline.length; i++) {
      var L = skyline[i], off = (distance * L.k) % L.span;
      ctx.fillStyle = L.c;
      for (var rep = 0; rep < 2; rep++) for (j = 0; j < L.list.length; j++) {
        var b = L.list[j], bx = b.x - off + rep * L.span;
        if (bx > W || bx + b.w < 0) continue;
        ctx.fillRect(bx, gy - b.h, b.w, b.h);
        if (L.k > 0.15 && b.win > 0.4) { ctx.fillStyle = 'rgba(34,230,196,.18)'; ctx.fillRect(bx + 6, gy - b.h + 10, 4, 4); ctx.fillRect(bx + b.w - 12, gy - b.h + 24, 4, 4); ctx.fillStyle = L.c; }
      }
    }
    ctx.fillStyle = '#0a1128'; ctx.fillRect(0, gy, W, H - gy);
    ctx.strokeStyle = '#22e6c4'; ctx.lineWidth = 2; ctx.shadowColor = '#22e6c4'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(34,230,196,.18)'; ctx.lineWidth = 1;
    var gOff = distance % 60;
    for (var x = -gOff; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 40, H); ctx.stroke(); }
    for (var y = gy + 16, k = 1; y < H; y += 16 * (++k)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.fillStyle = '#ff3d6e'; ctx.shadowColor = '#ff3d6e'; ctx.shadowBlur = 10;
    for (i = 0; i < obstacles.length; i++) {
      var o = obstacles[i], oy = gy - o.h;
      if (o.type === 'spike') spike(o.x, oy, o.w, o.h);
      else if (o.type === 'twin') { spike(o.x, oy, o.w / 2, o.h); spike(o.x + o.w / 2, oy, o.w / 2, o.h); }
      else { ctx.fillStyle = '#ff9f1c'; ctx.shadowColor = '#ff9f1c'; rr(o.x, oy, o.w, o.h, 6); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(o.x + 6, oy + 8, o.w - 12, 4); ctx.fillStyle = '#ff3d6e'; ctx.shadowColor = '#ff3d6e'; }
    }
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12; ctx.fillStyle = '#fbbf24';
    for (i = 0; i < coins.length; i++) { var c = coins[i], pr = c.r * (0.85 + 0.15 * Math.sin(now / 160 + c.ph)); ctx.beginPath(); ctx.arc(c.x, c.y, pr, 0, 6.2832); ctx.fill(); }
    ctx.shadowBlur = 0;

    if (state !== 'over' && player) {
      var p = player, sq = clamp(Math.abs(p.vy) / 3500, 0, 0.18);
      ctx.shadowColor = '#22e6c4'; ctx.shadowBlur = 16; ctx.fillStyle = '#22e6c4';
      rr(p.x - sq * p.w * 0.5, p.y + sq * p.h * 0.4, p.w * (1 + sq), p.h * (1 - sq * 0.8), 8); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#04141f'; rr(p.x + p.w * 0.45, p.y + 9, p.w * 0.5, 9, 4); ctx.fill();
      ctx.fillStyle = '#e8fff9'; ctx.fillRect(p.x + p.w * 0.62, p.y + 12, p.w * 0.25, 3);
    }
    for (i = 0; i < particles.length; i++) { var q = particles[i]; ctx.globalAlpha = 1 - q.life / q.max; ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.r, q.r); }
    ctx.globalAlpha = 1; ctx.restore();
  }

  function frame(ts) {
    var dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts;
    if (state === 'playing') update(dt); else if (state === 'ready') distance += 90 * dt;
    updateFx(dt); draw(ts); requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
  $('ov').addEventListener('click', action);
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
      e.preventDefault();
      if (!$('ov').hidden) { if (!e.repeat) action(); } else if (!e.repeat) jump();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'playing') { state = 'paused'; overlay('pause', 'PAUSED', 'Tap to resume your run.', 'RESUME'); }
  });
  window.addEventListener('blur', function () { if (state === 'playing') { state = 'paused'; overlay('pause', 'PAUSED', 'Tap to resume your run.', 'RESUME'); } });

  resize(); reset(); $('bestV').textContent = best; requestAnimationFrame(frame);
})();