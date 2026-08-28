export class UI {
  constructor(game){
    this.game=game;
    this.panel=document.querySelector("#sidePanel");
    this.body=document.querySelector("#panelBody");
    this.title=document.querySelector("#panelTitle");
    this.prompt=document.querySelector("#prompt");
    this.toastEl=document.querySelector("#toast");
    this.state=document.querySelector("#stateLabel");
    document.querySelector("#menuBtn").onclick=()=>this.open("Mundo",this.worldMenu());
    document.querySelector("#closePanel").onclick=()=>this.close();
    document.querySelector("#inventoryBtn").onclick=()=>this.open("Mochila",this.inventory());
    document.querySelector("#actionBtn").onclick=()=>game.interact();
    document.querySelector("#registerBtn").onclick=()=>game.registerPlayer();
    document.querySelector("#bathSaveBtn").onclick=()=>game.completeBathroom();
    document.querySelector("#habitatBtn").onclick=()=>game.toggleHabitat();
  }
  open(title,html){this.title.textContent=title;this.body.innerHTML=html;this.panel.classList.add("open")}
  close(){this.panel.classList.remove("open")}
  worldMenu(){
    const p=this.game.player;
    return `<div class="card"><b>PLAYER</b><div class="muted">${p.name||"não registrado"} · ${p.age||"—"} anos · ${p.sign||"—"}</div></div>
      <div class="card"><b>PROGRESSO</b><div class="row"><span class="muted">desbloqueios</span><span class="pill">${this.game.unlocks.length}</span></div></div>
      <div class="card"><b>MUNDO</b><div class="muted">Totem → cadastro → banheiro → guichê → estandes → aquisição → saída para Habitat 0001.</div></div>
      <div class="card"><b>REGISTRO</b><div class="muted">Eventos: ${this.game.events.length}</div></div>`;
  }
  inventory(){
    const pet=this.game.pet;
    return `<div class="card"><b>MOCHILA</b><div class="muted">${pet?`Cria: <strong>${pet.name}</strong><br>espécie: ${pet.species}<br>estado: ${pet.state}`:"Nenhuma Cria adquirida ainda."}</div></div>
      <div class="card"><b>ACESSOS</b><div class="muted">Habitat 0001 ${this.game.pet?"· disponível":"· bloqueado"}</div></div>`;
  }
  showPrompt(text){this.prompt.textContent=text;this.prompt.classList.remove("hidden")}
  hidePrompt(){this.prompt.classList.add("hidden")}
  toast(html){this.toastEl.innerHTML=html;this.toastEl.classList.add("show");clearTimeout(this.t);this.t=setTimeout(()=>this.toastEl.classList.remove("show"),2200)}
  stateText(t){this.state.textContent=t}
  showRegister(){document.querySelector("#registerModal").classList.remove("hidden")}
  hideRegister(){document.querySelector("#registerModal").classList.add("hidden")}
  showBathroom(){document.querySelector("#bathModal").classList.remove("hidden")}
  hideBathroom(){document.querySelector("#bathModal").classList.add("hidden")}
}