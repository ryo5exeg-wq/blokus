/* ===== Blokus shared core (rules + AI + server API). Works in browser & Node/Cloudflare. ===== */
(function(GLOBAL){
'use strict';
var N=20;
var PIECES=[
 ['I1',[[0,0]]],['I2',[[0,0],[0,1]]],['I3',[[0,0],[0,1],[0,2]]],['V3',[[0,0],[1,0],[1,1]]],
 ['I4',[[0,0],[0,1],[0,2],[0,3]]],['L4',[[0,0],[0,1],[0,2],[1,0]]],['T4',[[0,0],[0,1],[0,2],[1,1]]],
 ['S4',[[0,1],[0,2],[1,0],[1,1]]],['O4',[[0,0],[0,1],[1,0],[1,1]]],
 ['F',[[0,1],[0,2],[1,0],[1,1],[2,1]]],['I5',[[0,0],[1,0],[2,0],[3,0],[4,0]]],['L5',[[0,0],[1,0],[2,0],[3,0],[3,1]]],
 ['N',[[0,1],[1,1],[2,0],[2,1],[3,0]]],['P',[[0,0],[0,1],[1,0],[1,1],[2,0]]],['T5',[[0,0],[0,1],[0,2],[1,1],[2,1]]],
 ['U',[[0,0],[0,2],[1,0],[1,1],[1,2]]],['V5',[[0,0],[1,0],[2,0],[2,1],[2,2]]],['W',[[0,0],[1,0],[1,1],[2,1],[2,2]]],
 ['X',[[0,1],[1,0],[1,1],[1,2],[2,1]]],['Y',[[0,1],[1,0],[1,1],[2,1],[3,1]]],['Z',[[0,0],[0,1],[1,1],[2,1],[2,2]]]
];
var SIZE={};PIECES.forEach(function(p){SIZE[p[0]]=p[1].length;});
var COLORS=['#2f6df0','#f3c012','#e2453c','#37b24d'];
var CNAMES=['青','黄','赤','緑'];
var CORNERS=[[0,0],[0,N-1],[N-1,N-1],[N-1,0]];
function norm(c){var mr=Math.min.apply(null,c.map(function(p){return p[0];})),mc=Math.min.apply(null,c.map(function(p){return p[1];}));return c.map(function(p){return [p[0]-mr,p[1]-mc];}).sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});}
function rot(c){return norm(c.map(function(p){return [p[1],-p[0]];}));}
function flip(c){return norm(c.map(function(p){return [p[0],-p[1]];}));}
function orients(c){var s={},out=[],cur=norm(c);for(var f=0;f<2;f++){for(var r=0;r<4;r++){var k=JSON.stringify(cur);if(!s[k]){s[k]=1;out.push(cur);}cur=rot(cur);}cur=flip(cur);}return out;}
var ORI={};PIECES.forEach(function(p){ORI[p[0]]=orients(p[1]);});

function canPlace(board,seat,cells,R,C,first){
  var tc=false,te=false;
  for(var i=0;i<cells.length;i++){var br=R+cells[i][0],bc=C+cells[i][1];
    if(br<0||bc<0||br>=N||bc>=N)return false;
    if(board[br][bc]!==0)return false;
    if(br>0&&board[br-1][bc]===seat+1)te=true; if(br<N-1&&board[br+1][bc]===seat+1)te=true;
    if(bc>0&&board[br][bc-1]===seat+1)te=true; if(bc<N-1&&board[br][bc+1]===seat+1)te=true;
    if(br>0&&bc>0&&board[br-1][bc-1]===seat+1)tc=true; if(br>0&&bc<N-1&&board[br-1][bc+1]===seat+1)tc=true;
    if(br<N-1&&bc>0&&board[br+1][bc-1]===seat+1)tc=true; if(br<N-1&&bc<N-1&&board[br+1][bc+1]===seat+1)tc=true;
  }
  if(te)return false;
  if(first){for(var j=0;j<cells.length;j++){if(R+cells[j][0]===CORNERS[seat][0]&&C+cells[j][1]===CORNERS[seat][1])return true;}return false;}
  return tc;
}
function hasAnyMove(board,P,seat){
  for(var pi=0;pi<P.remain.length;pi++){var os=ORI[P.remain[pi]];
    for(var oi=0;oi<os.length;oi++){var o=os[oi];var mr=Math.max.apply(null,o.map(function(p){return p[0];})),mc=Math.max.apply(null,o.map(function(p){return p[1];}));
      for(var R=0;R<=N-1-mr;R++)for(var C=0;C<=N-1-mc;C++){if(canPlace(board,seat,o,R,C,P.first))return true;}}}
  return false;
}
function legalMoves(board,P,seat){
  var mv=[];
  for(var pi=0;pi<P.remain.length;pi++){var pid=P.remain[pi],os=ORI[pid];
    for(var oi=0;oi<os.length;oi++){var o=os[oi];var mr=Math.max.apply(null,o.map(function(p){return p[0];})),mc=Math.max.apply(null,o.map(function(p){return p[1];}));
      for(var R=0;R<=N-1-mr;R++)for(var C=0;C<=N-1-mc;C++){if(canPlace(board,seat,o,R,C,P.first))mv.push({pid:pid,cells:o,R:R,C:C,size:o.length});}}}
  return mv;
}
function aiPick(board,P,seat){
  var mv=legalMoves(board,P,seat);if(mv.length===0)return null;
  var cx=(CORNERS[seat][0]<10)?0:19,cy=(CORNERS[seat][1]<10)?0:19,best=null,bs=-1e9;
  for(var i=0;i<mv.length;i++){var m=mv[i],occ={},reach=0,corners=0;
    for(var j=0;j<m.cells.length;j++){var br=m.R+m.cells[j][0],bc=m.C+m.cells[j][1];occ[br*100+bc]=1;reach+=Math.abs(br-cx)+Math.abs(bc-cy);}
    for(var j2=0;j2<m.cells.length;j2++){var br2=m.R+m.cells[j2][0],bc2=m.C+m.cells[j2][1],ds=[[-1,-1],[-1,1],[1,-1],[1,1]];
      for(var d=0;d<4;d++){var nr=br2+ds[d][0],nc=bc2+ds[d][1];if(nr<0||nc<0||nr>=N||nc>=N)continue;if(board[nr][nc]!==0)continue;if(occ[nr*100+nc])continue;
        var adj=occ[(nr-1)*100+nc]||occ[(nr+1)*100+nc]||occ[nr*100+nc-1]||occ[nr*100+nc+1];if(!adj)corners++;}}
    var sc=m.size*1000+corners*12+reach*0.6+Math.random()*2;if(sc>bs){bs=sc;best=m;}}
  return best;
}
function emptyBoard(){var b=[];for(var r=0;r<N;r++)b.push(new Array(N).fill(0));return b;}
function allPassed(game){return game.players.every(function(p){return p.passed;});}
function place(game,seat,cells,R,C){for(var i=0;i<cells.length;i++)game.board[R+cells[i][0]][C+cells[i][1]]=seat+1;var P=game.players[seat];P.remain=P.remain.filter(function(x){return x!==cells.pid;});P.first=false;}

