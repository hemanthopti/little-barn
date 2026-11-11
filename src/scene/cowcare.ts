import { $, el, rnd, pick } from '../core/util';
import { tween } from '../core/engine';
import { objs, Pt, Interactive } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { url } from '../art/sprites';
import { Cow3D } from './cow3d';
import { getMic, stopMic, recordClip } from '../audio/mic';
import { AC, master } from '../audio/synth';

/** Self-contained fifth room: all its objects, effects and state live under cc-. */
type Tool = 'pet' | 'brush' | 'wash' | 'apple' | 'milk' | 'sleep';
const tools: Tool[] = ['pet', 'brush', 'wash', 'apple', 'milk', 'sleep'];
const phrases: Record<Tool, string[]> = {
  pet: ['Oh! That tickles!', 'Moo moo! I love cuddles!', 'You are my friend!'],
  brush: ['Oooh, a back scratch!', 'Brush brush! So fluffy!', 'That feels lovely!'],
  wash: ['Brr! Splash splash!', 'Bubbles! Hee hee!', 'Now I am squeaky clean!'],
  apple: ['Crunch! Delicious!', 'Thank moo for the apple!', 'Yummy!'],
  milk: ['Moooo! Fresh milk!', 'Well done, little farmer!', 'Thank you!'],
  sleep: ['Good night, little friend!', 'Mooo... sweet dreams!']
};
const colors: Record<Tool, string> = {
  pet: '#ffd6de', brush: '#ffe3a5', wash: '#b8efff', apple: '#ffe0c4', milk: '#d7eeff', sleep: '#dfd5ff'
};
// Each tool is drawn as glossy vector art rather than a platform-dependent emoji.
const icon: Record<Tool, string> = {
  pet: '<path d="M0 35C-60 0-55-45-20-43C-8-42 0-30 0-30S15-55 39-38C63-18 47 7 0 35Z" fill="url(#ccPink)" stroke="#fff1f4" stroke-width="5"/><path d="M-35-20Q-27-40-12-31" fill="none" stroke="white" stroke-opacity=".75" stroke-width="7" stroke-linecap="round"/>',
  brush: '<g transform="rotate(-25)"><rect x="-23" y="-21" width="46" height="82" rx="17" fill="url(#ccWood)" stroke="#ffe0a2" stroke-width="4"/><rect x="-49" y="-48" width="98" height="61" rx="27" fill="url(#ccGold)" stroke="#fff2bf" stroke-width="5"/><path d="M-38-46V-65M-20-48V-68M0-48V-70M20-48V-68M38-46V-65" stroke="#fff5cc" stroke-width="11" stroke-linecap="round"/></g>',
  wash: '<g transform="rotate(-23)"><rect x="-13" y="-6" width="25" height="75" rx="12" fill="url(#ccSilver)"/><ellipse cx="0" cy="-19" rx="47" ry="25" fill="url(#ccSilver)" stroke="#f4fbff" stroke-width="5"/><ellipse cy="-26" rx="37" ry="13" fill="#64b6db" stroke="#d9faff" stroke-width="4"/></g><circle cx="-35" cy="40" r="8" fill="#8cddff"/><circle cx="5" cy="47" r="10" fill="#a9eaff"/><circle cx="43" cy="33" r="8" fill="#70d2ff"/>',
  apple: '<image href="' + url('apple') + '" x="-48" y="-58" width="96" height="114" preserveAspectRatio="xMidYMid meet"/>',
  milk: '<path d="M-38-35L-29 46Q0 57 29 46L38-35Z" fill="url(#ccSilver)" stroke="#e3f8ff" stroke-width="5"/><ellipse cy="-35" rx="38" ry="12" fill="#d4e3ed" stroke="#94bac8" stroke-width="6"/><ellipse cy="-35" rx="29" ry="6" fill="white"/><path d="M-38-26Q-59-58-29-64M38-26Q59-58 29-64" fill="none" stroke="#93aeba" stroke-width="8" stroke-linecap="round"/>',
  sleep: '<path d="M18-49A48 48 0 1 0 51 18A40 40 0 0 1 18-49Z" fill="url(#ccMoon)" stroke="#fff6bb" stroke-width="5"/><circle cx="34" cy="-38" r="7" fill="#fff"/><path d="M51-16L57-2L72 2L57 7L52 22L47 7L33 2L47-3Z" fill="#ffeaaa"/>'
};

