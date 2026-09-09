// main.js
// Ponto de entrada. Monta a cena Three.js, instancia cada camada
// (World, Renderer, Network, Input, Game, UI) e conecta o formulário de
// lobby ao fluxo de conexão.

import * as THREE from 'three';
import { World } from './World.js';
import { PlayerRenderer } from './Renderer.js';
import { Network } from './Network.js';
import { Game } from './Game.js';
import { UI } from './UI.js';
import { Joystick } from './Joystick.js';
import { CameraController } from './Camera.js';
import { Input } from './Input.js';

// --- descoberta do endereço do servidor -----------------------------
// Em produção, troque pelo domínio do seu Worker publicado, ex:
//   const SERVER_HOST = 'esconde-esconde-g0.SEU-SUBDOMINIO.workers.dev';
// Em desenvolvimento local com `wrangler dev`, o próprio host da página
// já aponta para o worker, então isso funciona sem alterar nada.
const SERVER_HOST = window.__ESCONDE_ESCONDE_SERVER__ || window.location.host;
const PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws';

function wsUrlFor(roomCode) {
  return `${PROTOCOL}://${SERVER_HOST}/room?code=${encodeURIComponent(roomCode)}`;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `ZERO-${code}`;
}

// --- cena Three.js -----------------------------------------------------
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer3d = new THREE.WebGLRenderer({ antialias: true });
renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer3d.setSize(window.innerWidth, window.innerHeight);
renderer3d.shadowMap.enabled = true;
container.appendChild(renderer3d.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer3d.setSize(window.innerWidth, window.innerHeight);
});

// --- camadas do jogo -----------------------------------------------------
const world = new World(scene);
const playerRenderer = new PlayerRenderer(scene);
const network = new Network();
const ui = new UI();

const joystick = new Joystick(ui.joystickZone);
const cameraController = new CameraController(ui.cameraZone, camera);
const input = new Input(joystick, cameraController);

const game = new Game({
  world,
  renderer: playerRenderer,
  network,
  ui,
  input,
  cameraController,
});

// --- fluxo de lobby -----------------------------------------------------
ui.onCreateRoom(async (name) => {
  const code = generateRoomCode();
  ui.showRoomCode(code);
  await joinRoom(name, code);
});

ui.onJoinRoom(async (name, code) => {
  if (!code) {
    ui.setLobbyStatus('Digite o código da sala.', true);
    return;
  }
  await joinRoom(name, code);
});

async function joinRoom(name, code) {
  ui.setLobbyBusy(true);
  ui.setLobbyStatus('Conectando…');
  try {
    await game.connect(wsUrlFor(code), { name, roomCode: code });
    ui.setLobbyStatus('');
    ui.enterGame();
  } catch (err) {
    ui.setLobbyStatus(err.message || 'Não foi possível entrar na sala.', true);
    ui.setLobbyBusy(false);
  }
}

// --- loop principal -----------------------------------------------------
let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  game.update(dt);
  renderer3d.render(scene, camera);
}
requestAnimationFrame(animate);