// ---- server API ----
function createGame(names){
  var players=[];for(var s=0;s<4;s++)players.push({name:names[s]||CNAMES[s],remain:PIECES.map(function(p){return p[0];}),first:true,passed:false,last:null});
  return {board:emptyBoard(),players:players,turn:0,over:false};
}
function placeMove(game,seat,mv){
  for(var i=0;i<mv.cells.length;i++)game.board[mv.R+mv.cells[i][0]][mv.C+mv.cells[i][1]]=seat+1;
  var P=game.players[seat];P.remain=P.remain.filter(function(x){return x!==mv.pid;});P.first=false;P.last=mv.pid;
}
function validOri(pid,cells){var k=JSON.stringify(norm(cells));return (ORI[pid]||[]).some(function(o){return JSON.stringify(o)===k;});}
function applyMove(game,seat,move,active){
  if(game.over)return {ok:false,err:'ゲーム終了済み'};
  if(game.turn!==seat)return {ok:false,err:'あなたの番ではありません'};
  if(!move||move.kind!=='place')return {ok:false,err:'不正な操作'};
  var P=game.players[seat];
  if(P.remain.indexOf(move.pid)<0)return {ok:false,err:'そのピースは持っていません'};
  if(!validOri(move.pid,move.cells))return {ok:false,err:'ピースの形が不正です'};
  if(!canPlace(game.board,seat,move.cells,move.R,move.C,P.first))return {ok:false,err:'そこには置けません'};
  placeMove(game,seat,{pid:move.pid,cells:norm(move.cells),R:move.R,C:move.C});
  game.turn=(seat+1)%4;
  stepBots(game,active||[]);
  return {ok:true};
}
function stepBots(game,active){
  var guard=0;
  while(!game.over&&guard++<400){
    var seat=game.turn,P=game.players[seat];
    if(P.passed){game.turn=(seat+1)%4;if(allPassed(game))game.over=true;continue;}
    if(!hasAnyMove(game.board,P,seat)){P.passed=true;if(allPassed(game)){game.over=true;break;}game.turn=(seat+1)%4;continue;}
    if((active||[]).indexOf(seat)>=0)return;        // active human's turn -> wait
    var mv=aiPick(game.board,P,seat);                // AI / disconnected human -> auto play
    if(!mv){P.passed=true;game.turn=(seat+1)%4;continue;}
    placeMove(game,seat,mv);game.turn=(seat+1)%4;
  }
  if(!game.over&&allPassed(game))game.over=true;
}
function scoreOf(P){var rem=0;P.remain.forEach(function(pid){rem+=SIZE[pid];});return -rem+(rem===0?(P.last==='I1'?20:15):0);}

var API={N:N,PIECES:PIECES,ORI:ORI,SIZE:SIZE,COLORS:COLORS,CNAMES:CNAMES,CORNERS:CORNERS,
  norm:norm,orients:orients,canPlace:canPlace,hasAnyMove:hasAnyMove,legalMoves:legalMoves,aiPick:aiPick,
  createGame:createGame,applyMove:applyMove,stepBots:stepBots,scoreOf:scoreOf};
if(typeof module!=='undefined'&&module.exports){module.exports=API;}
else{GLOBAL.BLOKUS=API;for(var k in API)GLOBAL[k]=API[k];}
})(typeof self!=='undefined'?self:(typeof globalThis!=='undefined'?globalThis:this));
