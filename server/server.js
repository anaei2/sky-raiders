const WebSocket=require('ws');const http=require('http');const port=process.env.PORT||10000;
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end('Sky Raiders server online');});
const wss=new WebSocket.Server({server});const rooms=new Map();
function send(ws,msg){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));}
function host(r){return r.players[0]||null} function state(r){return {type:'roomState',hostId:host(r)?.playerId||null,players:r.players.map(p=>({name:p.name,playerId:p.playerId,ready:p.ready}))}} function broadcast(r,msg){r.players.forEach(p=>send(p.ws,msg));}
wss.on('connection',ws=>{const p={ws,name:'Pilot',playerId:null,ready:false,room:null};send(ws,{type:'connected'});ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return};
if(m.type==='create'){p.name=(m.playerName||'Pilot').slice(0,24);p.playerId=String(m.playerId||'').slice(0,40);const code=Math.random().toString(36).slice(2,8).toUpperCase();const r={code,name:m.name||'Sky Raiders',players:[],started:false,phase:1};rooms.set(code,r);p.room=r;r.players.push(p);send(ws,{type:'roomCreated',code,name:r.name,hostId:p.playerId});broadcast(r,state(r));}
else if(m.type==='join'){p.name=(m.playerName||'Pilot').slice(0,24);p.playerId=String(m.playerId||'').slice(0,40);const r=rooms.get(String(m.code||'').toUpperCase());if(!r)return send(ws,{type:'error',message:'Sala não encontrada'});if(r.players.length>=8)return send(ws,{type:'error',message:'Sala cheia'});if(r.started)return send(ws,{type:'error',message:'A partida já começou'});p.room=r;r.players.push(p);send(ws,{type:'joined',code:r.code,name:r.name,hostId:host(r)?.playerId||null});broadcast(r,state(r));}
else if(m.type==='ready'&&p.room){p.ready=!!m.ready;const r=p.room;broadcast(r,state(r));if(r.players.length>=2&&r.players.every(x=>x.ready)&&!r.started){r.started=true;r.phase=Math.max(1,Math.min(900,Number(m.phase||1)));broadcast(r,{type:'match_start',phase:r.phase,hostId:host(r)?.playerId||null});}}
else if(m.type==='enemySnapshot'&&p.room&&p===host(p.room)&&p.room.started){broadcast(p.room,{type:'enemySnapshot',enemies:Array.isArray(m.enemies)?m.enemies:[],phase:Number(m.phase||1),wave:Number(m.wave||1)});}
else if(m.type==='enemyHit'&&p.room&&p.room.started&&p!==host(p.room)){send(host(p.room).ws,{type:'enemyHit',enemyId:String(m.enemyId),damage:Number(m.damage)||0});}
else if(m.type==='phase_complete'&&p.room&&p===host(p.room)&&p.room.started){broadcast(p.room,{type:'phase_complete',phase:Number(m.phase||p.room.phase||1)});}
else if(m.type==='leave')leave(p);});ws.on('close',()=>leave(p));});
function leave(p){const r=p.room;if(!r)return;r.players=r.players.filter(x=>x!==p);p.room=null;if(!r.players.length)rooms.delete(r.code);else{if(r.started)broadcast(r,{type:'error',message:'Um jogador saiu da partida.'});broadcast(r,state(r));}}
server.listen(port,()=>console.log(`Sky Raiders server listening on ${port}`));
