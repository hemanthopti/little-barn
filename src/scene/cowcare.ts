import { $, el, rnd, pick } from '../core/util';
import { tween } from '../core/engine';
import { objs, Pt, Interactive } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { url } from '../art/sprites';

/**
 * Cow Care is deliberately independent of the farm Animal actors.
 * Existing scenes retain their own state, touch objects, animations and art.
 * This room uses the same 1600x900 SVG coordinates and shared pointer router.
 */
type Tool = 'pet' | 'brush' | 'wash' | 'apple' | 'milk' | 'sleep';
const TOOLS: { id: Tool; icon: string; label: string; colour: string }[] = [
  { id: 'pet', icon: '💗', label: 'Pet the cow', colour: '#ffe0e8' },
  { id: 'brush', icon: '🧽', label: 'Brush the cow', colour: '#ffeabb' },
  { id: 'wash', icon: '🚿', label: 'Give the cow a bath', colour: '#caf1ff' },
  { id: 'apple', icon: '🍎', label: 'Feed an apple', colour: '#ffe1c9' },
  { id: 'milk', icon: '🪣', label: 'Milk the cow', colour: '#daeeff' },
  { id: 'sleep', icon: '💤', label: 'Put the cow to sleep', colour: '#e6ddff' }
];
const PHRASES: Record<Tool, string[]> = {
  pet: ['Moo! I love cuddles!', 'Hee hee! That tickles!', 'You are my friend!'],
  brush: ['Oh! That feels nice!', 'Brush, brush! So fluffy!', 'Moooo!'],
  wash: ['Splash splash!', 'Bubbles! Hee hee!', 'I am all clean!'],
  apple: ['Crunch crunch! Yummy!', 'Thank moo for my apple!', 'More apples please!'],
  milk: ['Moooo! Milk for you!', 'Well done!', 'Fresh milk!'],
  sleep: ['Good night, little friend!', 'Mooo... sweet dreams!']
};

let selected: Tool = 'pet';
let inRoom = false;
let poseRun = 0;
let toolGhost: SVGGElement | null = null;
let activeTool: Tool | null = null;
let cleaning = 0;
let bucketMilk = 0;
let tick = 0;
let moo: SVGGElement;
let photo: SVGImageElement;
let fx: SVGGElement;
let bucket: SVGGElement;
let foam: SVGGElement;

const isActive = () => inRoom && state.scene === 'cowcare' && state.started && !state.asleep && $('panel').hidden;
const get = (id: string) => $(id) as SVGGElement;

function drawCow(pose: 'idle' | 'happy' | 'sleep') {
  const height = pose === 'sleep' ? 328 : 472;
  const width = height * (pose === 'sleep' ? 613 / 383 : pose === 'happy' ? 525 / 489 : 556 / 520);
  photo.setAttribute('href', url('cow-' + pose));
  photo.setAttribute('x', String(-width / 2));
  photo.setAttribute('y', String(-height));
  photo.setAttribute('width', String(width));
  photo.setAttribute('height', String(height));
}

function say(tool: Tool) {
  if (!state.sound) return;
  // Preserve the existing multilingual game behaviour: non-English uses the supplied cow recording.
  if (state.lang !== 'en') { speak('cow'); return; }
  const line = pick(PHRASES[tool]);
  try {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = 'en-US';
      utterance.rate = .94;
      utterance.pitch = 1.48;
      speechSynthesis.speak(utterance);
    } else speak('cow');
  } catch { speak('cow'); }
}

function burst(type: Tool, x = 800, y = 350) {
  const symbol = type === 'wash' ? '🫧' : type === 'apple' ? '💖' : type === 'milk' ? '🥛' : type === 'sleep' ? '💤' : '✨';
  for (let i = 0; i < 9; i++) {
    const item = el('text', { x: 0, y: 0, 'font-size': rnd(27, 43), opacity: 1, 'text-anchor': 'middle', 'pointer-events': 'none' }, fx);
    item.textContent = symbol;
    const dx = rnd(-210, 210), dy = rnd(-140, 80), delay = i * 50;
    window.setTimeout(() => {
      if (!item.isConnected) return;
      tween(800, t => {
        item.setAttribute('transform', 'translate(' + (x + dx * t) + ',' + (y + dy * t - 120 * t) + ')');
        item.setAttribute('opacity', String(1 - t));
      }, () => item.remove());
    }, delay);
  }
}

function cowPose(pose: 'happy' | 'sleep' = 'happy') {
  const run = ++poseRun;
  drawCow(pose);
  if (pose === 'sleep') {
    moo.setAttribute('transform', 'translate(800 731)');
    return;
  }
  tween(700, t => {
    if (run !== poseRun || !inRoom) return;
    const lift = Math.sin(Math.PI * t) * 45;
    const tilt = Math.sin(Math.PI * 2 * t) * 3.5;
    moo.setAttribute('transform', 'translate(800 ' + (731 - lift) + ') rotate(' + tilt + ')');
  }, () => {
    if (run !== poseRun || !inRoom) return;
    moo.setAttribute('transform', 'translate(800 731)');
    drawCow('idle');
  });
}