let cow3d: Cow3D | null = null;
let recording = false;
let entered = false, selected: Tool = 'pet', actionToken = 0, cleaning = 0, milkLevel = 0;
let cow!: SVGGElement, cowImg!: SVGImageElement, fx!: SVGGElement, trail!: SVGGElement;
let ghost: SVGGElement | null = null, dragTool: Tool | null = null;
let moving = 0;
const node = (id: string) => $(id) as SVGGElement;
const active = () => entered && state.scene === 'cowcare' && state.started && !state.asleep && $('panel').hidden;
const svgEl = (tag: string, attrs: Record<string, string | number>, parent: Element) => el(tag, attrs, parent);
const wait = (ms: number, cb: () => void, token: number) =>
  window.setTimeout(() => { if (entered && token === actionToken) cb(); }, ms);
function pose(p: 'idle' | 'happy' | 'sleep') {
  const [w, h] = p === 'idle' ? [519, 485] : p === 'happy' ? [521, 485] : [670, 418];
  cowImg.setAttribute('href', url('cow-' + p));
  for (const [k, v] of Object.entries({ x: -w / 2, y: -h, width: w, height: h })) cowImg.setAttribute(k, String(v));
}
function face(x = 770, y = 335) { return { x, y }; }
function speakCow(t: Tool) {
  if (!state.sound) return;
  if (state.lang !== 'en') { speak(t === 'apple' ? 'yummy' : t === 'sleep' ? 'sleep' : 'cow'); return; }
  try {
    if (!('speechSynthesis' in window)) { speak('cow'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(pick(phrases[t]));
    u.lang = 'en-US'; u.rate = .95; u.pitch = 1.48;
    speechSynthesis.speak(u);
  } catch { speak('cow'); }
}
function tweenMove(group: Element, ms: number, fn: (t: number) => string, token: number, done?: () => void) {
  tween(ms, t => { if (!entered || token !== actionToken) return; group.setAttribute('transform', fn(t)); }, () => {
    if (entered && token === actionToken) done?.();
  });
}
function particle(kind: 'bubble' | 'heart' | 'spark' | 'drop' | 'milk', x: number, y: number, token: number) {
  if (!active()) return;
  const p = svgEl(kind === 'spark' ? 'path' : kind === 'heart' ? 'path' : 'circle', {}, fx);
  if (kind === 'heart') p.setAttribute('d', 'M0 8C-34-14-23-29-7-24Q0-20 0-14Q17-39 30-18Q40 4 0 32Z');
  if (kind === 'spark') p.setAttribute('d', 'M0-19L6-6L20 0L6 6L0 20L-6 6L-20 0L-6-6Z');
  if (kind !== 'heart' && kind !== 'spark') p.setAttribute('r', String(rnd(7, 16)));
  p.setAttribute('fill', kind === 'heart' ? '#ff8fa9' : kind === 'spark' ? '#ffe37c' : kind === 'drop' ? '#88dfff' : kind === 'milk' ? '#ffffff' : '#d9faff');
  p.setAttribute('stroke', '#ffffff'); p.setAttribute('stroke-width', '3');
  p.setAttribute('opacity', '.9'); p.setAttribute('pointer-events', 'none');
  const dx = rnd(-120, 120), rise = rnd(60, 160), scale = rnd(.6, 1.3);
  tween(920, t => {
    p.setAttribute('transform', 'translate(' + (x + dx * t) + ' ' + (y - rise * t + (kind === 'drop' || kind === 'milk' ? 170 * t * t : 0)) + ') scale(' + scale * (1 - .55 * t) + ')');
    p.setAttribute('opacity', String(1 - t));
  }, () => p.remove());
}
function sprinkle(kind: 'bubble' | 'heart' | 'spark' | 'drop' | 'milk', x: number, y: number, n: number, token: number) {
  for (let i = 0; i < n; i++) wait(i * 45, () => particle(kind, x + rnd(-70, 70), y + rnd(-30, 30), token), token);
}
function toolSvg(t: Tool, x: number, y: number, scale = 1) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' + icon[t] + '</g>';
}
function select(t: Tool) {
  selected = t;
  for (const item of tools) {
    const outline = node('ccBtn-' + item);
    outline.setAttribute('stroke', item === t ? '#ffbf4d' : '#fffaec');
    outline.setAttribute('stroke-width', item === t ? '9' : '6');
  }
}
function happy(kind: 'bob' | 'wiggle' | 'jump' | 'sleep', token: number) {
  if (kind === 'sleep') { pose('sleep'); cow.setAttribute('transform', 'translate(800 733)'); return; }
  pose(kind === 'jump' ? 'happy' : 'idle');
  const dur = kind === 'jump' ? 900 : 700;
  tweenMove(cow, dur, t => {
    const bounce = kind === 'jump' ? -70 * Math.sin(Math.PI * t) : kind === 'bob' ? -15 * Math.sin(Math.PI * 2 * t) : -5;
    const tilt = kind === 'wiggle' ? Math.sin(t * Math.PI * 6) * 5.5 : kind === 'bob' ? Math.sin(t * Math.PI * 4) * 2 : Math.sin(Math.PI * 2 * t) * 2;
    return 'translate(800 ' + (733 + bounce) + ') rotate(' + tilt + ')';
  }, token, () => { cow.setAttribute('transform', 'translate(800 733)'); pose('idle'); });
}
function milkPour(token: number) {
  const stream = node('ccMilkStream'), milk = node('ccMilkFill');
  stream.setAttribute('opacity', '1');
  const prev = milkLevel;
  milkLevel = Math.min(1, milkLevel + .26);
  tween(1000, t => {
    if (!entered || token !== actionToken) return;
    stream.setAttribute('opacity', String(t < .8 ? 1 : (1 - t) * 5));
    milk.setAttribute('opacity', String(.35 + .65 * (prev + (milkLevel - prev) * t)));
    milk.setAttribute('ry', String(5 + 15 * (prev + (milkLevel - prev) * t)));
  }, () => stream.setAttribute('opacity', '0'));
  sprinkle('milk', 1026, 585, 4, token);
}
function runAction(t: Tool, target?: Pt) {
  if (!active()) return;
  cow3d?.act(t);
  ++actionToken; const token = actionToken;
  select(t);
  // GPU renderer handles all reactions when available; do not double-render legacy 2D effects.
  if (cow3d) {
    sfx(t === 'wash' ? 'splash' : t === 'apple' ? 'chomp' : t === 'brush' ? 'rustle' : t === 'sleep' ? 'chimeDown' : 'moo');
    speakCow(t);
    return;
  }
  node('ccWater').setAttribute('opacity', '0');
  node('ccSponge').setAttribute('opacity', '0');
  node('ccMilkStream').setAttribute('opacity', '0');
  node('ccEating').setAttribute('opacity', '0');
  node('ccFlyingApple').setAttribute('opacity', '0');
  fx.innerHTML = '';
  cow.setAttribute('transform', 'translate(800 733)');
  pose('idle');
  const p = target || face();
  if (t === 'pet') {
    sfx('moo'); speakCow(t); happy('wiggle', token);
    sprinkle('heart', p.x, p.y, 12, token);
  } else if (t === 'brush') {
    sfx('rustle'); speakCow(t); happy('wiggle', token);
    const sponge = node('ccSponge'); sponge.setAttribute('opacity', '1');
    tweenMove(sponge, 1200, k => 'translate(' + (810 + Math.sin(k * Math.PI * 7) * 98) + ' ' + (440 + k * 80) + ') rotate(' + (Math.sin(k * Math.PI * 7) * 25) + ')', token, () => sponge.setAttribute('opacity', '0'));
    cleaning = Math.min(1, cleaning + .2);
    sprinkle('spark', 860, 440, 12, token);
  } else if (t === 'wash') {
    sfx('splash'); speakCow(t); happy('bob', token);
    node('ccWater').setAttribute('opacity', '1');
    // Water actually pours from the showerhead across the body; droplets animate independently.
    for (let i = 0; i < 24; i++) wait(i * 40, () => particle('drop', 745 + rnd(-65, 75), 345 + rnd(-20, 30), token), token);
    cleaning = Math.min(1, cleaning + .35);
    node('ccFoam').setAttribute('opacity', String(.9 - .83 * cleaning));
    wait(1350, () => node('ccWater').setAttribute('opacity', '0'), token);
    sprinkle('bubble', 800, 425, 15, token);
  } else if (t === 'apple') {
    sfx('chomp'); speakCow(t); happy('bob', token);
    const a = node('ccFlyingApple'); a.setAttribute('opacity', '1');
    tweenMove(a, 920, k => 'translate(' + (320 + 448 * k) + ' ' + (730 - 400 * k + Math.sin(k * Math.PI) * -75) + ') scale(' + (1 - .84 * k) + ')', token, () => {
      a.setAttribute('opacity', '0');
      const eating = node('ccEating'); eating.setAttribute('opacity', '1');
      wait(550, () => eating.setAttribute('opacity', '0'), token);
      sprinkle('heart', 780, 350, 8, token);
    });
  } else if (t === 'milk') {
    sfx('pop'); speakCow(t);
    // Keep the cow standing comfortably while milking: no jumping.
    happy('bob', token); milkPour(token);
  } else if (t === 'sleep') {
    sfx('chimeDown'); speakCow(t); happy('sleep', token);
    sprinkle('spark', 800, 330, 7, token);
  }
}
function makeTool(t: Tool, index: number) {
  const x = 125 + index * 218, y = 782;
  const group = svgEl('g', { 'data-id': 'cc-' + t, role: 'button', 'aria-label': t }, node('ccTools'));
  group.innerHTML = '<rect id="ccBtn-' + t + '" x="' + x + '" y="' + y + '" rx="36" width="172" height="102" fill="' + colors[t] + '" stroke="#fffaec" stroke-width="6" filter="url(#ccToolShadow)"/>' +
    '<path d="M' + (x + 22) + ' ' + (y + 16) + ' Q' + (x + 85) + ' ' + (y - 3) + ' ' + (x + 146) + ' ' + (y + 16) + '" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="8" stroke-linecap="round"/>' +
    toolSvg(t, x + 86, y + 51, .68);
  const obj: Interactive = {
    tap: () => runAction(t),
    drag: {
      start(_p, p) {
        if (!active()) return false;
        dragTool = t;
        ghost?.remove();
        ghost = svgEl('g', { 'pointer-events': 'none' }, trail) as SVGGElement;
        ghost.innerHTML = '<ellipse cy="20" rx="66" ry="60" fill="#fff9e6" stroke="#fff" stroke-width="7" opacity=".95"/>' + toolSvg(t, 0, 0, 1);
        ghost.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
        return true;
      },
      move(p) {
        if (!ghost) return;
        ghost.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
        if (t === 'brush' && active() && p.x > 540 && p.x < 1040 && p.y > 265 && p.y < 720 && moving++ % 9 === 0) {
          particle('spark', p.x, p.y, actionToken);
        }
      },
      end(p) {
        ghost?.remove(); ghost = null; dragTool = null;
        if (p.x > 530 && p.x < 1070 && p.y > 210 && p.y < 750) runAction(t, p);
      }
    }
  };
  objs['cc-' + t] = obj;
}
export function initCowCare() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'cowcare');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', '0 0 1600 900');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.display = 'none';
  const v = [
    '<defs>',
    '<linearGradient id="ccWall" x2=".8" y2="1"><stop stop-color="#f3996d"/><stop offset=".52" stop-color="#ca664f"/><stop offset="1" stop-color="#a94d3a"/></linearGradient>',
    '<linearGradient id="ccFloor" x2="0" y2="1"><stop stop-color="#f9d5a2"/><stop offset=".6" stop-color="#e0aa71"/><stop offset="1" stop-color="#bf7b49"/></linearGradient>',
    '<linearGradient id="ccWood" x2=".7" y2="1"><stop stop-color="#ffcc8e"/><stop offset=".5" stop-color="#ca8a4f"/><stop offset="1" stop-color="#9d623d"/></linearGradient>',
    '<radialGradient id="ccGold"><stop stop-color="#fff8cb"/><stop offset=".6" stop-color="#ffdd78"/><stop offset="1" stop-color="#eaa83c"/></radialGradient>',
    '<linearGradient id="ccSilver" x2="1" y2=".25"><stop stop-color="#87aab9"/><stop offset=".28" stop-color="#f9ffff"/><stop offset=".6" stop-color="#b5cdd5"/><stop offset="1" stop-color="#638c9d"/></linearGradient>',
    '<radialGradient id="ccPink"><stop stop-color="#ffcddc"/><stop offset=".65" stop-color="#fc8ba9"/><stop offset="1" stop-color="#d95780"/></radialGradient>',
    '<linearGradient id="ccMoon" x2="1" y2="1"><stop stop-color="#fff8c3"/><stop offset="1" stop-color="#ddb2ff"/></linearGradient>',
    '<radialGradient id="ccWindowGlow"><stop stop-color="#fff9bf" stop-opacity=".7"/><stop offset="1" stop-color="#fff9bf" stop-opacity="0"/></radialGradient>',
    '<filter id="ccToolShadow" x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#603b26" flood-opacity=".3"/></filter>',
    '<filter id="ccSoftShadow"><feDropShadow dx="0" dy="10" stdDeviation="13" flood-color="#562a23" flood-opacity=".26"/></filter>',
    '<clipPath id="ccWindowClip"><rect x="92" y="137" width="388" height="313" rx="24"/></clipPath>',
    '</defs>',
    '<rect width="1600" height="900" fill="url(#ccWall)"/>',
    '<g opacity=".23" stroke="#873e31" stroke-width="7"><path d="M0 202H1600M0 406H1600M0 600H1600"/></g>',
    '<g stroke="url(#ccWood)" stroke-width="33" opacity=".95"><path d="M85 0V610M1515 0V610M0 68H1600"/></g>',
    '<g stroke="#ffe6b4" stroke-width="8" opacity=".5"><path d="M106 0V612M1493 0V612M0 49H1600"/></g>',
    '<rect x="69" y="115" width="435" height="360" rx="45" fill="#ffe2ad" stroke="#fff3ce" stroke-width="14" filter="url(#ccSoftShadow)"/>',
    '<g clip-path="url(#ccWindowClip)"><rect x="90" y="136" width="390" height="320" fill="#9ee5fc"/><image href="' + url('bg-hills') + '" x="90" y="139" width="390" height="316" preserveAspectRatio="xMidYMid slice"/><rect x="90" y="136" width="390" height="320" fill="url(#ccWindowGlow)"/></g>',
    '<path d="M286 135V451M90 298H485" stroke="#ffeccc" stroke-width="17"/>',
    '<path d="M105 450H479" stroke="#e7b87b" stroke-width="14" stroke-linecap="round"/>',
    '<path d="M90 118Q60 322 142 454" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="9"/>',
    '<rect x="1122" y="156" width="373" height="27" rx="14" fill="url(#ccWood)" filter="url(#ccSoftShadow)"/>',
    '<image href="' + url('hay') + '" x="1201" y="220" width="262" height="185" filter="url(#ccSoftShadow)"/>',
    '<image href="' + url('bush') + '" x="1188" y="80" width="190" height="110"/>',
    '<rect y="610" width="1600" height="290" fill="url(#ccFloor)"/>',
    '<g stroke="#b57f56" stroke-width="5" opacity=".32"><path d="M0 691H1600M0 807H1600M300 610L150 900M920 610L862 900M1420 610L1510 900"/></g>',
    '<ellipse cx="807" cy="745" rx="405" ry="75" fill="#a5d7c7" opacity=".4" filter="url(#ccSoftShadow)"/>',
    '<ellipse cx="804" cy="741" rx="359" ry="53" fill="#d9f8e8" opacity=".83"/>',
    '<ellipse cx="807" cy="741" rx="285" ry="34" fill="#bdebdc" opacity=".75"/>',
    '<ellipse cx="800" cy="735" rx="226" ry="40" fill="#673c2e" opacity=".14"/>',
    '<g id="ccCow" transform="translate(800 733)" data-id="cc-cow" filter="url(#ccSoftShadow)"><image id="ccCowImg" href="' + url('cow-idle') + '" x="-260" y="-485" width="519" height="485"/><rect x="-240" y="-460" width="485" height="455" rx="105" fill="transparent"/></g>',
    // Body foam begins visible, and rinsing reduces it. All effects are behind tool UI.
    '<g id="ccFoam" opacity=".9" pointer-events="none"><circle cx="879" cy="449" r="25" fill="#f3ffff" opacity=".85"/><circle cx="899" cy="464" r="19" fill="#d9f7ff"/><circle cx="850" cy="458" r="17" fill="white"/><circle cx="862" cy="434" r="13" fill="white"/></g>',
    '<g id="ccWater" opacity="0" pointer-events="none">',
    '<path d="M1005 210Q911 272 798 411" stroke="#90e1ff" stroke-width="24" stroke-dasharray="8 24" fill="none" stroke-linecap="round" opacity=".83"/>',
    '<path d="M1023 214Q963 310 873 440" stroke="#dcfaff" stroke-width="14" stroke-dasharray="12 28" fill="none" opacity=".9"/>',
    '<path d="M990 206Q890 262 747 408" stroke="#b5f0ff" stroke-width="11" stroke-dasharray="11 20" fill="none"/>',
    toolSvg('wash', 1050, 202, 1.2),'</g>',
    '<g id="ccSponge" opacity="0" pointer-events="none">',toolSvg('brush',0,0,1.1),'</g>',
    '<g id="ccBucket" pointer-events="none" filter="url(#ccSoftShadow)"><path d="M984 613L998 743Q1055 767 1112 743L1127 613Z" fill="url(#ccSilver)" stroke="#eaf8ff" stroke-width="6"/>',
    '<ellipse cx="1055" cy="614" rx="72" ry="19" fill="#e8faff" stroke="#7797a5" stroke-width="8"/>',
    '<ellipse id="ccMilkFill" cx="1055" cy="614" rx="60" ry="6" fill="white" opacity="0"/>',
    '<path d="M985 624Q1055 508 1126 624" fill="none" stroke="#8eafbf" stroke-width="13"/></g>',
    '<g id="ccMilkStream" opacity="0" pointer-events="none"><path d="M933 563Q962 620 1035 631" stroke="#fff" stroke-width="12" fill="none" stroke-dasharray="28 18" stroke-linecap="round"/></g>',
    '<g id="ccFlyingApple" opacity="0" pointer-events="none"><image href="' + url('apple') + '" x="-55" y="-65" width="110" height="130"/></g>',
    '<g id="ccEating" opacity="0" pointer-events="none"><path d="M762 370Q788 377 813 371" fill="none" stroke="#fff7e2" stroke-width="8" stroke-dasharray="6 12"/></g>',
    '<g id="ccFx" pointer-events="none"></g>',
    '<g id="ccDrag" pointer-events="none"></g>',
    '<rect x="0" y="766" width="1600" height="134" fill="#f9d8a7" opacity=".22" pointer-events="none"/>',
    '<g id="ccTools"></g>'
  ];
  svg.innerHTML = v.join('');
  $('rooms').before(svg);
  // Browser-native GPU rendering, positioned behind the original SVG hit targets/tool layer.
  // The existing painted cow remains the fallback for devices without WebGL2.
  const obj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  obj.setAttribute('x', '340'); obj.setAttribute('y', '40');
  obj.setAttribute('width', '980'); obj.setAttribute('height', '705');
  obj.setAttribute('pointer-events', 'none');
  const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas') as HTMLCanvasElement;
  canvas.setAttribute('style', 'display:block;width:100%;height:100%;pointer-events:none');
  obj.appendChild(canvas);
  svg.insertBefore(obj, $('ccCow'));
  try {
    cow3d = new Cow3D(canvas);
    cow3d.onLost = () => { $('ccCow').setAttribute('opacity','1'); cow3d = null; };
    $('ccCowImg').setAttribute('opacity','0');
    // Hide the duplicate 2D milk bucket and foam; these now exist in the 3D viewport.
    $('ccBucket').setAttribute('opacity','0');
    $('ccFoam').setAttribute('opacity','0');
  } catch (e) {
    console.warn('Cow Care 3D unavailable; continuing with painted cow', e);
    obj.remove();
  }
  // Gesture-based, explicitly opt-in Talking Tom-style voice echo. No recording is stored or uploaded.
  const repeat = el('g', { 'data-id': 'cc-repeat', role: 'button', 'aria-label': 'Record and repeat my voice' }, svg);
  repeat.innerHTML = '<rect x="660" y="85" width="235" height="90" rx="39" fill="#fff5df" fill-opacity=".92" stroke="#ffd593" stroke-width="7"/>' +
    '<circle cx="719" cy="130" r="28" fill="#ff8c9f"/><rect x="710" y="111" width="18" height="30" rx="9" fill="#fff"/><path d="M704 130Q719 158 734 130M719 156V164" fill="none" stroke="#fff" stroke-width="5"/>' +
    '<text id="ccRepeatLabel" x="785" y="142" font-family="Baloo 2,sans-serif" font-size="24" font-weight="800" fill="#66412c" text-anchor="middle">Echo!</text>';
  objs['cc-repeat'] = { tap: () => { void echoVoice(); } };
  cow = node('ccCow'); cowImg = $('ccCowImg') as SVGImageElement;
  fx = node('ccFx'); trail = node('ccDrag');
  tools.forEach(makeTool);
  objs['cc-cow'] = {
    tap: p => runAction(selected, p),
    hold: { start: () => runAction('pet'), end: () => {} },
    drag: {
      start: () => active(),
      move: p => { if (++moving % 14 === 0) particle('heart', p.x, p.y, actionToken); },
      end: p => runAction('pet', p)
    }
  };
  select('pet');
}
export function cowCareEnter() {
  entered = true;
  cow3d?.start(); ++actionToken; selected = 'pet'; cleaning = 0; milkLevel = 0;
  node('ccFoam').setAttribute('opacity', cow3d ? '0' : '.1');
  node('ccMilkFill').setAttribute('opacity', '0');
  node('ccMilkStream').setAttribute('opacity', '0');
  node('ccFlyingApple').setAttribute('opacity', '0');
  node('ccWater').setAttribute('opacity', '0');
  node('ccSponge').setAttribute('opacity', '0');
  cow.setAttribute('transform', 'translate(800 733)'); pose('idle'); select('pet');
  sfx('moo');
}
export function cowCareLeave() {
  entered = false;
  cow3d?.stop();
  if (recording) { recording = false; stopMic(); } ++actionToken;
  ghost?.remove(); ghost = null; dragTool = null; fx.innerHTML = ''; trail.innerHTML = '';
}

/** The child deliberately taps the microphone icon; no passive listening. */
async function echoVoice() {
  if (!active() || recording || !('MediaRecorder' in window)) return;
  recording = true;
  const label = $('ccRepeatLabel') as SVGTextElement;
  label.textContent = 'Listening';
  const stream = await getMic();
  if (!stream || !active()) { recording = false; label.textContent = 'Echo!'; return; }
  try {
    const capture = recordClip(stream, 2600);
    const sound = await capture.done;
    stopMic();
    if (active() && sound.size) {
      label.textContent = 'Moo!';
      const ctx = AC();
      if (ctx && master && state.sound) {
        const decoded = await ctx.decodeAudioData(await sound.arrayBuffer());
        const player = ctx.createBufferSource();
        player.buffer = decoded; player.playbackRate.value = 1.32;
        player.connect(master);
        player.onended = () => { label.textContent = 'Echo!'; };
        player.start();
        cow3d?.act('pet');
      } else label.textContent = 'Echo!';
    }
  } catch (err) {
    console.warn('Cow voice repeat unavailable',err);
  } finally {
    stopMic(); recording = false;
    if (!active()) label.textContent = 'Echo!';
  }
}
