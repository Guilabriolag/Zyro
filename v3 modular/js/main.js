window.g0Main = {
  engine:null,player:null,perception:null,pickup:null,world:null,env:null,hud:null,rooms:[],npcs:[],
  init(){
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x88b6d4);
    this.camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,300);
    this.camera.position.set(0,8,15);
    this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;document.body.appendChild(this.renderer.domElement);
    this.controls=new THREE.OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=6;this.controls.maxDistance=25;
    this.engine=new G0Engine();
    this.world=new G0World(this.scene);this.env=new G0Environment(this.scene);
    this.player=new G0Player(this.scene);this.engine.register(this.player);
    this.perception=new G0Perception(this.player,this.engine);this.pickup=new G0Pickup(this.engine);this.hud=new G0HUD();new G0Gestures(this.player);new G0ActionMenu(this.engine,this.env);
    this.buildCinemaSystems();
    this.bindJoystick();this.bindAction();addEventListener("resize",()=>this.resize());
    this.clock=new THREE.Clock();this.loop();
  },
  buildCinemaSystems(){
    [-6,0,6].forEach((x,i)=>{
      const r=new CinemaRoom(this.scene,this.engine,x,i);this.rooms.push(r);
      const door=new Door(this.engine,`porta_${i}`,x,-3.15,`Sala ${i+1}`);door.roomIndex=i;
      const sign=new THREE.Mesh(new THREE.BoxGeometry(1.8,.45,.08),new THREE.MeshStandardMaterial({color:0xd4af37}));sign.position.set(x,2.7,-3.05);this.scene.add(sign);
    });
    // Turnstiles between hall and corridor
    [-3,-1,1,3].forEach(x=>{
      const g=new THREE.Group();g.position.set(x,0,-.5);
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,1.25,12),new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.7}));
      const arm=new THREE.Mesh(new THREE.BoxGeometry(1.1,.08,.08),new THREE.MeshStandardMaterial({color:0xbfc5cc,metalness:.5}));arm.position.y=.72;g.add(post,arm);this.scene.add(g);
      const e={id:`catraca_${x}`,type:"Catraca",object3D:g,label:"LIBERAR CORREDOR",state:"FECHADA",handlePrimitive:(p)=>{
        if(p==="INTERAGIR"){const old=e.state;e.state="ABERTA";this.engine.event("VALIDAR",e.id,"passagem liberada",old,"ABERTA",{check:12});setTimeout(()=>e.state="FECHADA",1000);this.player.area="corridor";this.player.position.set(this.player.position.x,.55,-1.2);return true}return false;
      }};this.engine.register(e);
    });
    const bm=new Bathroom(this.engine,"banheiro_m", -6.2,-3.5,"BANHEIRO MASCULINO");
    const bf=new Bathroom(this.engine,"banheiro_f", 6.2,-3.5,"BANHEIRO FEMININO");
    const bomb={id:"bomboniere",type:"Bombonière",label:"BOMBONIÈRE",object3D:this.world.root.children.find(o=>o.name==="counter"),handlePrimitive:(p)=>{if(p==="INTERAGIR"){this.engine.event("COMPRAR","bomboniere","atendimento", "LIVRE","ATENDENDO",{check:14});return true}}};this.engine.register(bomb);
    for(let i=0;i<5;i++)this.npcs.push(new CinemaNPC(this.engine,"npc_"+i,(Math.random()-.5)*14,7-Math.random()*2));
  },
  bindJoystick(){
    const joy=document.getElementById("joystick"),stick=document.getElementById("stick");let active=false;
    const move=e=>{
      if(!active)return;const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      let dx=e.clientX-cx,dy=e.clientY-cy,max=42,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}
      stick.style.transform=`translate(${dx}px,${dy}px)`;this.player.joy.x=dx/max;this.player.joy.y=dy/max;
    };
    joy.onpointerdown=e=>{active=true;joy.setPointerCapture(e.pointerId);move(e)};
    joy.onpointermove=move;joy.onpointerup=()=>{active=false;stick.style.transform="translate(0,0)";this.player.joy.x=this.player.joy.y=0};
  },
  bindAction(){
    document.getElementById("actionButton").onclick=()=>{
      const t=this.perception.target;if(t)this.pickup.interact(t,{player:this.player});
      else if(this.player.area==="room")this.player.exitRoom();
    };
  },
  gesture(g){if(g==="TAP")G0Checklist.mark(34);if(g==="DRAG")G0Checklist.mark(35);if(g==="LONGPRESS")G0Checklist.mark(36)},
  update(dt){
    this.player.update(dt);
    this.perception.update();
    for(const n of this.npcs)n.update(dt);
    if(this.player.area==="room"){
      const exitDist=Math.abs(this.player.position.z+5.2);
      if(exitDist<1.1)this.hud.prompt.textContent="PORTA TRASEIRA · toque para sair";
    }
    this.env.update();this.hud.update(this.player,this.perception.target);
    const target=this.player.position.clone();target.y+=1.8;
    const camDesired=this.player.position.clone().add(new THREE.Vector3(0,6,9));
    this.camera.position.lerp(camDesired,.08);this.camera.lookAt(target);
  },
  loop(){requestAnimationFrame(()=>this.loop());const dt=Math.min(this.clock.getDelta(),.05);this.update(dt);this.renderer.render(this.scene,this.camera)},
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)}
};
g0Main.init();