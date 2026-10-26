import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { ensureAudioAssets } from './synth.js';

export type SoundEffect = 'laser' | 'explosion' | 'powerup' | 'shield';

interface AudioConfig {
  playerCommand: string | null;
  playerArgs: (file: string) => string[];
  available: boolean;
}

class AudioEngine {
  private config: AudioConfig = { playerCommand: null, playerArgs: () => [], available: false };
  private soundPaths: Record<string, string> = {};
  private musicProcess: ChildProcess | null = null;
  private isMusicLooping: boolean = false;
  private lastPlayTimes: Record<string, number> = {};
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // Detect platform player
    this.config = this.detectPlayer();

    // Cache directory for procedural WAVs
    const cacheDir = path.join(os.tmpdir(), 'xal-cli-audio');
    try {
      this.soundPaths = ensureAudioAssets(cacheDir);
    } catch {
      // In restricted environments without tmp write, disable audio
      this.config.available = false;
    }

    // Clean exit hook to prevent orphaned audio players
    const cleanup = () => {
      this.stopMusic();
    };
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private detectPlayer(): AudioConfig {
    const platform = process.platform;

    if (platform === 'darwin') {
      return {
        playerCommand: 'afplay',
        playerArgs: file => [file],
        available: true
      };
    }

    if (platform === 'win32') {
      return {
        playerCommand: 'powershell',
        playerArgs: file => [
          '-c',
          `(New-Object Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`
        ],
        available: true
      };
    }

    // Linux / BSD candidates
    const candidates: Array<{ cmd: string; args: (f: string) => string[] }> = [
      { cmd: 'paplay', args: f => [f] },
      { cmd: 'aplay', args: f => ['-q', f] },
      { cmd: 'pw-play', args: f => [f] },
      { cmd: 'ffplay', args: f => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
      { cmd: 'play', args: f => ['-q', f] }
    ];

    for (const { cmd, args } of candidates) {
      if (this.commandExists(cmd)) {
        return {
          playerCommand: cmd,
          playerArgs: args,
          available: true
        };
      }
    }

    return {
      playerCommand: null,
      playerArgs: () => [],
      available: false
    };
  }

  private commandExists(cmd: string): boolean {
    const PATH = process.env.PATH || '';
    const dirs = PATH.split(path.delimiter);
    for (const dir of dirs) {
      const full = path.join(dir, cmd);
      try {
        if (fs.existsSync(full)) {
          return true;
        }
      } catch {
        // ignore access errors
      }
    }
    return false;
  }

  public isAvailable(): boolean {
    return this.config.available;
  }

  /**
   * Play a one-shot sound effect asynchronously without blocking.
   */
  public play(sfx: SoundEffect) {
    if (!this.config.available || !this.config.playerCommand) return;

    const file = this.soundPaths[sfx];
    if (!file) return;

    // Throttle repeated SFX to prevent process flooding
    const now = Date.now();
    const last = this.lastPlayTimes[sfx] || 0;
    const minInterval = sfx === 'laser' ? 50 : 80;
    if (now - last < minInterval) return;
    this.lastPlayTimes[sfx] = now;

    try {
      const child = spawn(
        this.config.playerCommand,
        this.config.playerArgs(file),
        { stdio: 'ignore', detached: true }
      );
      child.unref();
      child.on('error', () => {
        // Silently ignore spawn errors
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Start looping background chiptune music track.
   */
  public startMusic() {
    if (!this.config.available || !this.config.playerCommand || this.isMusicLooping) return;

    const musicFile = this.soundPaths.music;
    if (!musicFile) return;

    this.isMusicLooping = true;

    const loop = () => {
      if (!this.isMusicLooping || !this.config.playerCommand) return;

      try {
        this.musicProcess = spawn(
          this.config.playerCommand,
          this.config.playerArgs(musicFile),
          { stdio: 'ignore' }
        );

        this.musicProcess.on('exit', () => {
          this.musicProcess = null;
          if (this.isMusicLooping) {
            // Repeat loop after 100ms gap
            setTimeout(loop, 100);
          }
        });

        this.musicProcess.on('error', () => {
          this.isMusicLooping = false;
        });
      } catch {
        this.isMusicLooping = false;
      }
    };

    loop();
  }

  /**
   * Stop background music playback.
   */
  public stopMusic() {
    this.isMusicLooping = false;
    if (this.musicProcess) {
      try {
        this.musicProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
      this.musicProcess = null;
    }
  }
}

export const audio = new AudioEngine();
