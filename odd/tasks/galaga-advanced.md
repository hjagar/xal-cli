# Galaga Advanced Features
Feature enhancements for Galaga CLI game in Ink.

## Specs
S1: "que las naves, enemigas y el protagonista sean un diseño pixel art"
S2: "que haya un modo demo y que con la tecla N o n arranque un juego nuevo"
S3: "que los enemigos tengan powerups que puedan ser usados por el protagonista."

## Tasks
- [x] T1 (S1, implement): sprites pixel art para protagonista y enemigos -> src/galaga/sprites.ts
- [x] T2 (S2, implement): modo demo con autoplay y tecla N/n para nuevo juego -> src/galaga/game.tsx
- [x] T3 (S3, implement): sistema de powerups soltados por enemigos y recolectables -> src/galaga/game.tsx
- [x] T4 (S1-S3, check): verificación integral del juego en terminal -> npm start OK

## Log
L1: Usuario: "ahora podesmos hacer lo siguiente:\n1. que las naves, enemigas y el protagonista sean un diseño pixel art\n2. que haya un modo demo y que con la tecla N o n arranque un juego nuevo\n3. que los enemigos tengan powerups que puedan ser usados por el protagonista."
L2: Implementado con sprites Unicode block, attract demo AI, y 3 tipos de powerups ([S], [M], [R]).
