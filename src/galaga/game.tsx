import React, { useState, useEffect, useRef, useCallback } from 'react';
import { render, useInput, Text, Box } from 'ink';
import { GameMode, Enemy, Bullet, PowerUpItem, PowerUpType, Particle } from './types.js';
import { PLAYER_PIXEL_SPRITE, ENEMY_PIXEL_SPRITES } from './sprites.js';

const CANVAS_W = 50;
const CANVAS_H = 56; // Expanded vertical height (28 terminal lines)
const TERM_ROWS = CANVAS_H / 2;

interface Segment {
  text: string;
  color?: string;
  backgroundColor?: string;
}

const createInitialEnemies = (): Enemy[] => {
  const enemies: Enemy[] = [];
  let id = 1;

  // Row 1: 4 Bosses (7x6 pixels each)
  for (let x = 5; x <= 38; x += 11) {
    enemies.push({ id: id++, x, y: 3, type: 'boss', hp: 2 });
  }

  // Row 2: 4 Butterflies (7x5 pixels each)
  for (let x = 5; x <= 38; x += 11) {
    enemies.push({ id: id++, x, y: 11, type: 'butterfly', hp: 1 });
  }

  // Row 3: 5 Minions (7x5 pixels each)
  for (let x = 3; x <= 39; x += 9) {
    enemies.push({ id: id++, x, y: 18, type: 'minion', hp: 1 });
  }

  return enemies;
};

