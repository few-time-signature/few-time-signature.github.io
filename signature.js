// An illustrative binary DAG. Each frontier below suffices to derive the same root.
const canvas = document.querySelector("#dag");
const ctx = canvas.getContext("2d");
const stageButtons = [...document.querySelectorAll("[data-phase]")];
const motion = document.querySelector("#motion");
const note = document.querySelector("#phase-note");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const width = 600;
const height = 274;
const nodes = [
  [42, 27],
  [59, 53],
  [46, 82],
  [60, 111],
  [39, 157],
  [57, 186],
  [46, 217],
  [62, 246],
  [177, 45],
  [191, 101],
  [176, 173],
  [193, 228],
  [330, 77],
  [339, 199],
  [524, 135],
];
const first = new Set([0, 1, 9, 13]);
const second = new Set([12, 4, 5, 11]);
const children = new Map([
  [8, [0, 1]],
  [9, [2, 3]],
  [10, [4, 5]],
  [11, [6, 7]],
  [12, [8, 9]],
  [13, [10, 11]],
  [14, [12, 13]],
]);
const messages = [
  "Four mint labels make up the first signature, σ₁.",
  "Hash the disclosed labels along the lit paths to recompute the public root.",
  "The second signature, σ₂, adds four violet labels to the public history.",
];
const phaseLengths = [4300, 6000, 5000];
let stage = 0;
let elapsed = 0;
let playing = !reduced.matches;
let stopAtStageEnd = false;
let onScreen = true;
let previousTime = null;
let frame = null;
let sx = 1,
  sy = 1,
  ratio = 1;
const background = document.createElement("canvas");

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const edges = [];
for (const [target, pair] of children) {
  for (const source of pair) {
    const [x1, y1] = nodes[source],
      [x2, y2] = nodes[target];
    const dx = x2 - x1,
      dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    edges.push({
      source,
      target,
      x1,
      y1,
      dx,
      dy,
      nx: -dy / length,
      ny: dx / length,
      spread: target === 14 ? 17 : target >= 12 ? 11 : 7,
    });
  }
}

function point(edge, t, offset = 0, wave = 0) {
  const bell = Math.sin(Math.PI * t);
  const curve = t * t * (3 - 2 * t);
  const displacement = bell * (offset + wave * Math.sin(2 * Math.PI * t));
  return [
    edge.x1 + edge.dx * t + edge.nx * displacement,
    edge.y1 + edge.dy * curve + edge.ny * displacement,
  ];
}

function strand(context, edge, offset, wave, stop = 1) {
  context.beginPath();
  context.moveTo(edge.x1, edge.y1);
  for (let k = 1; k <= 26; k++)
    context.lineTo(...point(edge, (stop * k) / 26, offset, wave));
  context.stroke();
}

function paintBackground() {
  background.width = canvas.width;
  background.height = canvas.height;
  const c = background.getContext("2d");
  c.scale(sx, sy);
  const random = randomGenerator(473);
  const haze = c.createRadialGradient(310, 137, 4, 310, 137, 247);
  haze.addColorStop(0, "rgba(57,79,178,.20)");
  haze.addColorStop(0.65, "rgba(27,47,114,.13)");
  haze.addColorStop(1, "rgba(17,31,70,0)");
  c.fillStyle = haze;
  c.fillRect(0, 0, width, height);
  // Fixed grain and filament geometry make the animation stable between frames.
  for (let i = 0; i < 1800; i++) {
    const x = random() * width,
      y = random() * height;
    c.fillStyle = "rgba(158,175,255," + random() * 0.23 + ")";
    c.fillRect(x, y, 0.65, 0.65);
  }
  for (const edge of edges) {
    for (let f = 0; f < 83; f++) {
      const offset = (random() - 0.5) * 2 * edge.spread;
      const wave = (random() - 0.5) * edge.spread;
      c.lineWidth = 0.32 + random() * 0.58;
      const light = random();
      c.strokeStyle =
        light > 0.76
          ? "rgba(168,188,255,.35)"
          : light > 0.45
            ? "rgba(81,120,255,.29)"
            : "rgba(62,79,225,.40)";
      strand(c, edge, offset, wave);
    }
    for (let i = 0; i < 110; i++) {
      const [x, y] = point(
        edge,
        random(),
        (random() - 0.5) * edge.spread * 2.8,
        random() * 3,
      );
      c.fillStyle = "rgba(160,185,255," + random() * 0.7 + ")";
      c.fillRect(x, y, 0.8, 0.8);
    }
  }
}

const activeEdges = new Map();
function visit(id) {
  if (first.has(id)) return 0;
  const inputs = children.get(id);
  const levels = inputs.map(visit);
  const level = Math.max(...levels) + 1;
  for (const input of inputs) activeEdges.set(input, level);
  return level;
}
const layers = visit(14);

