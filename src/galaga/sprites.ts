import { EnemyType } from './types.js';

export interface Sprite {
  width: number;
  height: number;
  lines: string[];
  color: string;
}

export const PLAYER_SPRITE: Sprite = {
  width: 3,
  height: 2,
  lines: [
    ' ▲ ',
    '◢█◣'
  ],
  color: 'cyanBright'
};

export const ENEMY_SPRITES: Record<EnemyType, Sprite> = {
  boss: {
    width: 3,
    height: 2,
    lines: [
      '▄▀▄',
      '▀█▀'
    ],
    color: 'yellowBright'
  },
  butterfly: {
    width: 3,
    height: 2,
    lines: [
      '▀▄▀',
      '█▀█'
    ],
    color: 'redBright'
  },
  minion: {
    width: 3,
    height: 2,
    lines: [
      '▄█▄',
      '▀ ▀'
    ],
    color: 'blueBright'
  }
};
