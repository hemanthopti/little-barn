import { S } from '../core/util';

/**
 * Characters as SVG strings. Origin (0,0) is between the feet; characters face the viewer
 * and stand about 170 units tall at scale 1. The full app swaps these for Rive/Spine rigs.
 */
const eye = (x: number, y: number, r = 10) =>
  `<g class="eye"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${S}/><circle cx="${x + 1}" cy="${y + 2}" r="${r * .6}" fill="#3A2E2A"/><circle cx="${x + 3}" cy="${y - 2}" r="${r * .22}" fill="#fff"/></g>`;
const cheeks = (x: number, y: number) =>
  `<circle cx="${-x}" cy="${y}" r="8" fill="#FF9FB2" opacity=".75"/><circle cx="${x}" cy="${y}" r="8" fill="#FF9FB2" opacity=".75"/>`;
const smile = (y: number, w = 10, c = '#3A2E2A') =>
  `<path d="M${-w},${y} q${w},${w * .8} ${w * 2},0" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
const fluff = (arr: number[][]) =>
  arr.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${S}/>`).join('') +
  arr.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 2.5}" fill="#fff"/>`).join('');

export type Kind = 'cow' | 'pig' | 'sheep' | 'hen' | 'duck' | 'puppy' | 'kitten' | 'frog' | 'parrot';

