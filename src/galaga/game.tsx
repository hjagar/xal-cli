import React, { useState, useEffect, useRef, useCallback } from 'react';
import { render, useInput, Text, Box } from 'ink';
import { GameMode, Enemy, Bullet, PowerUpItem, PowerUpType, Particle } from './types.js';
import { PLAYER_SPRITE, ENEMY_SPRITES } from './sprites.js';

const FIELD_W = 48;
const FIELD_H = 24;

interface Segment {
  text: string;
  color?: string;
  bold?: boolean;
}

const createInitialEnemies = (): Enemy[] => {
  const enemies: Enemy[] = [];
  let id = 1;

  // Row 1: 4 Bosses (5x2 each)
  for (let x = 6; x <= 33; x += 9) {
    enemies.push({ id: id++, x, y: 1, type: 'boss', hp: 2 });
  }

  // Row 2: 5 Butterflies (5x2 each)
  for (let x = 5; x <= 37; x += 8) {
    enemies.push({ id: id++, x, y: 4, type: 'butterfly', hp: 1 });
  }

  // Row 3: 5 Minions (5x2 each)
  for (let x = 5; x <= 37; x += 8) {
    enemies.push({ id: id++, x, y: 7, type: 'minion', hp: 1 });
  }

  return enemies;
};

