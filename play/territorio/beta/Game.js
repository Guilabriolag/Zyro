import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";
import {World} from "./World.js";
import {UI} from "./UI.js";

const canvas=document.querySelector("#world");
const world=new World(canvas,null);
const game={
  world, ui:null,
  player:{name:"",age:"",sign:""}, registered:false,
  playerPos:new THREE.Vector3(0,0,-2),
  playerYaw:0, speed:3.2,
  unlocks:[], events:[], pet:null, mode:"complex",
  joystick:{x:0,y:0},
  keys:{}, nearby:null
};
world.game=game; game.ui=new UI(game);

const playerMesh=new THREE.Group();
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.9,5,10),new THREE.MeshStandardMaterial({color:0x2d8063}));
body.position.y=.9;playerMesh.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),new THREE.MeshStandardMaterial({color:0xb9c7d1}));head.position.y=1.65;playerMesh.add(head);
world.scene.add(playerMesh);

function logEvent(verbo,objeto,from,to,action){
  const e={id:game.events.length+1,entidade:"player",verbo,objeto,condicao:"contexto válido",estado_anterior:from,acao:action,estado_novo:to,timestamp:Date.now(),evento_anterior:game.events.at(-1)?.hash||"GENESIS"};
  e.hash="evt_"+Math.abs([...JSON.stringify(e)].reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)).toString(16);
  game.events.push(e);return e;
}
function distTo(x,z){return Math.hypot(game.playerPos.x-x,game.playerPos.z-z)}
function detectNearby(){
  const candidates=[
    {d:distTo(0,3),name:"Totem",interaction:"totem"},
    {d:distTo(-8,1),name:"Banheiro",interaction:"bathroom"},
    {d:distTo(8,1),name:"Guichê",interaction:"desk"},
    {d:distTo(-11,10),name:"Estande Aqua",interaction:"stand",stand:"AQUA"},
    {d:distTo(-3,10),name:"Estande Tera",interaction:"stand",stand:"TERA"},
    {d:distTo(5,10),name:"Estande Aero",interaction:"stand",stand:"AERO"},
    {d:distTo(13,10),name:"Estande Drone",interaction:"stand",stand:"DRONE"},
    {d:distTo(0,17),name:"Pista",interaction:"poi"},
    {d:distTo(0,22),name:"Portal Habitat",interaction:"portal"},
    {d:distTo(0,-9),name:"Saída",interaction:"portal"},
    {d:distTo(7,-5),name:"Casa",interaction:"house"},
    {d:distTo(-6,-5),name:"Observatório",interaction:"observe"}
  ];
  world.npcs.forEach(n=>{const d=game.playerPos.distanceTo(n.position);if(d<2.2)candidates.push({d,name:n.userData.name,interaction:"npc"})});
  world.animals.forEach(a=>{const d=game.playerPos.distanceTo(a.position);if(d<2.2)candidates.push({d,name:a.userData.name,interaction:a.userData.interaction||"animal"})});
  candidates.sort((a,b)=>a.d-b.d);game.nearby=candidates[0]?.d<2.5?candidates[0]:null;
  if(game.nearby)game.ui.showPrompt(`INTERAGIR · ${game.nearby.name}`);else game.ui.hidePrompt();
}
function interact(){
  const n=game.nearby;
  if(!n){game.ui.toast("nada por perto para interagir");return}
  if(n.interaction==="totem"){
    if(!game.registered)game.ui.showRegister();else game.ui.toast("<b>Totem</b> · cadastro já concluído");
  }else if(n.interaction==="bathroom"){
    if(!game.registered)game.ui.toast("primeiro registre seu Player no Totem");
    else {game.unlocks.push("banheiro");logEvent("entrar","banheiro","bloqueado","liberado","desbloquear_banheiro");game.ui.showBathroom();}
  }else if(n.interaction==="desk"){
    if(!game.unlocks.includes("banheiro"))game.ui.toast("o guichê pede o primeiro circuito concluído");else game.ui.toast("<b>Guichê</b> · escolha um estande para conhecer uma Cria");
  }else if(n.interaction==="stand"){
    if(!game.unlocks.includes("banheiro")){game.ui.toast("estandes bloqueados · complete o primeiro circuito");return}
    const names={AQUA:"Nereida",TERA:"Mog",AERO:"Aeris",DRONE:"D-01"};
    const species={AQUA:"aquática",TERA:"terrestre",AERO:"aérea",DRONE:"drone orgânico"};
    const key=n.stand;
    if(confirm(`Adquirir ${names[key]} · espécie ${species[key]}?`)){
      game.pet={name:names[key],species:species[key],state:"curiosa",stage:"larva",energy:82,hunger:24};
      game.unlocks.push("habitat");
      logEvent("adquirir",names[key],"disponível","adquirida","adquirir_cria");
      game.ui.toast(`<b>${names[key]}</b> foi para sua mochila`);
    }
  }else if(n.interaction==="npc"){game.ui.toast(`<b>${n.name}</b> · “Olá, Player.”`)}
  else if(n.interaction==="animal"){game.ui.toast(`<b>${n.name}</b> · percebeu sua presença`)}
  else if(n.interaction==="poi"){game.ui.toast("PISTA · área de convivência")}
  else if(n.interaction==="observe"){game.ui.toast("OBSERVAÇÃO · registre o estado da Cria")}
  else if(n.interaction==="house"){game.ui.toast("CASA · seu ponto pessoal no Habitat")}
}
function registerPlayer(){
  const name=document.querySelector("#playerName").value.trim();
  if(!name){game.ui.toast("dê um nome ao Player");return}
  game.player={name,age:document.querySelector("#playerAge").value||"—",sign:document.querySelector("#playerSign").value};
  game.registered=true;game.unlocks.push("cadastro");
  logEvent("registrar","player","não registrado","registrado","criar_identidade");
  game.ui.hideRegister();
  game.ui.toast(`<b>Bem-vindo, ${name}</b> · o banheiro foi desbloqueado`);
  game.ui.stateText("registrado");
}
game.registerPlayer=registerPlayer;game.interact=interact;
game.completeBathroom=()=>{
  const sex=document.querySelector("#playerSex").value;
  const social=document.querySelector("#playerSocial").value.trim();
  game.player.sex=sex; game.player.social=social||game.player.name;
  if(!game.unlocks.includes("cadastro-completo"))game.unlocks.push("cadastro-completo");
  if(!game.unlocks.includes("banheiro"))game.unlocks.push("banheiro");
  logEvent("completar_cadastro","player","incompleto","completo","registrar_dados");
  game.ui.hideBathroom(); game.ui.toast("<b>Cadastro completo</b> · guichê liberado");
};


