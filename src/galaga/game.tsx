import React, {useState, useEffect} from 'react';
import {render, useInput, Text, Box} from 'ink';
const W=40, H=22;
export const Galaga = () => {
  const [player, setPlayer] = useState({c:20, r:18});
  useInput((i)=>{ if(i==='ArrowLeft')setPlayer(p=>({c:Math.max(1,p.c-1),r:p.r})); if(i==='ArrowRight')setPlayer(p=>({c:Math.min(W-2,p.c+1),r:p.r})); }, {stopKeyStrokeOnMatch:true});
  return <Box>Galaga Ink: nave en ({player.c},{player.r}) | W={W} H={H}</Box>;
};