function drops(x: number, y: number, n = 14) {
  for (let i = 0; i < n; i++) {
    const drop = el('ellipse', { cx: 0, cy: 0, rx: rnd(5, 11), ry: rnd(10, 20), fill: '#7bd7ff', opacity: .85, 'pointer-events': 'none' }, fx);
    const sx = x + rnd(-130, 130), sy = y + rnd(-40, 40), end = sy + rnd(80, 180);
    tween(670, t => {
      drop.setAttribute('transform', 'translate(' + (sx + t * 30) + ',' + (sy + (end - sy) * t * t) + ')');
      drop.setAttribute('opacity', String(1 - t));
    }, () => drop.remove());
  }
}

function react(type: Tool, p?: Pt) {
  if (!isActive()) return;
  selected = type;
  setHighlights();
  if (type === 'sleep') {
    ++poseRun; moo.setAttribute('transform', 'translate(800 731)');
    drawCow('sleep'); sfx('chimeDown'); say(type);
    burst(type, 850, 360); return;
  }
  sfx(type === 'wash' ? 'splash' : type === 'apple' ? 'chomp' : type === 'milk' ? 'pop' : type === 'brush' ? 'rustle' : 'moo');
  say(type);
  if (type === 'wash') {
    cleaning = Math.min(1, cleaning + .28);
    foam.setAttribute('opacity', String(Math.max(.1, 1 - cleaning)));
    drops(p?.x || 800, p?.y || 365);
  } else if (type === 'brush') {
    cleaning = Math.min(1, cleaning + .2);
    foam.setAttribute('opacity', String(Math.max(.1, 1 - cleaning)));
  } else if (type === 'milk') {
    bucketMilk = Math.min(1, bucketMilk + .22);
    get('ccMilkFill').setAttribute('opacity', String(bucketMilk));
    drops(1010, 570, 5);
  } else if (type === 'apple') {
    const apple = get('ccFlyingApple');
    apple.setAttribute('opacity', '1');
    tween(480, t => {
      apple.setAttribute('transform', 'translate(' + (400 + 410 * t) + ',' + (700 - 390 * t + 120 * t * t) + ') scale(' + (1 - .5 * t) + ')');
    }, () => apple.setAttribute('opacity', '0'));
  }
  cowPose();
  burst(type, p?.x || 800, p?.y || 365);
}

function setHighlights() {
  for (const t of TOOLS) get('ccButton-' + t.id).setAttribute('stroke', selected === t.id ? '#efb844' : '#ffffff');
}

function toolDrag(id: Tool): Interactive {
  const home = TOOLS.findIndex(t => t.id === id);
  const sx = 210 + home * 215;
  return {
    tap: () => react(id),
    drag: {
      start(_start, p) {
        if (!isActive()) return false;
        activeTool = id;
        toolGhost = el('g', { 'pointer-events': 'none' }, get('ccDrag')) as SVGGElement;
        toolGhost.innerHTML = '<circle r="51" fill="#fff9dc" stroke="#ffdc7f" stroke-width="5"/><text y="17" font-size="58" text-anchor="middle">' + TOOLS[home].icon + '</text>';
        toolGhost.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
        return true;
      },
      move(p) { if (toolGhost) toolGhost.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')'); },
      end(p) {
        toolGhost?.remove(); toolGhost = null; activeTool = null;
        if (p.x > 515 && p.x < 1080 && p.y > 210 && p.y < 740) react(id, p);
      }
    }
  };
}