export const Galaga = () => {
  const [mode, setMode] = useState<GameMode>('demo');
  const [playerX, setPlayerX] = useState<number>(Math.floor((FIELD_W - PLAYER_SPRITE.width) / 2));
  const playerY = FIELD_H - 3;

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>(createInitialEnemies);
  const [enemyDir, setEnemyDir] = useState<number>(1);
  const [powerUps, setPowerUps] = useState<PowerUpItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [score, setScore] = useState<number>(0);

  // Power-up states
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [multishotExpiry, setMultishotExpiry] = useState<number>(0);
  const [rapidfireExpiry, setRapidfireExpiry] = useState<number>(0);

  const [activeMessage, setActiveMessage] = useState<string>('');

  const nextBulletId = useRef(1);
  const nextPowerUpId = useRef(1);
  const nextParticleId = useRef(1);
  const isInteractive = Boolean(process.stdin.isTTY);

  // Particle explosion helper
  const spawnExplosion = useCallback(
    (originX: number, originY: number, count: number, colors: string[], intensity = 1) => {
      const glyphs = ['*', '•', '·', '+', 'x', '¤', '■'];
      const newParticles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = (0.5 + Math.random() * 1.2) * intensity;
        const life = 5 + Math.floor(Math.random() * 5);

        newParticles.push({
          id: nextParticleId.current++,
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * (speed * 0.7), // aspect ratio correction for terminals
          char: glyphs[Math.floor(Math.random() * glyphs.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          life,
          maxLife: life
        });
      }

      setParticles(prev => [...prev, ...newParticles]);
    },
    []
  );

  const startNewGame = (newMode: GameMode = 'playing') => {
    setMode(newMode);
    setPlayerX(Math.floor((FIELD_W - PLAYER_SPRITE.width) / 2));
    setBullets([]);
    setEnemies(createInitialEnemies());
    setEnemyDir(1);
    setPowerUps([]);
    setParticles([]);
    setShieldActive(false);
    setMultishotExpiry(0);
    setRapidfireExpiry(0);
    setScore(0);
    setActiveMessage(newMode === 'demo' ? 'DEMO INICIADA' : '¡PARTIDA INICIADA!');
  };

  const isMultishotActive = multishotExpiry > Date.now();
  const isRapidfireActive = rapidfireExpiry > Date.now();

  const firePlayerBullets = (currPlayerX: number) => {
    const maxBullets = isRapidfireActive ? 8 : 4;
    setBullets(prev => {
      if (prev.length >= maxBullets) return prev;

      const newBullets: Bullet[] = [];
      const midX = currPlayerX + 2; // center of 5-wide ship

      if (isMultishotActive) {
        newBullets.push(
          { id: nextBulletId.current++, x: Math.max(1, midX - 2), y: playerY - 1 },
          { id: nextBulletId.current++, x: midX, y: playerY - 1 },
          { id: nextBulletId.current++, x: Math.min(FIELD_W - 2, midX + 2), y: playerY - 1 }
        );
      } else {
        newBullets.push({ id: nextBulletId.current++, x: midX, y: playerY - 1 });
      }

      return [...prev, ...newBullets];
    });
  };

  // Keyboard controls
  useInput(
    (input, key) => {
      if (input === 'q' || input === 'Q') {
        process.exit(0);
      }

      if (input === 'n' || input === 'N') {
        startNewGame('playing');
        return;
      }

      if (mode === 'demo') {
        return;
      }

      if (mode === 'gameover' || mode === 'victory') {
        return;
      }

      if (key.leftArrow) {
        setPlayerX(x => Math.max(1, x - 1));
      }
      if (key.rightArrow) {
        setPlayerX(x => Math.min(FIELD_W - PLAYER_SPRITE.width - 1, x + 1));
      }
      if (input === ' ') {
        firePlayerBullets(playerX);
      }
    },
    { isActive: isInteractive }
  );

  // Demo Mode AI Autoplay
  useEffect(() => {
    if (mode !== 'demo') return;

    const demoInterval = setInterval(() => {
      if (enemies.length === 0) {
        setEnemies(createInitialEnemies());
        return;
      }

      const targetEnemy = enemies.reduce((lowest, curr) => (curr.y > lowest.y ? curr : lowest), enemies[0]);
      const targetCenter = targetEnemy ? targetEnemy.x + 2 : Math.floor(FIELD_W / 2);
      const playerCenter = playerX + 2;

      setPlayerX(currX => {
        let nextX = currX;
        if (targetCenter > playerCenter + 1) {
          nextX = Math.min(FIELD_W - PLAYER_SPRITE.width - 1, currX + 1);
        } else if (targetCenter < playerCenter - 1) {
          nextX = Math.max(1, currX - 1);
        }

        if (Math.abs(targetCenter - (nextX + 2)) <= 2 || Math.random() < 0.25) {
          firePlayerBullets(nextX);
        }

        return nextX;
      });
    }, 140);

    return () => clearInterval(demoInterval);
  }, [mode, enemies, playerX, isMultishotActive, isRapidfireActive]);

  // Particle update loop
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 1
          }))
          .filter(
            p =>
              p.life > 0 &&
              p.x >= 0 &&
              p.x < FIELD_W &&
              p.y >= 0 &&
              p.y < FIELD_H
          )
      );
    }, 60);

    return () => clearInterval(interval);
  }, [particles.length]);

  // Bullets & Collision Loop
  useEffect(() => {
    if (mode === 'gameover' || mode === 'victory') return;

    const bulletSpeed = isRapidfireActive ? 60 : 80;
    const interval = setInterval(() => {
      setBullets(prevBullets => {
        const nextBullets = prevBullets
          .map(b => ({ ...b, y: b.y - 1 }))
          .filter(b => b.y >= 0);

        setEnemies(prevEnemies => {
          const survivingEnemies: Enemy[] = [];
          const droppedPowerUps: PowerUpItem[] = [];
          let addedScore = 0;

          for (const enemy of prevEnemies) {
            const sprite = ENEMY_SPRITES[enemy.type];
            const hitIndex = nextBullets.findIndex(
              b =>
                b.x >= enemy.x &&
                b.x < enemy.x + sprite.width &&
                b.y >= enemy.y &&
                b.y < enemy.y + sprite.height
            );

            if (hitIndex !== -1) {
              const hitBullet = nextBullets.splice(hitIndex, 1)[0];
              const remainingHp = enemy.hp - 1;

              if (remainingHp <= 0) {
                const pts = enemy.type === 'boss' ? 200 : enemy.type === 'butterfly' ? 100 : 50;
                addedScore += pts;

                // Spawn explosion particles for destroyed enemy
                spawnExplosion(
                  enemy.x + 2,
                  enemy.y + 1,
                  8,
                  enemy.type === 'boss'
                    ? ['yellowBright', 'greenBright', 'whiteBright', 'redBright']
                    : enemy.type === 'butterfly'
                    ? ['redBright', 'whiteBright', 'yellowBright']
                    : ['blueBright', 'cyanBright', 'whiteBright']
                );

                if (Math.random() < 0.4) {
                  const roll = Math.random();
                  let pType: PowerUpType = 'multishot';
                  let symbol = '[M]';
                  let color = 'greenBright';

                  if (roll < 0.35) {
                    pType = 'shield';
                    symbol = '[S]';
                    color = 'blueBright';
                  } else if (roll < 0.7) {
                    pType = 'rapidfire';
                    symbol = '[R]';
                    color = 'yellowBright';
                  }

                  droppedPowerUps.push({
                    id: nextPowerUpId.current++,
                    x: Math.min(FIELD_W - 3, Math.max(1, enemy.x + 1)),
                    y: enemy.y + 1,
                    type: pType,
                    symbol,
                    color
                  });
                }
              } else {
                // Small hit spark
                spawnExplosion(hitBullet.x, hitBullet.y, 3, ['whiteBright', 'yellowBright'], 0.5);
                survivingEnemies.push({ ...enemy, hp: remainingHp });
              }
            } else {
              survivingEnemies.push(enemy);
            }
          }

          if (addedScore > 0) {
            setScore(s => s + addedScore);
          }

          if (droppedPowerUps.length > 0) {
            setPowerUps(existing => [...existing, ...droppedPowerUps]);
          }

          if (survivingEnemies.length === 0 && prevEnemies.length > 0) {
            if (mode === 'demo') {
              setTimeout(() => setEnemies(createInitialEnemies()), 1000);
            } else {
              setMode('victory');
            }
          }

          return survivingEnemies;
        });

        return nextBullets;
      });
    }, bulletSpeed);

    return () => clearInterval(interval);
  }, [mode, isRapidfireActive, spawnExplosion]);

  // Power-up falling & collection loop
  useEffect(() => {
    if (mode === 'gameover' || mode === 'victory') return;

    const interval = setInterval(() => {
      setPowerUps(prev => {
        const nextItems: PowerUpItem[] = [];

        for (const item of prev) {
          const nextY = item.y + 1;

          const touchesPlayer =
            nextY >= playerY - 1 &&
            nextY <= playerY + PLAYER_SPRITE.height &&
            item.x + 2 >= playerX &&
            item.x <= playerX + PLAYER_SPRITE.width;

          if (touchesPlayer) {
            if (item.type === 'shield') {
              setShieldActive(true);
              setActiveMessage('¡ESCUDO ACTIVADO!');
              spawnExplosion(playerX + 2, playerY, 10, ['blueBright', 'cyanBright']);
            } else if (item.type === 'multishot') {
              setMultishotExpiry(Date.now() + 10000);
              setActiveMessage('¡DISPARO MULTIPLE (10s)!');
              spawnExplosion(playerX + 2, playerY, 10, ['greenBright', 'whiteBright']);
            } else if (item.type === 'rapidfire') {
              setRapidfireExpiry(Date.now() + 8000);
              setActiveMessage('¡FUEGO RAPIDO (8s)!');
              spawnExplosion(playerX + 2, playerY, 10, ['yellowBright', 'whiteBright']);
            }
            setScore(s => s + 50);
          } else if (nextY < FIELD_H) {
            nextItems.push({ ...item, y: nextY });
          }
        }

        return nextItems;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [mode, playerX, playerY, spawnExplosion]);

  // Enemy movement loop
  useEffect(() => {
    if (mode === 'gameover' || mode === 'victory') return;

    const interval = setInterval(() => {
      setEnemies(prevEnemies => {
        if (prevEnemies.length === 0) return prevEnemies;

        let nextDir = enemyDir;
        let shouldDrop = false;

        const minX = Math.min(...prevEnemies.map(e => e.x));
        const maxX = Math.max(...prevEnemies.map(e => e.x + ENEMY_SPRITES[e.type].width));

        if (enemyDir > 0 && maxX >= FIELD_W - 2) {
          nextDir = -1;
          shouldDrop = true;
        } else if (enemyDir < 0 && minX <= 1) {
          nextDir = 1;
          shouldDrop = true;
        }

        if (nextDir !== enemyDir) {
          setEnemyDir(nextDir);
        }

        const updated = prevEnemies.map(e => ({
          ...e,
          x: shouldDrop ? e.x : e.x + nextDir,
          y: shouldDrop ? e.y + 1 : e.y
        }));

        const breached = updated.some(
          e => e.y + ENEMY_SPRITES[e.type].height >= playerY
        );

        if (breached) {
          if (shieldActive) {
            setShieldActive(false);
            setActiveMessage('¡ESCUDO ABSORBIO EL IMPACTO!');
            spawnExplosion(playerX + 2, playerY - 1, 14, ['cyanBright', 'whiteBright']);
          } else {
            // Massive player explosion!
            spawnExplosion(playerX + 2, playerY, 24, ['yellowBright', 'redBright', 'whiteBright', 'cyanBright'], 1.8);
            if (mode === 'demo') {
              return createInitialEnemies();
            } else {
              setMode('gameover');
            }
          }
        }

        return updated;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [mode, enemyDir, playerX, playerY, shieldActive, spawnExplosion]);

  // Grid buffer construction
  interface Cell {
    char: string;
    color?: string;
    bold?: boolean;
  }

  const grid: Cell[][] = Array.from({ length: FIELD_H }, () =>
    Array.from({ length: FIELD_W }, () => ({ char: ' ' }))
  );

  // 1. Draw Enemies (Multi-color Pixel Art)
  for (const enemy of enemies) {
    const sprite = ENEMY_SPRITES[enemy.type];
    for (let r = 0; r < sprite.height; r++) {
      const line = sprite.lines[r];
      const gy = enemy.y + r;
      if (gy >= 0 && gy < FIELD_H) {
        for (let c = 0; c < sprite.width; c++) {
          const gx = enemy.x + c;
          if (gx >= 0 && gx < FIELD_W) {
            const ch = line[c];
            if (ch !== ' ') {
              const color = sprite.colors ? sprite.colors[r][c] : sprite.color;
              grid[gy][gx] = { char: ch, color, bold: true };
            }
          }
        }
      }
    }
  }

  // 2. Draw PowerUps
  for (const pu of powerUps) {
    if (pu.y >= 0 && pu.y < FIELD_H) {
      for (let i = 0; i < pu.symbol.length; i++) {
        const gx = pu.x + i;
        if (gx >= 0 && gx < FIELD_W) {
          grid[pu.y][gx] = { char: pu.symbol[i], color: pu.color, bold: true };
        }
      }
    }
  }

  // 3. Draw Bullets
  for (const b of bullets) {
    if (b.y >= 0 && b.y < FIELD_H && b.x >= 0 && b.x < FIELD_W) {
      grid[b.y][b.x] = { char: '│', color: 'yellowBright', bold: true };
    }
  }

  // 4. Draw Particles (Explosions & Sparks)
  for (const p of particles) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (py >= 0 && py < FIELD_H && px >= 0 && px < FIELD_W) {
      grid[py][px] = { char: p.char, color: p.color, bold: true };
    }
  }

  // 5. Draw Player Ship (Multi-color Pixel Art v2)
  if (mode !== 'gameover' || particles.length > 0) {
    for (let r = 0; r < PLAYER_SPRITE.height; r++) {
      const line = PLAYER_SPRITE.lines[r];
      const gy = playerY + r;
      if (gy >= 0 && gy < FIELD_H) {
        for (let c = 0; c < PLAYER_SPRITE.width; c++) {
          const gx = playerX + c;
          if (gx >= 0 && gx < FIELD_W) {
            const ch = line[c];
            if (ch !== ' ') {
              const color = PLAYER_SPRITE.colors ? PLAYER_SPRITE.colors[r][c] : PLAYER_SPRITE.color;
              grid[gy][gx] = { char: ch, color, bold: true };
            }
          }
        }
      }
    }
  }

  // 6. Draw Shield Barrier if active
  if (shieldActive) {
    const shieldY = playerY - 1;
    if (shieldY >= 0) {
      for (let c = -1; c <= PLAYER_SPRITE.width; c++) {
        const gx = playerX + c;
        if (gx >= 0 && gx < FIELD_W) {
          grid[shieldY][gx] = { char: '═', color: 'cyanBright', bold: true };
        }
      }
    }
  }

  // Convert grid to row segments
  const renderRow = (rowCells: Cell[], rowIndex: number) => {
    const segments: Segment[] = [];
    let currentText = '';
    let currentColor: string | undefined = undefined;
    let currentBold: boolean | undefined = undefined;

    for (const cell of rowCells) {
      if (cell.color === currentColor && cell.bold === currentBold) {
        currentText += cell.char;
      } else {
        if (currentText.length > 0) {
          segments.push({ text: currentText, color: currentColor, bold: currentBold });
        }
        currentText = cell.char;
        currentColor = cell.color;
        currentBold = cell.bold;
      }
    }
    if (currentText.length > 0) {
      segments.push({ text: currentText, color: currentColor, bold: currentBold });
    }

    return (
      <Box key={rowIndex}>
        {segments.map((seg, sIdx) => (
          <Text key={sIdx} color={seg.color} bold={seg.bold}>
            {seg.text}
          </Text>
        ))}
      </Box>
    );
  };

  const msRemaining = Math.max(0, Math.ceil((multishotExpiry - Date.now()) / 1000));
  const rfRemaining = Math.max(0, Math.ceil((rapidfireExpiry - Date.now()) / 1000));

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header HUD */}
      <Box width={FIELD_W + 2} justifyContent="space-between">
        <Box>
          <Text bold color={mode === 'demo' ? 'magentaBright' : 'cyanBright'}>
            {mode === 'demo' ? '★ MODO DEMO ★' : 'GALAGA CLI'}
          </Text>
        </Box>
        <Box>
          <Text bold color="yellow">
            SCORE: {String(score).padStart(6, '0')}
          </Text>
        </Box>
      </Box>

      {/* Power-up indicators */}
      <Box width={FIELD_W + 2} justifyContent="flex-start" gap={2}>
        <Text color={shieldActive ? 'blueBright' : 'gray'}>
          [S] ESCUDO: {shieldActive ? 'ACTIVO' : 'OFF'}
        </Text>
        <Text color={msRemaining > 0 ? 'greenBright' : 'gray'}>
          [M] MULTI: {msRemaining > 0 ? `${msRemaining}s` : 'OFF'}
        </Text>
        <Text color={rfRemaining > 0 ? 'yellowBright' : 'gray'}>
          [R] RÁPIDO: {rfRemaining > 0 ? `${rfRemaining}s` : 'OFF'}
        </Text>
      </Box>

      {/* Main Game Screen */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={
          mode === 'gameover'
            ? 'red'
            : mode === 'victory'
            ? 'green'
            : mode === 'demo'
            ? 'magenta'
            : 'blue'
        }
        width={FIELD_W + 2}
      >
        {grid.map((rowCells, rIdx) => renderRow(rowCells, rIdx))}
      </Box>

      {/* Bottom Controls / Notifications */}
      <Box marginTop={1} flexDirection="column" width={FIELD_W + 2}>
        {activeMessage !== '' && (
          <Text bold color="cyan">
            {activeMessage}
          </Text>
        )}

        {mode === 'demo' && (
          <Box flexDirection="column">
            <Text bold color="magentaBright">
              MODO DEMO AUTÓNOMO — Presioná [N] o [n] para JUGAR
            </Text>
            <Text color="gray">[Q]: Salir</Text>
          </Box>
        )}

        {mode === 'playing' && (
          <Text color="gray">
            ← / →: Mover | Espacio: Disparar | [N]: Reiniciar partida | [Q]: Salir
          </Text>
        )}

        {mode === 'gameover' && (
          <Box flexDirection="column">
            <Text bold color="red">
              ¡GAME OVER! Tu puntaje final fue {score}.
            </Text>
            <Text bold color="yellow">
              Presioná [N] para iniciar una nueva partida | [Q] para salir.
            </Text>
          </Box>
        )}

        {mode === 'victory' && (
          <Box flexDirection="column">
            <Text bold color="green">
              ¡VICTORIA! ¡Destruiste a todas las fuerzas invasoras! Puntaje: {score}.
            </Text>
            <Text bold color="yellow">
              Presioná [N] para iniciar otra partida | [Q] para salir.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

render(<Galaga />);
