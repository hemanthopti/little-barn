import { $, easeOut, easeOutBack } from '../core/util';
import { tween } from '../core/engine';
import { objs } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import type { Kind } from '../art/animals';
import { Animal, registerFeeders } from './animal';
import { hearts, sparkleAt } from './fx';

type Base = { x: number; yShow: number; yHide: number; s: number };
const OPEN_MS = 3600;

/** A barn opening: tap the shutters and the next animal in its pool pops out, then hides again. */
function makeDoor(id: string, panels: [string, number][], layer: Element, pool: Kind[], base: Base) {
  let st: 'closed' | 'opening' | 'open' | 'closing' = 'closed';
  let i = 0, animal: Animal | null = null, timer = 0;

  const setPanels = (k: number) => panels.forEach(([elId, pv]) =>
    $(elId).setAttribute('transform', `translate(${pv},0) scale(${k},1) translate(${-pv},0)`));
  const resetTimer = () => { clearTimeout(timer); timer = window.setTimeout(close, OPEN_MS); };

  function open() {
    st = 'opening'; sfx('creak');
    const a = new Animal(pool[i++ % pool.length], id + 'A', base.x, base.yHide, base.s, layer);
    animal = a;
    a.tap = () => { if (st !== 'open') return; a.bounce(); a.say(); const h = a.head(); hearts(h.x, h.y - 20, 3); resetTimer(); };
    tween(350, t => setPanels(1 - .86 * easeOut(t)));
    tween(600, t => { a.y = base.yHide + (base.yShow - base.yHide) * easeOutBack(t); a.place(); }, () => {
      st = 'open'; a.say(); const h = a.head(); sparkleAt(h.x, h.y, 6, true); resetTimer();
    });
  }
  function close() {
    if (st !== 'open' || !animal) return;
    st = 'closing'; const a = animal;
    tween(400, t => { a.y = base.yShow + (base.yHide - base.yShow) * t * t; a.place(); }, () => {
      a.remove(); animal = null;
      tween(300, t => setPanels(.14 + .86 * t), () => { st = 'closed'; setPanels(1); sfx('thud'); });
    });
  }
  objs[id] = { tap() { if (st === 'closed') open(); else if (st === 'open') animal?.tap(); } };
  return { animalNow: () => (st === 'open' ? animal : null) };
}

export function initBarn() {
  const doors = [
    makeDoor('door', [['doorL', 272], ['doorR', 428]], $('doorIn'), ['cow', 'sheep', 'cow', 'pig', 'sheep'], { x: 350, yShow: 632, yHide: 800, s: .8 }),
    makeDoor('loft', [['loftL', 307], ['loftR', 393]], $('loftIn'), ['hen', 'kitten', 'hen', 'duck'], { x: 350, yShow: 320, yHide: 420, s: .5 })
  ];
  registerFeeders(() => doors.map(d => d.animalNow()));

  objs.barn = {
    tap() {
      sfx('boing');
      const b = $('barn');
      tween(500, t => {
        const w = Math.sin(t * Math.PI * 3) * (1 - t) * .05;
        b.setAttribute('transform', `translate(350,630) scale(${1 + w},${1 - w}) translate(-350,-630)`);
      }, () => b.removeAttribute('transform'));
      setTimeout(() => speak('barn'), 250);
    }
  };
}