function gem(id, color, selected, progress) {
  const [x, y] = nodes[id];
  const radius = id === 14 ? 6.5 : selected ? 4.2 : 2.5;
  if (selected || id === 14) {
    const halo = ctx.createRadialGradient(x, y, 1, x, y, selected ? 18 : 13);
    halo.addColorStop(0, color + "74");
    halo.addColorStop(1, color + "00");
    ctx.fillStyle = halo;
    ctx.fillRect(x - 19, y - 19, 38, 38);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = selected ? color : "#17284d";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.fillRect(-radius / 2, -radius / 2, radius, radius);
  ctx.strokeRect(-radius / 2, -radius / 2, radius, radius);
  if (selected) {
    const ring = radius + 4 + progress * 2.4;
    ctx.globalAlpha = 0.42;
    ctx.strokeRect(-ring / 2, -ring / 2, ring, ring);
  }
  ctx.restore();
}

function signaturePacket(phase) {
  const reuse = stage === 2;
  const frontier = [...(reuse ? second : first)];
  const tint = reuse ? "#d4adff" : "#9bf8d9";
  const baseX = 432,
    baseY = 234;
  ctx.fillStyle = "#101830";
  ctx.strokeStyle = "#435071";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(baseX - 16, baseY - 14, 125, 26, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d8e2ff";
  ctx.textAlign = "left";
  ctx.font = "italic 16px Georgia, serif";
  ctx.fillText(reuse ? "σ₂" : "σ₁", baseX - 5, baseY + 4);
  for (const [i, id] of frontier.entries()) {
    const x = baseX + 31 + i * 20,
      y = baseY - 1;
    const t =
      stage === 1 ? 1 : Math.max(0, Math.min(1, (phase - i * 0.115) * 2.65));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = tint;
    ctx.globalAlpha = t >= 1 ? 1 : 0.45;
    ctx.strokeRect(-2.7, -2.7, 5.4, 5.4);
    if (t >= 1) {
      ctx.fillStyle = tint;
      ctx.fillRect(-2.7, -2.7, 5.4, 5.4);
    }
    ctx.restore();
    if (t > 0 && t < 1) {
      const [startX, startY] = nodes[id];
      const eased = t * t * (3 - 2 * t);
      const px = startX + (x - startX) * eased;
      const py =
        startY +
        (y - startY) * eased +
        Math.sin(Math.PI * eased) * Math.min(39, (x - startX) * 0.12);
      ctx.fillStyle = tint;
      ctx.shadowBlur = 10;
      ctx.shadowColor = tint;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function paint() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0);
  ctx.scale(sx, sy);
  const phase = elapsed / phaseLengths[stage];
  const verification = stage === 1 ? Math.min(1, phase * 1.32) : 0;
  if (stage === 1) {
    for (const edge of edges) {
      const layer = activeEdges.get(edge.source);
      if (!layer) continue;
      const t = Math.max(0, Math.min(1, verification * layers - layer + 1));
      if (!t) continue;
      ctx.strokeStyle = "#a7f5e8";
      ctx.lineWidth = 1.55;
      strand(ctx, edge, 0, 0, t);
      if (t < 1) {
        const [x, y] = point(edge, t);
        ctx.fillStyle = "#e6fff8";
        ctx.shadowColor = "#5bffdd";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
  for (let id = 0; id < nodes.length; id++) {
    const reached =
      stage === 1 &&
      children.has(id) &&
      activeEdges.has(children.get(id)[0]) &&
      verification * layers >= activeEdges.get(children.get(id)[0]);
    const old = first.has(id),
      fresh = stage === 2 && second.has(id);
    gem(
      id,
      fresh
        ? "#c4a1ff"
        : old || reached
          ? "#88f3d2"
          : id === 14
            ? "#c8d5ff"
            : "#8da6ff",
      old || fresh || reached,
      (1 + Math.sin(elapsed / 650 + id)) / 2,
    );
  }
  signaturePacket(phase);
  const fontSize = Math.max(10, 10 / (sx / ratio));
  ctx.font = fontSize + "px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#c7d5f2";
  ctx.fillText("PUBLIC ROOT", nodes[14][0], nodes[14][1] - 19);
}

function describeStage() {
  stageButtons.forEach((b, i) =>
    b.setAttribute("aria-pressed", String(i === stage)),
  );
  note.textContent = messages[stage];
  canvas.setAttribute(
    "aria-label",
    "Illustrative hash DAG. " + messages[stage],
  );
  motion.textContent = playing ? "Pause" : "Play";
  motion.classList.toggle("stopped", !playing);
  motion.setAttribute(
    "aria-label",
    (playing ? "Pause" : "Play") + " signature animation",
  );
}
function tick(now) {
  frame = null;
  if (previousTime !== null) elapsed += Math.min(now - previousTime, 100);
  previousTime = now;
  if (elapsed >= phaseLengths[stage]) {
    if (stopAtStageEnd) {
      elapsed = phaseLengths[stage];
      playing = false;
      stopAtStageEnd = false;
    } else {
      elapsed = 0;
      stage = (stage + 1) % 3;
    }
    describeStage();
  }
  paint();
  schedule();
}
function schedule() {
  if (playing && onScreen && !document.hidden) {
    if (frame === null) frame = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
  }
}
function size() {
  const rect = canvas.getBoundingClientRect();
  ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  sx = canvas.width / width;
  sy = canvas.height / height;
  paintBackground();
  paint();
}
stageButtons.forEach((b, i) =>
  b.addEventListener("click", () => {
    stage = i;
    playing = !reduced.matches;
    stopAtStageEnd = playing;
    elapsed = playing ? 0 : phaseLengths[i];
    previousTime = null;
    describeStage();
    schedule();
    paint();
  }),
);
motion.addEventListener("click", () => {
  playing = !playing;
  stopAtStageEnd = false;
  if (playing && elapsed >= phaseLengths[stage]) elapsed = 0;
  describeStage();
  schedule();
});
reduced.addEventListener("change", () => {
  playing = !reduced.matches;
  stopAtStageEnd = false;
  elapsed = playing ? 0 : phaseLengths[stage];
  describeStage();
  schedule();
  paint();
});
document.addEventListener("visibilitychange", schedule);
new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
  schedule();
}).observe(canvas);
new ResizeObserver(size).observe(canvas);
if (reduced.matches) elapsed = phaseLengths[stage];
size();
describeStage();
schedule();