export const ART: Record<Kind, () => string> = {
  cow: () => `
    <rect x="-42" y="-32" width="18" height="32" rx="6" fill="#fff" ${S}/><rect x="24" y="-32" width="18" height="32" rx="6" fill="#fff" ${S}/>
    <rect x="-42" y="-10" width="18" height="10" rx="3" fill="#5A4A48"/><rect x="24" y="-10" width="18" height="10" rx="3" fill="#5A4A48"/>
    <path d="M60,-62 q22,8 14,38" fill="none" ${S}/><circle cx="74" cy="-22" r="7" fill="#5A4A48"/>
    <ellipse cx="0" cy="-52" rx="64" ry="40" fill="#fff" ${S}/>
    <ellipse cx="-26" cy="-60" rx="17" ry="12" fill="#3A2E2A"/><ellipse cx="30" cy="-40" rx="12" ry="9" fill="#3A2E2A"/>
    <path d="M-30,-152 q-12,-22 2,-28 q6,12 10,22z" fill="#F5E6B8" ${S}/><path d="M30,-152 q12,-22 -2,-28 q-6,12 -10,22z" fill="#F5E6B8" ${S}/>
    <ellipse cx="-52" cy="-132" rx="22" ry="11" fill="#fff" ${S} transform="rotate(-20 -52 -132)"/>
    <ellipse cx="52" cy="-132" rx="22" ry="11" fill="#fff" ${S} transform="rotate(20 52 -132)"/>
    <ellipse cx="0" cy="-120" rx="48" ry="45" fill="#fff" ${S}/>
    <ellipse cx="22" cy="-142" rx="14" ry="11" fill="#3A2E2A"/>
    ${eye(-17, -128)}${eye(17, -128)}
    <ellipse cx="0" cy="-93" rx="35" ry="21" fill="#F7B8C4" ${S}/>
    <ellipse cx="-11" cy="-96" rx="4" ry="6" fill="#B5576E"/><ellipse cx="11" cy="-96" rx="4" ry="6" fill="#B5576E"/>
    ${smile(-84, 9, '#B5576E')}${cheeks(36, -110)}`,
  pig: () => `
    <rect x="-40" y="-30" width="18" height="30" rx="6" fill="#F7A8B8" ${S}/><rect x="22" y="-30" width="18" height="30" rx="6" fill="#F7A8B8" ${S}/>
    <path d="M58,-56 c16,-8 18,10 8,12 c-9,2 -7,-14 7,-16" fill="none" ${S}/>
    <ellipse cx="0" cy="-50" rx="62" ry="40" fill="#F7A8B8" ${S}/>
    <path d="M-42,-148 l-10,-32 l32,16z" fill="#F48FA6" ${S}/><path d="M42,-148 l10,-32 l-32,16z" fill="#F48FA6" ${S}/>
    <ellipse cx="0" cy="-118" rx="50" ry="45" fill="#F9B9C6" ${S}/>
    ${eye(-19, -132, 9)}${eye(19, -132, 9)}
    <ellipse cx="0" cy="-106" rx="23" ry="16" fill="#F48FA6" ${S}/>
    <ellipse cx="-7" cy="-106" rx="3.5" ry="6" fill="#B5576E"/><ellipse cx="7" cy="-106" rx="3.5" ry="6" fill="#B5576E"/>
    ${smile(-85, 11)}${cheeks(34, -102)}`,
  sheep: () => `
    <rect x="-34" y="-26" width="14" height="26" rx="5" fill="#5A4A48"/><rect x="20" y="-26" width="14" height="26" rx="5" fill="#5A4A48"/>
    ${fluff([[-45, -50, 26], [-20, -72, 28], [12, -74, 28], [42, -58, 26], [46, -34, 22], [-42, -30, 22], [0, -36, 34]])}
    <ellipse cx="-40" cy="-118" rx="18" ry="9" fill="#5A4A48" transform="rotate(-25 -40 -118)"/>
    <ellipse cx="40" cy="-118" rx="18" ry="9" fill="#5A4A48" transform="rotate(25 40 -118)"/>
    <ellipse cx="0" cy="-110" rx="34" ry="40" fill="#6A5A58" ${S}/>
    ${fluff([[-14, -148, 14], [0, -154, 15], [14, -148, 14]])}${eye(-13, -114, 9)}${eye(13, -114, 9)}${smile(-90, 7, '#fff')}${cheeks(22, -98)}`,
  hen: () => `
    <path d="M-12,0 v-24 M12,0 v-24 M-20,0 h16 M4,0 h16" stroke="#F59E2A" stroke-width="5" stroke-linecap="round"/>
    <circle cx="46" cy="-82" r="18" fill="#fff" ${S}/><circle cx="54" cy="-62" r="16" fill="#fff" ${S}/>
    <circle cx="-9" cy="-118" r="10" fill="#E8483B" ${S}/><circle cx="4" cy="-125" r="11" fill="#E8483B" ${S}/><circle cx="16" cy="-117" r="9" fill="#E8483B" ${S}/>
    <ellipse cx="0" cy="-62" rx="50" ry="58" fill="#fff" ${S}/>
    <ellipse cx="-20" cy="-48" rx="22" ry="14" fill="#F1F1F1" ${S} transform="rotate(-25 -20 -48)"/>
    ${eye(-15, -84, 8)}${eye(15, -84, 8)}
    <path d="M-9,-72 l9,11 l9,-11z" fill="#F59E2A" ${S}/><ellipse cx="0" cy="-55" rx="5" ry="7" fill="#E8483B"/>
    ${cheeks(28, -70)}`,
  duck: () => `
    <path d="M44,-50 l28,-16 l-6,28z" fill="#FFD84D" ${S}/>
    <ellipse cx="0" cy="-35" rx="56" ry="32" fill="#FFD84D" ${S}/>
    <ellipse cx="12" cy="-38" rx="25" ry="14" fill="#F7C531" ${S}/>
    <circle cx="-18" cy="-92" r="35" fill="#FFD84D" ${S}/>
    ${eye(-30, -100, 8)}${eye(-6, -100, 8)}
    <ellipse cx="-22" cy="-75" rx="23" ry="9" fill="#F59E2A" ${S}/>
    <circle cx="-44" cy="-84" r="7" fill="#FF9FB2" opacity=".75"/><circle cx="8" cy="-84" r="7" fill="#FF9FB2" opacity=".75"/>`,
  puppy: () => `
    <path d="M52,-62 q24,-18 20,-40" fill="none" stroke="#3A2E2A" stroke-width="18" stroke-linecap="round"/>
    <path d="M52,-62 q24,-18 20,-40" fill="none" stroke="#C68B59" stroke-width="10" stroke-linecap="round"/>
    <rect x="-38" y="-30" width="18" height="30" rx="6" fill="#C68B59" ${S}/><rect x="20" y="-30" width="18" height="30" rx="6" fill="#C68B59" ${S}/>
    <ellipse cx="0" cy="-50" rx="58" ry="38" fill="#C68B59" ${S}/>
    <ellipse cx="0" cy="-42" rx="28" ry="20" fill="#E8C39E"/>
    <ellipse cx="0" cy="-118" rx="47" ry="43" fill="#D9A273" ${S}/>
    <ellipse cx="-46" cy="-110" rx="15" ry="31" fill="#8A5A3B" ${S} transform="rotate(18 -46 -110)"/>
    <ellipse cx="46" cy="-110" rx="15" ry="31" fill="#8A5A3B" ${S} transform="rotate(-18 46 -110)"/>
    <ellipse cx="18" cy="-128" rx="15" ry="13" fill="#8A5A3B"/>
    ${eye(-16, -127, 9)}${eye(18, -127, 9)}
    <ellipse cx="0" cy="-100" rx="23" ry="16" fill="#F2D5B5"/>
    <ellipse cx="0" cy="-108" rx="9" ry="6" fill="#3A2E2A"/>
    <ellipse cx="0" cy="-88" rx="6" ry="8" fill="#FF7B93" ${S}/>${smile(-97, 8)}${cheeks(32, -104)}`,
  kitten: () => `
    <path d="M48,-40 q42,-8 30,-60" fill="none" stroke="#3A2E2A" stroke-width="18" stroke-linecap="round"/>
    <path d="M48,-40 q42,-8 30,-60" fill="none" stroke="#F4A259" stroke-width="10" stroke-linecap="round"/>
    <rect x="-32" y="-28" width="16" height="28" rx="6" fill="#F4A259" ${S}/><rect x="16" y="-28" width="16" height="28" rx="6" fill="#F4A259" ${S}/>
    <ellipse cx="0" cy="-46" rx="52" ry="36" fill="#F4A259" ${S}/>
    <path d="M-42,-134 L-38,-176 L-10,-152Z" fill="#F4A259" ${S}/><path d="M42,-134 L38,-176 L10,-152Z" fill="#F4A259" ${S}/>
    <path d="M-36,-142 L-34,-164 L-20,-152Z" fill="#FF9FB2"/><path d="M36,-142 L34,-164 L20,-152Z" fill="#FF9FB2"/>
    <ellipse cx="0" cy="-118" rx="47" ry="41" fill="#F4A259" ${S}/>
    <path d="M-8,-158 v12 M0,-159 v14 M8,-158 v12" stroke="#D9822B" stroke-width="4" stroke-linecap="round"/>
    ${eye(-17, -122, 10)}${eye(17, -122, 10)}
    <path d="M-5,-104 l5,5 l5,-5z" fill="#FF8FA3" ${S}/>
    <path d="M-9,-96 q4.5,6 9,0 q4.5,6 9,0" fill="none" stroke="#3A2E2A" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M-24,-104 l-28,-5 M-24,-97 l-28,4 M24,-104 l28,-5 M24,-97 l28,4" stroke="#3A2E2A" stroke-width="2.5" stroke-linecap="round"/>
    ${cheeks(32, -104)}`,
  frog: () => `
    <ellipse cx="-46" cy="-10" rx="24" ry="11" fill="#5BAE3A" ${S}/><ellipse cx="46" cy="-10" rx="24" ry="11" fill="#5BAE3A" ${S}/>
    <ellipse cx="0" cy="-36" rx="55" ry="34" fill="#6CC24A" ${S}/>
    <circle cx="-26" cy="-104" r="20" fill="#6CC24A" ${S}/><circle cx="26" cy="-104" r="20" fill="#6CC24A" ${S}/>
    <ellipse cx="0" cy="-76" rx="52" ry="34" fill="#6CC24A" ${S}/>
    <rect x="-46" y="-100" width="92" height="12" fill="#6CC24A"/>
    ${eye(-26, -106, 11)}${eye(26, -106, 11)}
    <path d="M-28,-70 q28,22 56,0" fill="none" stroke="#3A2E2A" stroke-width="4" stroke-linecap="round"/>${cheeks(38, -72)}`,
  parrot: () => `
    <path d="M-10,-22 L-16,34 L8,34 L10,-22Z" fill="#2F7FD8" ${S}/>
    <ellipse cx="0" cy="-52" rx="35" ry="47" fill="#3FBF6F" ${S}/>
    <ellipse cx="14" cy="-46" rx="18" ry="32" fill="#2F9E58" ${S}/>
    <circle cx="0" cy="-106" r="33" fill="#E94B3C" ${S}/>
    <circle cx="-10" cy="-112" r="12" fill="#fff" ${S}/>${eye(-10, -112, 9)}
    <path d="M12,-114 q30,4 16,30 q-8,-8 -18,-12z" fill="#FFD23F" ${S}/>
    <circle cx="-22" cy="-94" r="7" fill="#FF9FB2" opacity=".75"/>
    <path d="M-12,0 q-4,8 4,8 M12,0 q-4,8 4,8" fill="none" stroke="#F59E2A" stroke-width="5" stroke-linecap="round"/>`
};

/** Head centre per character (for hearts, feeding and the mic ring). */
export const HEAD: Record<Kind, [number, number]> = {
  cow: [0, -115], pig: [0, -115], sheep: [0, -110], hen: [0, -85], duck: [-18, -92],
  puppy: [0, -115], kitten: [0, -118], frog: [0, -80], parrot: [0, -106]
};
/** Which sound each character makes. */
export const VOICE: Record<Kind, string> = {
  cow: 'moo', pig: 'oink', sheep: 'baa', hen: 'cluck', duck: 'quack',
  puppy: 'woof', kitten: 'meow', frog: 'ribbit', parrot: 'squawk'
};
