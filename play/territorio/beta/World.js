import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";

export class World {
  constructor(canvas, game){
    this.game=game;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x070b12);
    this.camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,500);
    this.camera.position.set(0,7,11);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;
    this.clock=new THREE.Clock();
    this.entities=[];
    this.npcs=[];
    this.animals=[];
    this.mode="complex";
    this.buildLights();
    this.buildComplex();
    addEventListener("resize",()=>this.resize());
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)}
  buildLights(){
    this.scene.add(new THREE.HemisphereLight(0x9bb8d8,0x16121e,1.8));
    const sun=new THREE.DirectionalLight(0xfff0d0,2.2);sun.position.set(10,18,8);sun.castShadow=true;this.scene.add(sun);
  }
  mat(c){return new THREE.MeshStandardMaterial({color:c,roughness:.78,metalness:.08})}
  box(name,x,z,w,d,h,c){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c));m.position.set(x,h/2,z);m.castShadow=true;m.receiveShadow=true;m.userData={name,type:"poi"};this.scene.add(m);this.entities.push(m);return m;
  }
  label(text,x,z){
    const c=document.createElement("canvas"),ctx=c.getContext("2d");c.width=512;c.height=128;ctx.fillStyle="#dce9f5";ctx.font="700 34px monospace";ctx.textAlign="center";ctx.fillText(text,256,70);
    const tex=new THREE.CanvasTexture(c), sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sp.position.set(x,3.4,z);sp.scale.set(4,1,1);this.scene.add(sp);
  }
  buildGround(color=0x202733){
    const g=new THREE.Mesh(new THREE.PlaneGeometry(90,90),this.mat(color));g.rotation.x=-Math.PI/2;g.receiveShadow=true;this.scene.add(g);
  }
  buildComplex(){
    this.buildGround(0x242a31);
    // rua / calçadas
    this.box("avenida",0,-7,34,7,.18,0x30363d);
    this.box("calçada",-17,-1,4,25,.18,0x3a4047);this.box("calçada",17,-1,4,25,.18,0x3a4047);
    // Totem central
    const totem=this.box("TOTEM",0,3,2.2,2.2,4.6,0x122d3b);totem.userData.interaction="totem";this.label("TOTEM",0,3);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.45,20,20),new THREE.MeshStandardMaterial({color:0x5fd0a0,emissive:0x1b7054,emissiveIntensity:2}));orb.position.set(0,4.7,3);this.scene.add(orb);
    // banheiro
    const bath=this.box("BANHEIRO",-8,1,6,4,2.7,0x29486a);bath.userData.interaction="bathroom";this.label("BANHEIRO",-8,1);
    // guichê
    const desk=this.box("GUICHÊ",8,1,6,4,2.4,0x4c3b27);desk.userData.interaction="desk";this.label("GUICHÊ",8,1);
    // estandes
    [["AQUA",-11,10,0x244b66],["TERA",-3,10,0x3f5133],["AERO",5,10,0x443765],["DRONE",13,10,0x35465b]].forEach(([n,x,z,c])=>{
      const s=this.box(n,x,z,5,4,2.6,c);s.userData.interaction="stand";s.userData.stand=n;this.label(n,x,z);
    });
    // skate / praça
    this.box("Pista",0,17,14,7,.12,0x33383d);this.label("PISTA",0,17);
    this.box("Praça",-14,16,8,7,.12,0x30383b);this.label("PRAÇA",-14,16);
    // portal de entrada/saída do Habitat
    const portal=this.box("PORTAL",0,22,3,1.4,3.4,0x193f4b);
    portal.userData.interaction="portal"; this.label("HABITAT",0,22);
    // árvores
    for(const [x,z] of [[-20,10],[-20,19],[20,10],[20,19],[15,-5],[-15,-5]])this.tree(x,z);
    // NPCs
    this.spawnNPC("Funcionário",4,-2,0x9a6bd0);
    this.spawnNPC("Visitante",-4,-3,0xd07b65);
    this.spawnNPC("Skatista",9,15,0x5c9fcf);
    // animais livres no complexo
    this.spawnAnimal("dronezinho",-12,5,0x5fd0a0);
    this.spawnAnimal("criaturinha",14,5,0xe0a45f);
  }
  tree(x,z){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,2,8),this.mat(0x49352a));trunk.position.set(x,1,z);this.scene.add(trunk);
    const crown=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,8),this.mat(0x315342));crown.position.set(x,2.7,z);this.scene.add(crown);
  }
  spawnNPC(name,x,z,c){
    const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.8,4,8),this.mat(c));body.position.y=.8;g.add(body);g.position.set(x,0,z);g.userData={interaction:"npc",name};this.scene.add(g);this.npcs.push(g);
  }
  spawnAnimal(name,x,z,c){
    const g=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(.55,14,10),this.mat(c));body.scale.y=.65;body.position.y=.65;g.add(body);
    const core=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshStandardMaterial({color:0xffffff,emissive:c,emissiveIntensity:1.4}));core.position.set(.32,.75,.35);g.add(core);
    g.position.set(x,0,z);g.userData={interaction:"animal",name,baseX:x,baseZ:z,phase:Math.random()*6};this.scene.add(g);this.animals.push(g);
  }
  buildHabitat(pet){
    this.scene.clear();this.entities=[];this.npcs=[];this.animals=[];this.mode="habitat";
    this.buildLights();
    this.scene.background=new THREE.Color(0x06131b);
    this.buildGround(0x0d2529);
    // Habitat circular
    const ring=new THREE.Mesh(new THREE.TorusGeometry(11,.18,12,64),new THREE.MeshStandardMaterial({color:0x5fd0a0,emissive:0x123f33,emissiveIntensity:1.5}));ring.rotation.x=Math.PI/2;ring.position.y=.05;this.scene.add(ring);
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=7+Math.sin(i*3)*1.5;this.rock(r*Math.cos(a),r*Math.sin(a),.4+.3*(i%3));}
    // portal de retorno
    const portal=this.box("SAÍDA",0,-9,3,1.4,3.4,0x193f4b);
    portal.userData.interaction="portal"; this.label("SAÍDA",0,-9);
    // casa
    this.box("CASA",7,-5,5,4,2.6,0x25384b);this.label("CASA",7,-5);
    // observatory
    const obs=this.box("OBSERVAÇÃO",-6,-5,5,4,2.3,0x29352f);obs.userData.interaction="observe";this.label("OBSERVAÇÃO",-6,-5);
    // pet
    this.spawnPet(pet,0,2);
    this.spawnAnimal("microfauna",-5,5,0x7d84ff);
    this.spawnAnimal("microfauna",5,6,0xff79d0);
  }
  rock(x,z,s){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),this.mat(0x385257));r.position.set(x,s/2,z);this.scene.add(r)}
  spawnPet(pet,x,z){
    const g=new THREE.Group();const body=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,1),this.mat(0x5fd0a0));body.scale.y=.8;body.position.y=1.1;body.castShadow=true;g.add(body);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(1.45,.035,8,40),new THREE.MeshBasicMaterial({color:0x5fd0a0,transparent:true,opacity:.65}));halo.rotation.x=Math.PI/2;halo.position.y=1.1;g.add(halo);
    g.position.set(x,0,z);g.userData={interaction:"pet",name:pet.name};this.scene.add(g);this.petObject=g;
  }
  updatePet(dt){
    if(!this.petObject)return;
    const t=performance.now()/1000;this.petObject.position.y=.12+Math.sin(t*2)*.08;
    this.petObject.rotation.y+=dt*.45;
    const near=this.game.playerPos.distanceTo(this.petObject.position);
    if(near<3.5)this.petObject.position.x += Math.sin(t*1.7)*dt*.15;
  }
  updateNPCs(dt){
    const t=performance.now()/1000;
    this.animals.forEach(a=>{if(a.userData.name==="microfauna"){a.position.x=a.userData.baseX+Math.sin(t*.7+a.userData.phase)*1.5;a.position.z=a.userData.baseZ+Math.cos(t*.6+a.userData.phase)*1.2} else {a.position.x=a.userData.baseX+Math.sin(t*.45+a.userData.phase)*1.0;a.position.z=a.userData.baseZ+Math.cos(t*.35+a.userData.phase)*.8}});
  }
  setPlayerCamera(pos){
    const target=new THREE.Vector3(pos.x,1.1,pos.z);
    this.camera.position.lerp(new THREE.Vector3(pos.x,6.5,pos.z+9),.12);
    this.camera.lookAt(target);
  }
  render(playerPos,dt){
    this.updateNPCs(dt);this.updatePet(dt);this.setPlayerCamera(playerPos);this.renderer.render(this.scene,this.camera);
  }
}