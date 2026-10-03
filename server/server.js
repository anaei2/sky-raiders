const WebSocket = require('ws');
const http = require('http');
const port = process.env.PORT || 10000;
const server = http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end('Sky Raiders server online');});
const wss = new WebSocket.Server({server});
const rooms = new Map();
function send(ws,msg){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));}
function broadcast(room,msg){for(const p of room.players)send(p.ws,msg);}
wss.on('connection',ws=>{
  const player={ws,name:'Pilot',ready:false,room:null};
  send(ws,{type:'connected'});
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
    if(m.type==='create'){const code=Math.random().toString(36).slice(2,8).toUpperCase();const room={code,name:m.name||'Sky Raiders',players:[],started:false};rooms.set(code,room);player.room=room;room.players.push(player);send(ws,{type:'roomCreated',code,name:room.name});broadcast(room,{type:'roomState',players:room.players.map(p=>({name:p.name,ready:p.ready}))});}
    else if(m.type==='join'){const room=rooms.get(String(m.code||'').toUpperCase());if(!room){send(ws,{type:'error',message:'Sala não encontrada'});return}if(room.players.length>=8){send(ws,{type:'error',message:'Sala cheia'});return}player.room=room;player.name=m.playerName||'Pilot';room.players.push(player);send(ws,{type:'joined',code:room.code,name:room.name});broadcast(room,{type:'roomState',players:room.players.map(p=>({name:p.name,ready:p.ready}))});}
    else if(m.type==='ready'&&player.room){
      player.ready=!!m.ready;
      const room=player.room;
      broadcast(room,{type:'roomState',players:room.players.map(p=>({name:p.name,ready:p.ready}))});
      const canStart=room.players.length>=2 && room.players.every(p=>p.ready);
      if(canStart && !room.started){
        room.started=true;
        broadcast(room,{type:'match_start',phase:Number(m.phase||1)});
      }
    }
    else if(m.type==='gameState'&&player.room){broadcast(player.room,{type:'gameState',from:player.name,state:m.state});}
    else if(m.type==='leave'){leave(player);}
  });
  ws.on('close',()=>leave(player));
});
function leave(player){const r=player.room;if(!r)return; r.players=r.players.filter(p=>p!==player);player.room=null;if(r.players.length===0)rooms.delete(r.code);else broadcast(r,{type:'roomState',players:r.players.map(p=>({name:p.name,ready:p.ready}))});}
server.listen(port,()=>console.log(`Sky Raiders server listening on ${port}`));
