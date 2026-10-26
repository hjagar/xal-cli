# Audio Engine & 8-Bit Chiptune
Decoupled audio engine for SFX and chiptune background music.

## Specs
S1: "pongamos audio que pueda salir en la consola, disparos, explosiones"
S2: "implementar una musica de 8 o 16 bits original"

## Tasks
T1 (S1-S2, implement): sintetizador procedural WAV 8-bit en src/galaga/audio/synth.ts -> commit feat(audio-synth)
T2 (S1-S2, implement): motor de reproducción desacoplado y multiplataforma en src/galaga/audio/player.ts -> commit feat(audio-player)
T3 (S1-S2, implement): integración de SFX y loop musical en src/galaga/game.tsx -> commit feat(audio-integration)
T4 (S1-S2, check): verificar reproducción fluida y graceful degradation sin audio backend -> commit verify-audio

## Log
L1: Usuario: "1. pongamos audio que pueda salir en la consola, disparos, explosiones\n... 4. implementar una musica de 8 o 16 bits original"
L2: Rama `feat/audio-engine` para arquitectura de sonido desacoplada.