export function initCowCare() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('id', 'cowcare');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', '0 0 1600 900');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('style', 'display:none');
  svg.innerHTML = [
    '<defs><linearGradient id="ccWall" x2="0" y2="1"><stop stop-color="#fce8c8"/><stop offset="1" stop-color="#f2bf91"/></linearGradient>',
    '<linearGradient id="ccFloor" x2="0" y2="1"><stop stop-color="#ecc493"/><stop offset="1" stop-color="#cc8d52"/></linearGradient>',
    '<linearGradient id="ccWood" x2="0" y2="1"><stop stop-color="#d56b4f"/><stop offset="1" stop-color="#a64036"/></linearGradient></defs>',
    '<rect width="1600" height="900" fill="url(#ccWall)"/>',
    '<rect width="1600" height="620" fill="url(#ccWood)"/>',
    '<path d="M0 70H1600M0 240H1600M0 410H1600M0 580H1600" stroke="#9e3a34" stroke-width="9" opacity=".36"/>',
    '<path d="M0 60L1600 60M110 0V620M1490 0V620" stroke="#f7c18e" stroke-width="32" opacity=".8"/>',
    '<rect x="70" y="145" width="420" height="330" rx="35" fill="#ffe7bc" stroke="#ffe8ce" stroke-width="24"/>',
    '<rect x="92" y="166" width="376" height="286" rx="15" fill="#a9e0f7"/>',
    '<image href="' + url('bg-hills') + '" x="95" y="160" width="370" height="292" preserveAspectRatio="xMidYMid slice"/>',
    '<path d="M277 166V454M93 310H470" stroke="#fff1d4" stroke-width="18"/>',
    '<rect x="1120" y="158" width="370" height="24" rx="12" fill="#ffdb9e"/>',
    '<image href="' + url('hay') + '" x="1190" y="225" width="260" height="170"/>',
    '<image href="' + url('bush') + '" x="1160" y="100" width="185" height="105"/>',
    '<rect y="620" width="1600" height="280" fill="url(#ccFloor)"/>',
    '<path d="M0 678H1600M0 788H1600M0 886H1600M320 620L220 900M1010 620L900 900M1440 620L1520 900" stroke="#c78b55" stroke-width="5" opacity=".4"/>',
    '<ellipse cx="800" cy="741" rx="405" ry="78" fill="#bfebda" opacity=".7" />',
    '<ellipse cx="800" cy="743" rx="355" ry="59" fill="#d4fff2" opacity=".65" />',
    '<g id="ccFoam" opacity=".8" pointer-events="none"><circle cx="875" cy="402" r="25" fill="#efffff" opacity=".88"/><circle cx="899" cy="423" r="15" fill="#e1f6ff"/><circle cx="843" cy="407" r="17" fill="#fff"/></g>',
    '<g id="ccCow" transform="translate(800 731)" data-id="cc-cow"><image id="ccPhoto" href="' + url('cow-idle') + '" x="-252" y="-472" width="504" height="472"/>',
    '<rect x="-238" y="-440" width="476" height="440" rx="95" fill="transparent"/></g>',
    '<g id="ccBucket" pointer-events="none"><ellipse cx="1060" cy="728" rx="75" ry="19" fill="#fff" opacity=".25"/>',
    '<path d="M989 619L1005 746Q1060 770 1116 746L1131 619Z" fill="#91afc5" stroke="#e6faff" stroke-width="8"/>',
    '<ellipse cx="1060" cy="619" rx="73" ry="21" fill="#e8f4fc" stroke="#7a9aa9" stroke-width="9"/>',
    '<g id="ccMilkFill" opacity="0"><ellipse cx="1060" cy="620" rx="58" ry="12" fill="#fff"/></g>',
    '<path d="M987 640Q1060 534 1132 640" fill="none" stroke="#768996" stroke-width="13"/></g>',
    '<g id="ccFlyingApple" opacity="0" pointer-events="none"><image href="' + url('apple') + '" x="-55" y="-75" width="110" height="130"/></g>',
    '<g id="ccFx" pointer-events="none"></g>',
    '<g id="ccDrag" pointer-events="none"></g>',
    '<g id="ccTools"></g>'
  ].join('');
  $('rooms').before(svg);
  moo = get('ccCow');
  photo = $('ccPhoto') as SVGImageElement;
  fx = get('ccFx');
  bucket = get('ccBucket');
  foam = get('ccFoam');
  const rack = get('ccTools');
  TOOLS.forEach((t, i) => {
    const x = 130 + i * 215;
    const b = el('g', { 'data-id': 'cc-' + t.id, role: 'button', 'aria-label': t.label }, rack);
    b.innerHTML = '<rect id="ccButton-' + t.id + '" x="' + x + '" y="789" width="162" height="92" rx="35" fill="' + t.colour + '" stroke="#ffffff" stroke-width="7"/>' +
      '<text x="' + (x + 81) + '" y="855" font-size="56" text-anchor="middle" pointer-events="none">' + t.icon + '</text>';
    objs['cc-' + t.id] = toolDrag(t.id);
  });
  objs['cc-cow'] = {
    tap: (p) => react(selected, p),
    hold: { start: () => react('pet'), end: () => { } },
    drag: { start: () => isActive(), move: p => {
      if (++tick % 7 === 0) burst('pet', p.x, p.y);
    }, end: p => react('pet', p) }
  };
  setHighlights();
}

export function cowCareEnter() {
  inRoom = true;
  selected = 'pet'; cleaning = 0; bucketMilk = 0;
  foam.setAttribute('opacity', '.8');
  get('ccMilkFill').setAttribute('opacity', '0');
  get('ccFlyingApple').setAttribute('opacity', '0');
  ++poseRun;
  moo.setAttribute('transform', 'translate(800 731)');
  drawCow('idle'); setHighlights();
  sfx('moo');
}

export function cowCareLeave() {
  inRoom = false; ++poseRun;
  toolGhost?.remove(); toolGhost = null; activeTool = null;
  fx.innerHTML = '';
  get('ccDrag').innerHTML = '';
}
