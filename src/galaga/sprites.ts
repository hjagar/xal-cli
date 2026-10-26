import { EnemyType } from './types.js';

export interface PixelSprite {
  width: number;
  height: number;
  pixels: (string | null)[][];
}

const PALETTE: Record<string, string> = {
  W: 'whiteBright',
  Y: 'yellowBright',
  R: 'redBright',
  C: 'cyanBright',
  B: 'blueBright',
  G: 'greenBright',
  M: 'magentaBright',
  K: 'gray'
};

function parseSprite(rows: string[]): PixelSprite {
  const height = rows.length;
  const width = rows[0].length;
  const pixels = rows.map(row =>
    row.split('').map(ch => (ch === '.' || ch === ' ' ? null : PALETTE[ch] || 'white'))
  );
  return { width, height, pixels };
}

// 7x6 pixels (3 terminal rows)
export const PLAYER_PIXEL_SPRITE: PixelSprite = parseSprite([
  '...Y...',
  '..WWW..',
  '..CCC..',
  '.WWWWW.',
  'RWWWWWR',
  'R.....R'
]);

// 7x6 pixels (3 terminal rows)
export const BOSS_PIXEL_SPRITE: PixelSprite = parseSprite([
  'G.YYY.G',
  'G.YYY.G',
  '.GGGGG.',
  '.BRRRB.',
  '.GGGGG.',
  '..G.G..'
]);

// 7x5 pixels (2.5 terminal rows)
export const BUTTERFLY_PIXEL_SPRITE: PixelSprite = parseSprite([
  '..Y.Y..',
  'R.RRR.R',
  'RRWWWRR',
  '.RRRRR.',
  '..R.R..'
]);

// 7x5 pixels (2.5 terminal rows)
export const MINION_PIXEL_SPRITE: PixelSprite = parseSprite([
  '..CCC..',
  '.BBBBB.',
  'BBWWBBB',
  '.BBBBB.',
  '.B...B.'
]);

export const ENEMY_PIXEL_SPRITES: Record<EnemyType, PixelSprite> = {
  boss: BOSS_PIXEL_SPRITE,
  butterfly: BUTTERFLY_PIXEL_SPRITE,
  minion: MINION_PIXEL_SPRITE
};