const joyZone=document.querySelector("#joyZone"),joyKnob=document.querySelector("#joyKnob");
let joyOn=false,joyId=null,center={x:0,y:0};
function joyPoint(e){return{x:e.clientX-center.x,y:e.clientY-center.y}}
function joyMove(e){if(!joyOn)return;let p=joyPoint(e),m=Math.hypot(p.x,p.y),r=joyZone.clientWidth/2;if(m>r){p.x=p.x/m*r;p.y=p.y/m*r}joyKnob.style.transform=`translate(${p.x}px,${p.y}px)`;game.joystick.x=p.x/r;game.joystick.y=p.y/r}
joyZone.addEventListener("pointerdown",e=>{joyOn=true;joyId=e.pointerId;joyZone.setPointerCapture(joyId);const r=joyZone.getBoundingClientRect();center={x:r.left+r.width/2,y:r.top+r.height/2};joyMove(e)});
joyZone.addEventListener("pointermove",e=>{if(e.pointerId===joyId)joyMove(e)});
function joyEnd(){joyOn=false;game.joystick.x=game.joystick.y=0;joyKnob.style.transform="translate(0,0)"}
joyZone.addEventListener("pointerup",joyEnd);joyZone.addEventListener("pointercancel",joyEnd);
addEventListener("keydown",e=>game.keys[e.key.toLowerCase()]=true);addEventListener("keyup",e=>game.keys[e.key.toLowerCase()]=false);

function move(dt){
  let x=game.joystick.x,y=game.joystick.y;
  if(game.keys.w||game.keys.arrowup)y-=1;if(game.keys.s||game.keys.arrowdown)y+=1;
  if(game.keys.a||game.keys.arrowleft)x-=1;if(game.keys.d||game.keys.arrowright)x+=1;
  const m=Math.hypot(x,y);if(m>.05){x/=Math.max(1,m);y/=Math.max(1,m);game.playerPos.x+=x*game.speed*dt;game.playerPos.z+=y*game.speed*dt;game.playerYaw=Math.atan2(x,y)}
  game.playerPos.x=Math.max(-21,Math.min(21,game.playerPos.x));game.playerPos.z=Math.max(-10,Math.min(23,game.playerPos.z));
  playerMesh.position.copy(game.playerPos);playerMesh.rotation.y=game.playerYaw;
}

function toggleHabitat(){ if(game.mode==="complex") enterHabitat(); else exitHabitat(); }
game.toggleHabitat=toggleHabitat;
function enterHabitat(){
  if(!game.pet){game.ui.toast("adquira uma Cria primeiro");return}
  game.mode="habitat";game.worldLabel="HABITAT 0001";
  document.querySelector("#worldLabel").textContent="HABITAT 0001";
  world.buildHabitat(game.pet);game.playerPos.set(0,0,-2);world.scene.add(playerMesh);
  game.ui.toast(`<b>${game.pet.name}</b> · Habitat 0001 aberto`);
}
function exitHabitat(){
  game.mode="complex";document.querySelector("#worldLabel").textContent="COMPLEXO";
  world.scene.clear();world.entities=[];world.npcs=[];world.animals=[];world.buildLights();world.buildComplex();world.scene.add(playerMesh);game.playerPos.set(0,0,-2);
  game.ui.toast("<b>Complexo</b> · retorno ao mundo");
}
document.querySelector("#inventoryBtn")?.addEventListener("click",enterHabitat);
document.addEventListener("dblclick",()=>game.mode==="complex"?enterHabitat():exitHabitat());

let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  move(dt);detectNearby();
  if(game.mode==="habitat" && game.pet) world.updatePet(dt);
  world.render(game.playerPos,dt);
  requestAnimationFrame(loop);
}
game.ui.stateText("online");
game.ui.toast("<b>ZYRO</b> · você chegou ao Complexo");
requestAnimationFrame(loop);

// Botão mochila vira também atalho para Habitat quando já existe Cria.
document.querySelector("#inventoryBtn").addEventListener("dblclick",()=>game.mode==="complex"?enterHabitat():exitHabitat());
