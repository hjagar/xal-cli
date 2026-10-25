import { EnemyType } from './types.js';

export interface Sprite {
  width: number;
  height: number;
  lines: string[];
  color: string;
  colors?: string[][];
}

export const PLAYER_SPRITE: Sprite = {
  width: 5,
  height: 2,
  lines: [
    ' ◢█◣ ',
    '▟▀█▀▙'
  ],
  color: 'cyanBright',
  colors: [
    ['gray', 'whiteBright', 'yellowBright', 'whiteBright', 'gray'],
    ['redBright', 'whiteBright', 'cyanBright', 'whiteBright', 'redBright']
  ]
};

export const ENEMY_SPRITES: Record<EnemyType, Sprite> = {
  boss: {
    width: 5,
    height: 2,
    lines: [
      '▞▀█▀▚',
      '▚▄█▄▞'
    ],
    color: 'yellowBright',
    colors: [
      ['yellowBright', 'greenBright', 'yellowBright', 'greenBright', 'yellowBright'],
      ['greenBright', 'redBright', 'yellowBright', 'redBright', 'greenBright']
    ]
  },
  butterfly: {
    width: 5,
    height: 2,
    lines: [
      '▜▀█▀▛',
      '▟▄█▄▙'
    ],
    color: 'redBright',
    colors: [
      ['redBright', 'whiteBright', 'redBright', 'whiteBright', 'redBright'],
      ['whiteBright', 'redBright', 'yellowBright', 'redBright', 'whiteBright']
    ]
  },
  minion: {
    width: 5,
    height: 2,
    lines: [
      ' ▄█▄ ',
      '▜▀█▀▛'
    ],
    color: 'blueBright',
    colors: [
      ['gray', 'blueBright', 'cyanBright', 'blueBright', 'gray'],
      ['blueBright', 'cyanBright', 'blueBright', 'cyanBright', 'blueBright']
    ]
  }
};