export const Galaga = () => {
  const [mode, setMode] = useState<GameMode>('demo');
  const [playerX, setPlayerX] = useState<number>(Math.floor((CANVAS_W - PLAYER_PIXEL_SPRITE.width) / 2));
  const playerY = CANVAS_H - 7;

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

  // Particle explosion helper in 1:1 half-block pixel space
  const spawnExplosion = useCallback(
    (originX: number, originY: number, count: number, colors: string[], intensity = 1) => {
      const newParticles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = (0.7 + Math.random() * 1.5) * intensity;
        const life = 8 + Math.floor(Math.random() * 8);

        newParticles.push({
          id: nextParticleId.current++,
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
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
    setPlayerX(Math.floor((CANVAS_W - PLAYER_PIXEL_SPRITE.width) / 2));
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
    const maxBullets = isRapidfireActive ? 10 : 5;
    setBullets(prev => {
      if (prev.length >= maxBullets) return prev;

      const newBullets: Bullet[] = [];
      const midX = currPlayerX + 3;

      if (isMultishotActive) {
        newBullets.push(
          { id: nextBulletId.current++, x: Math.max(1, midX - 3), y: playerY - 1 },
          { id: nextBulletId.current++, x: midX, y: playerY - 1 },
          { id: nextBulletId.current++, x: Math.min(CANVAS_W - 2, midX + 3), y: playerY - 1 }
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
        setPlayerX(x => Math.max(1, x - 2));
      }
      if (key.rightArrow) {
        setPlayerX(x => Math.min(CANVAS_W - PLAYER_PIXEL_SPRITE.width - 1, x + 2));
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
      const targetCenter = targetEnemy ? targetEnemy.x + 3 : Math.floor(CANVAS_W / 2);
      const playerCenter = playerX + 3;

      setPlayerX(currX => {
        let nextX = currX;
        if (targetCenter > playerCenter + 1) {
          nextX = Math.min(CANVAS_W - PLAYER_PIXEL_SPRITE.width - 1, currX + 2);
        } else if (targetCenter < playerCenter - 1) {
          nextX = Math.max(1, currX - 2);
        }

        if (Math.abs(targetCenter - (nextX + 3)) <= 3 || Math.random() < 0.25) {
          firePlayerBullets(nextX);
        }

        return nextX;
      });
    }, 120);

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
              p.x < CANVAS_W &&
              p.y >= 0 &&
              p.y < CANVAS_H
          )
      );
    }, 45);

    return () => clearInterval(interval);
  }, [particles.length]);

  // Bullets & Collision Loop (faster bullet velocity across taller field)
  useEffect(() => {
    if (mode === 'gameover' || mode === 'victory') return;

    const bulletSpeed = isRapidfireActive ? 30 : 45;
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
            const sprite = ENEMY_PIXEL_SPRITES[enemy.type];
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

                spawnExplosion(
                  enemy.x + 3,
                  enemy.y + 2,
                  14,
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
                    x: Math.min(CANVAS_W - 4, Math.max(1, enemy.x + 2)),
                    y: enemy.y + 2,
                    type: pType,
                    symbol,
                    color
                  });
                }
              } else {
                spawnExplosion(hitBullet.x, hitBullet.y, 4, ['whiteBright', 'yellowBright'], 0.7);
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
            nextY <= playerY + PLAYER_PIXEL_SPRITE.height &&
            item.x + 3 >= playerX &&
            item.x <= playerX + PLAYER_PIXEL_SPRITE.width;

          if (touchesPlayer) {
            if (item.type === 'shield') {
              setShieldActive(true);
              setActiveMessage('¡ESCUDO ACTIVADO!');
              spawnExplosion(playerX + 3, playerY + 2, 12, ['blueBright', 'cyanBright']);
            } else if (item.type === 'multishot') {
              setMultishotExpiry(Date.now() + 10000);
              setActiveMessage('¡DISPARO MULTIPLE (10s)!');
              spawnExplosion(playerX + 3, playerY + 2, 12, ['greenBright', 'whiteBright']);
            } else if (item.type === 'rapidfire') {
              setRapidfireExpiry(Date.now() + 8000);
              setActiveMessage('¡FUEGO RAPIDO (8s)!');
              spawnExplosion(playerX + 3, playerY + 2, 12, ['yellowBright', 'whiteBright']);
            }
            setScore(s => s + 50);
          } else if (nextY < CANVAS_H) {
            nextItems.push({ ...item, y: nextY });
          }
        }

        return nextItems;
      });
    }, 130);

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
        const maxX = Math.max(...prevEnemies.map(e => e.x + ENEMY_PIXEL_SPRITES[e.type].width));

        if (enemyDir > 0 && maxX >= CANVAS_W - 2) {
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
          y: shouldDrop ? e.y + 2 : e.y
        }));

        const breached = updated.some(
          e => e.y + ENEMY_PIXEL_SPRITES[e.type].height >= playerY
        );

        if (breached) {
          if (shieldActive) {
            setShieldActive(false);
            setActiveMessage('¡ESCUDO ABSORBIO EL IMPACTO!');
            spawnExplosion(playerX + 3, playerY, 16, ['cyanBright', 'whiteBright']);
          } else {
            spawnExplosion(playerX + 3, playerY + 2, 30, ['yellowBright', 'redBright', 'whiteBright', 'cyanBright'], 2.0);
            if (mode === 'demo') {
              return createInitialEnemies();
            } else {
              setMode('gameover');
            }
          }
        }

        return updated;
      });
    }, 350);

    return () => clearInterval(interval);
  }, [mode, enemyDir, playerX, playerY, shieldActive, spawnExplosion]);

  // -------------------------------------------------------------
  // VIRTUAL 2D HALF-BLOCK PIXEL BUFFER (CANVAS_H x CANVAS_W)
  // -------------------------------------------------------------
  const pixelBuffer: (string | null)[][] = Array.from({ length: CANVAS_H }, () =>
    new Array(CANVAS_W).fill(null)
  );

  // 1. Draw Enemies (Half-block square pixels)
  for (const enemy of enemies) {
    const sprite = ENEMY_PIXEL_SPRITES[enemy.type];
    for (let r = 0; r < sprite.height; r++) {
      const py = enemy.y + r;
      if (py >= 0 && py < CANVAS_H) {
        for (let c = 0; c < sprite.width; c++) {
          const px = enemy.x + c;
          if (px >= 0 && px < CANVAS_W) {
            const color = sprite.pixels[r][c];
            if (color !== null) {
              pixelBuffer[py][px] = color;
            }
          }
        }
      }
    }
  }

  // 2. Draw Bullets (single square pixel each)
  for (const b of bullets) {
    if (b.y >= 0 && b.y < CANVAS_H && b.x >= 0 && b.x < CANVAS_W) {
      pixelBuffer[b.y][b.x] = 'yellowBright';
    }
  }

  // 3. Draw Particles (individual colored square pixels)
  for (const p of particles) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (py >= 0 && py < CANVAS_H && px >= 0 && px < CANVAS_W) {
      pixelBuffer[py][px] = p.color;
    }
  }

  // 4. Draw Player Ship (7x6 Half-block pixel art)
  if (mode !== 'gameover' || particles.length > 0) {
    for (let r = 0; r < PLAYER_PIXEL_SPRITE.height; r++) {
      const py = playerY + r;
      if (py >= 0 && py < CANVAS_H) {
        for (let c = 0; c < PLAYER_PIXEL_SPRITE.width; c++) {
          const px = playerX + c;
          if (px >= 0 && px < CANVAS_W) {
            const color = PLAYER_PIXEL_SPRITE.pixels[r][c];
            if (color !== null) {
              pixelBuffer[py][px] = color;
            }
          }
        }
      }
    }
  }

  // 5. Draw Shield Barrier if active (energy arc)
  if (shieldActive) {
    const shieldY = playerY - 1;
    if (shieldY >= 0) {
      for (let c = -1; c <= PLAYER_PIXEL_SPRITE.width; c++) {
        const px = playerX + c;
        if (px >= 0 && px < CANVAS_W) {
          pixelBuffer[shieldY][px] = 'cyanBright';
        }
      }
    }
  }

  // 6. Draw PowerUps as mini 3x2 capsules
  for (const pu of powerUps) {
    if (pu.y >= 0 && pu.y < CANVAS_H - 1 && pu.x >= 0 && pu.x < CANVAS_W - 2) {
      pixelBuffer[pu.y][pu.x] = pu.color;
      pixelBuffer[pu.y][pu.x + 1] = pu.color;
      pixelBuffer[pu.y][pu.x + 2] = pu.color;
      pixelBuffer[pu.y + 1][pu.x] = pu.color;
      pixelBuffer[pu.y + 1][pu.x + 1] = 'whiteBright';
      pixelBuffer[pu.y + 1][pu.x + 2] = pu.color;
    }
  }

  // Compile Virtual Pixel Buffer into 28 Terminal Half-Block Rows
  const renderHalfBlockRow = (termRow: number) => {
    const topY = termRow * 2;
    const botY = termRow * 2 + 1;
    const segments: Segment[] = [];

    let currText = '';
    let currColor: string | undefined = undefined;
    let currBg: string | undefined = undefined;

    for (let x = 0; x < CANVAS_W; x++) {
      const top = pixelBuffer[topY] ? pixelBuffer[topY][x] : null;
      const bot = pixelBuffer[botY] ? pixelBuffer[botY][x] : null;

      let ch = ' ';
      let fg: string | undefined = undefined;
      let bg: string | undefined = undefined;

      if (top !== null && bot !== null) {
        if (top === bot) {
          ch = '█';
          fg = top;
          bg = undefined;
        } else {
          ch = '▀';
          fg = top;
          bg = bot;
        }
      } else if (top !== null && bot === null) {
        ch = '▀';
        fg = top;
        bg = undefined;
      } else if (top === null && bot !== null) {
        ch = '▄';
        fg = bot;
        bg = undefined;
      } else {
        ch = ' ';
        fg = undefined;
        bg = undefined;
      }

      if (fg === currColor && bg === currBg) {
        currText += ch;
      } else {
        if (currText.length > 0) {
          segments.push({ text: currText, color: currColor, backgroundColor: currBg });
        }
        currText = ch;
        currColor = fg;
        currBg = bg;
      }
    }

    if (currText.length > 0) {
      segments.push({ text: currText, color: currColor, backgroundColor: currBg });
    }

    return (
      <Box key={termRow}>
        {segments.map((seg, sIdx) => (
          <Text key={sIdx} color={seg.color} backgroundColor={seg.backgroundColor}>
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
      <Box width={CANVAS_W + 2} justifyContent="space-between">
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
      <Box width={CANVAS_W + 2} justifyContent="flex-start" gap={2}>
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

      {/* Main Game Screen (Half-Blocks 2x Vertical Canvas - 28 lines) */}
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
        width={CANVAS_W + 2}
      >
        {Array.from({ length: TERM_ROWS }).map((_, rIdx) => renderHalfBlockRow(rIdx))}
      </Box>

      {/* Bottom Controls / Notifications */}
      <Box marginTop={1} flexDirection="column" width={CANVAS_W + 2}>
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
