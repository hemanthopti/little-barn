import { S } from '../core/util';

export const APPLE = `<circle r="18" fill="#E8483B" ${S}/><path d="M0,-18 q2,-9 6,-12" fill="none" stroke="#5A3A22" stroke-width="4" stroke-linecap="round"/><ellipse cx="11" cy="-22" rx="9" ry="4.5" fill="#4FAF4A" stroke="#3A2E2A" stroke-width="2" transform="rotate(-25 11 -22)"/><circle cx="-6" cy="-6" r="5" fill="#fff" opacity=".55"/>`;

export const HEART = `<path d="M0,8 C0,-2 -14,-6 -14,4 C-14,13 0,19 0,24 C0,19 14,13 14,4 C14,-6 0,-2 0,8Z" fill="#FF5C8A" stroke="#fff" stroke-width="2"/>`;

export const CLOUD = `<g class="bob"><ellipse cx="0" cy="34" rx="112" ry="22" fill="#D7EEFF"/>
  <circle cx="-70" cy="10" r="40" fill="#fff"/><circle cx="-20" cy="-18" r="56" fill="#fff"/><circle cx="42" cy="-6" r="48" fill="#fff"/><circle cx="84" cy="16" r="34" fill="#fff"/>
  <ellipse cx="0" cy="24" rx="108" ry="22" fill="#fff"/>
  <path d="M-30,4 q8,8 16,0 M14,4 q8,8 16,0" fill="none" stroke="#3A2E2A" stroke-width="4" stroke-linecap="round"/>
  <path d="M-8,18 q8,7 16,0" fill="none" stroke="#3A2E2A" stroke-width="4" stroke-linecap="round"/>
  <circle cx="-42" cy="16" r="7" fill="#FF9FB2" opacity=".7"/><circle cx="46" cy="16" r="7" fill="#FF9FB2" opacity=".7"/></g>`;

export const BALLOON = `<circle cx="0" cy="-70" r="95" fill="transparent"/>
  <path d="M0,-160 C64,-160 80,-100 64,-62 C52,-34 20,-16 13,-5 L-13,-5 C-20,-16 -52,-34 -64,-62 C-80,-100 -64,-160 0,-160Z" fill="#FF6B6B" ${S}/>
  <path d="M0,-160 C24,-160 30,-100 24,-62 C20,-34 9,-16 7,-5 L-7,-5 C-9,-16 -20,-34 -24,-62 C-30,-100 -24,-160 0,-160Z" fill="#FFD23F" ${S}/>
  <path d="M-12,-5 L-16,26 M12,-5 L16,26" stroke="#3A2E2A" stroke-width="3"/>
  <rect x="-22" y="24" width="44" height="30" rx="5" fill="#C68B59" ${S}/><path d="M-22,34 h44" stroke="#8A5A3B" stroke-width="3"/>`;

export function flowerArt(petal: string, center: string) {
  const petals = [0, 1, 2, 3, 4].map(i => {
    const a = i * Math.PI * 2 / 5 - Math.PI / 2;
    return `<circle cx="${(Math.cos(a) * 13).toFixed(1)}" cy="${(-42 + Math.sin(a) * 13).toFixed(1)}" r="11" fill="${petal}" stroke="#3A2E2A" stroke-width="2.5"/>`;
  }).join('');
  return `<circle cy="-34" r="34" fill="transparent"/><path d="M0,0 V-34" stroke="#3E9E3A" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="9" cy="-16" rx="10" ry="5" fill="#4FAF4A" stroke="#2F7A2B" stroke-width="2" transform="rotate(-30 9 -16)"/>${petals}
    <circle cy="-42" r="8" fill="${center}" stroke="#3A2E2A" stroke-width="2.5"/>`;
}
