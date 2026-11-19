/**
 * Original pixel art, drawn as strings. Each character is one pixel and maps to a colour in a palette.
 * `.` is transparent. Layers of the same size are stacked by `PixelSprite`.
 */
export type Art = readonly string[];

export const STONE: Art = [
  '....oooooooo....',
  '..ooohhhhsssoo..',
  '.oohhssssssssdo.',
  '.ohhsssssssssdo.',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'ohhsssssssssssdo',
  'oddddddddddddddo',
  'oooooooooooooooo',
];

export const CRACKS: Art = [
  '................',
  '.......c........',
  '......cc........',
  '.......cc.......',
  '........c.......',
  '.......c........',
  '......cc.c......',
  '.....c...cc.....',
  '......c...c.....',
  '................',
  '................',
  '................',
  '................',
  '..........c.....',
  '.........cc.....',
  '..........cc....',
  '...........c....',
  '................',
  '................',
  '................',
];

export const VINES: Art = [
  '................',
  '................',
  '.g.............g',
  '.gg...........gg',
  '.g.g..........g.',
  '..g...........g.',
  '.gg..........gg.',
  '.g............g.',
  '..g...........g.',
  '.gg..........gg.',
  '.g...........g..',
  '..g..........g..',
  '.gg.........gg..',
  '.g..........g...',
  '.gg........ggg..',
  'gg.g......g.gg..',
  'g..gg....gg..g..',
  'gGggGgg.gGggGgg.',
  'gGgpGgGgGpGgGyg.',
  'GgGGgGGGgGGgGGgG',
];

export const ENGRAVING: Art = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......ee.......',
  '.....eeeeee.....',
  '.......ee.......',
  '.......ee.......',
  ...Array<string>(11).fill('................'),
];

export const HAND: Art = [
  '..z.z.z.',
  '..z.z.zz',
  '.zzzzzzz',
  '.zzzzzzz',
  '..zzzzz.',
  '..zzzzz.',
  '...zzz..',
  '...zzz..',
  '...zdz..',
  '..dddd..',
];

export const SPARK: Art = ['..y..', '..y..', 'yyyyy', '..y..', '..y..'];

export const COIN: Art = [
  '..oooo..',
  '.oyyyyo.',
  'oyyhhyyo',
  'oyhyyyyo',
  'oyhyyyyo',
  'oyyyyyyo',
  '.oyyyyo.',
  '..oooo..',
];

export const SKULL: Art = [
  '.wwwwww.',
  'wwwwwwww',
  'woowwoow',
  'woowwoow',
  'wwwoowww',
  '.wwwwww.',
  '.wowowo.',
  '.wwwwww.',
];

export const FLAME: Art = ['...f...', '..ff...', '..fff.f', '.ffyfff', '.ffyyff', 'ffyyyff', 'ffyyyff', '.fffff.'];

export const SCROLL: Art = [
  '.ppppppp.',
  'pyyyyyyyp',
  'pyooooyyp',
  '.pyyyyyp.',
  '.pyooyyp.',
  '.pyyyyyp.',
  'pyooooyyp',
  '.ppppppp.',
];

export const ENVELOPE: Art = [
  'oooooooooo',
  'owowwwwowo',
  'owwowwowwo',
  'owwwooowwo',
  'owwwwwwwwo',
  'owwwwwwwwo',
  'oooooooooo',
];

export const CRYSTAL_BALL: Art = [
  '...oooo...',
  '..ovvvvo..',
  '.ovhhvvvo.',
  'ovhvvvvvvo',
  'ovhvvvvvvo',
  'ovvvvvvvvo',
  'ovvvvvvvvo',
  '.ovvvvvvo.',
  '..oooooo..',
  '.bbbbbbbb.',
];

export const FLOWER: Art = ['..ppp..', '.ppypp.', '..ppp..', '...g...', '..gg...', '...g...', '..ggg..'];

export const LANTERN: Art = [
  '..ooo..',
  '.o...o.',
  'ooooooo',
  'oyyyyyo',
  'oyyhyyo',
  'oyyhyyo',
  'oyyyyyo',
  'ooooooo',
];

export const PUMPKIN: Art = [
  '....g....',
  '.oooggooo',
  'ooooooooo',
  'ooeooeooo',
  'oooeeoooo',
  'oeoeoeooo',
  'ooooooooo',
  '.ooooooo.',
];

export const RAVEN: Art = [
  '..k......',
  '.kwkkyy..',
  'kkkkkkkk.',
  '.kkkkkkkk',
  '..kkkkk..',
  '...y.y...',
  '...y.y...',
];

export const PALETTE = {
  o: '#120F23',
  w: '#F2ECFF',
  y: '#FFD866',
  h: '#F2ECFF',
  g: '#A8FF60',
  G: '#5FB43A',
  p: '#FF8FB8',
  f: '#FFB14A',
  v: '#8B5CF6',
  b: '#2C2142',
  k: '#1B1633',
  e: '#6B5F8C',
  z: '#A8FF60',
  d: '#3C7F2A',
  c: '#FFB14A',
  s: '#B8A9D9',
} as const;
