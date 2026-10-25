export type GameMode = 'demo' | 'playing' | 'gameover' | 'victory';

export type PowerUpType = 'multishot' | 'shield' | 'rapidfire';

export type EnemyType = 'boss' | 'butterfly' | 'minion';

export interface Entity {
  x: number;
  y: number;
}

export interface Enemy extends Entity {
  id: number;
  type: EnemyType;
  hp: number;
}

export interface Bullet extends Entity {
  id: number;
  isEnemy?: boolean;
}

export interface PowerUpItem extends Entity {
  id: number;
  type: PowerUpType;
  symbol: string;
  color: string;
}

export interface PlayerState extends Entity {
  shield: boolean;
  multishotExpiry: number; // timestamp in ms or 0
  rapidfireExpiry: number; // timestamp in ms or 0
}
