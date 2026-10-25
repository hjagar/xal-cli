import React, {useState, useEffect} from 'react';
import {render, useInput, Text, Box} from 'ink';
const W=40, H=22;
export const Galaga = () => {
  const [player, setPlayer] = useState({c:20, r:18});
  const [enemies, setEnemies] = useState([{c:10,r:4}]);
  const [score, setScore] = useState(0);
  useInput(i=>{
    if(i==='ArrowLeft') setPlayer(p=>({c:Math.max(1,p.c-1),r:p.r}));
    if(i==='ArrowRight') setPlayer(p=>({c:Math.min(W-2,p.c+1),r:p.r}));
    if(i===' ') setScore(s=>s+10);
  }, {stopKeyStrokeOnMatch:true});
  useEffect(()=>{
    const t=setInterval(()=>setEnemies(e=>e.map(x=>({c:x.c,r:x.r+1}))), 600);
    return ()=>clearInterval(t);
  },[]);
  return <Box>Score:{score} | Nave:({player.c},{player.r}) | Enemigos:{enemies.length} | W={W} H={H}</Box>;
};
