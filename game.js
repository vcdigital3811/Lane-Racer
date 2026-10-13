const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const finalScoreElement = document.getElementById('final-score');
const startPanel = document.getElementById('start-panel');
const gameOverPanel = document.getElementById('game-over-panel');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const boostMeter = document.getElementById('boost-meter');
const boostButton = document.querySelector('[data-boost]');

const road = { left: 86, right: 394, laneWidth: 102 };
const player = { x: 240, y: 604, width: 38, height: 70, speed: 6 };
let traffic = [];
let running = false;
let score = 0;
let best = Number(localStorage.getItem('neon-apex-best') || 0);
let roadOffset = 0;
let spawnTimer = 0;
let lastTime = 0;
let boost = 100;
const keys = { left: false, right: false };
let boostHeld = false;
bestElement.textContent = formatScore(best);

function formatScore(value) { return String(Math.floor(value)).padStart(6, '0'); }
function resetGame() { traffic = []; score = 0; roadOffset = 0; spawnTimer = 0; boost = 100; player.x = 240; scoreElement.textContent = formatScore(score); boostMeter.style.transform = 'scaleX(1)'; }
function startGame() { resetGame(); running = true; startPanel.classList.add('hidden'); gameOverPanel.classList.add('hidden'); lastTime = performance.now(); requestAnimationFrame(loop); }
function endGame() { running = false; best = Math.max(best, score); localStorage.setItem('neon-apex-best', best); bestElement.textContent = formatScore(best); finalScoreElement.textContent = formatScore(score); gameOverPanel.classList.remove('hidden'); }
function spawnCar() {
  const colors = ['#ff6b54', '#57c6d4', '#d6f54a', '#d88cff'];
  const lane = Math.floor(Math.random() * 3);
  const laneCenter = road.left + road.laneWidth / 2 + lane * road.laneWidth;
  const x = Math.random() < 0.5 ? laneCenter : laneCenter + (Math.random() * 2 - 1) * road.laneWidth * 0.42;
  traffic.push({ x, y: -80, width: 38, height: 70, speed: 2.5 + Math.random() * 1.4 + score / 1300, color: colors[Math.floor(Math.random() * colors.length)] });
}
function drawRoad() {
  ctx.fillStyle = '#1d2c31'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#26383d'; ctx.fillRect(road.left - 7, 0, 7, canvas.height); ctx.fillRect(road.right, 0, 7, canvas.height);
  ctx.fillStyle = '#182328'; ctx.fillRect(road.left, 0, road.right - road.left, canvas.height);
  ctx.strokeStyle = '#53656a'; ctx.lineWidth = 3; ctx.setLineDash([34, 32]); ctx.lineDashOffset = roadOffset;
  [road.left + road.laneWidth, road.left + road.laneWidth * 2].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }); ctx.setLineDash([]);
  ctx.fillStyle = '#d6f54a'; ctx.fillRect(road.left - 4, 0, 4, canvas.height); ctx.fillRect(road.right, 0, 4, canvas.height);
  ctx.fillStyle = '#ff6b54';
  for (let y = -60 + roadOffset; y < canvas.height; y += 66) { ctx.fillRect(road.left - 14, y, 6, 27); ctx.fillRect(road.right + 8, y, 6, 27); }
}
function drawCar(car, isPlayer = false) {
  ctx.save(); ctx.translate(car.x, car.y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 7, car.width, car.height);
  ctx.fillStyle = isPlayer ? '#f4f1ea' : car.color; ctx.beginPath(); ctx.roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 8); ctx.fill();
  ctx.fillStyle = isPlayer ? '#ff6b54' : '#152126'; ctx.beginPath(); ctx.roundRect(-13, -22, 26, 22, 5); ctx.fill();
  ctx.fillStyle = '#a8e5e3'; ctx.fillRect(-9, -18, 18, 12);
  ctx.fillStyle = isPlayer ? '#d6f54a' : '#f4f1ea'; ctx.fillRect(-12, -car.height / 2 + 5, 8, 4); ctx.fillRect(4, -car.height / 2 + 5, 8, 4);
  ctx.fillStyle = '#101820'; ctx.fillRect(-car.width / 2 - 2, -18, 4, 13); ctx.fillRect(car.width / 2 - 2, -18, 4, 13); ctx.fillRect(-car.width / 2 - 2, 8, 4, 13); ctx.fillRect(car.width / 2 - 2, 8, 4, 13); ctx.restore();
}
function overlaps(a, b) { return Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 6 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 8; }
function update(delta) {
  const boosting = boostHeld && boost > 0;
  const movement = (player.speed + (boosting ? 3.5 : 0)) * delta * 0.06;
  if (keys.left) player.x -= movement; if (keys.right) player.x += movement;
  player.x = Math.max(road.left + player.width / 2 + 7, Math.min(road.right - player.width / 2 - 7, player.x));
  const pace = 4.4 + score / 900 + (boosting ? 5 : 0); roadOffset = (roadOffset + pace * delta * 0.06) % 66;
  boost += (boosting ? -0.12 : 0.018) * delta; boost = Math.max(0, Math.min(100, boost)); boostMeter.style.transform = `scaleX(${boost / 100})`;
  spawnTimer += delta; if (spawnTimer > Math.max(530, 920 - score * 2)) { spawnCar(); spawnTimer = 0; }
  traffic.forEach(car => { car.y += (pace + car.speed) * delta * 0.06; if (overlaps(player, car)) endGame(); });
  traffic = traffic.filter(car => car.y < canvas.height + 100); score += delta * 0.012; scoreElement.textContent = formatScore(score);
}
function render() { drawRoad(); traffic.forEach(car => drawCar(car)); drawCar(player, true); }
function loop(now) { if (!running) return; const delta = Math.min(now - lastTime, 40); lastTime = now; update(delta); render(); if (running) requestAnimationFrame(loop); }
function setKey(direction, pressed) { keys[direction] = pressed; }

window.addEventListener('keydown', event => { if (['ArrowLeft', 'a', 'A'].includes(event.key)) { event.preventDefault(); setKey('left', true); } if (['ArrowRight', 'd', 'D'].includes(event.key)) { event.preventDefault(); setKey('right', true); } if (event.code === 'Space') { event.preventDefault(); boostHeld = true; } if (event.key === 'Enter' && !running) startGame(); });
window.addEventListener('keyup', event => { if (['ArrowLeft', 'a', 'A'].includes(event.key)) setKey('left', false); if (['ArrowRight', 'd', 'D'].includes(event.key)) setKey('right', false); if (event.code === 'Space') boostHeld = false; });
document.querySelectorAll('[data-direction]').forEach(button => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); setKey(direction, true); });
  button.addEventListener('pointerup', () => setKey(direction, false));
  button.addEventListener('pointercancel', () => setKey(direction, false));
  button.addEventListener('lostpointercapture', () => setKey(direction, false));
});
boostButton.addEventListener('pointerdown', event => { event.preventDefault(); boostButton.setPointerCapture(event.pointerId); boostHeld = true; });
boostButton.addEventListener('pointerup', () => { boostHeld = false; });
boostButton.addEventListener('pointercancel', () => { boostHeld = false; });
boostButton.addEventListener('lostpointercapture', () => { boostHeld = false; });
startButton.addEventListener('click', startGame); restartButton.addEventListener('click', startGame); render();
