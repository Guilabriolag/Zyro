// UI.js
// Toda a manipulação de DOM do jogo (lobby, HUD, banners) fica isolada
// aqui. Game.js chama métodos como ui.setPhaseBanner(...) e não toca
// em document.* diretamente.

const PHASE_LABELS = {
  lobby: 'Aguardando jogadores…',
  prep: 'Prepare-se',
  hide: 'Escolha um lugar',
  seek: 'Começou! Encontre o outro jogador',
  result: 'Rodada encerrada',
};

export class UI {
  constructor() {
    this.lobby = document.getElementById('lobby');
    this.nameInput = document.getElementById('name-input');
    this.codeInput = document.getElementById('code-input');
    this.btnCreate = document.getElementById('btn-create');
    this.btnJoin = document.getElementById('btn-join');
    this.lobbyStatus = document.getElementById('lobby-status');
    this.roomCodeDisplay = document.getElementById('room-code-display');

    this.hud = document.getElementById('hud');
    this.rolePill = document.getElementById('role-pill');
    this.timerPill = document.getElementById('timer-pill');
    this.playersPanel = document.getElementById('players-panel');
    this.banner = document.getElementById('banner');
    this.result = document.getElementById('result');
    this.resultMessage = document.getElementById('result-message');

    this.joystickZone = document.getElementById('joystick-zone');
    this.cameraZone = document.getElementById('camera-zone');
  }

  onCreateRoom(cb) {
    this.btnCreate.addEventListener('click', () => cb(this._name()));
  }

  onJoinRoom(cb) {
    this.btnJoin.addEventListener('click', () => cb(this._name(), this.codeInput.value.trim().toUpperCase()));
  }

  _name() {
    return this.nameInput.value.trim().slice(0, 16) || 'Jogador';
  }

  setLobbyBusy(busy) {
    this.btnCreate.disabled = busy;
    this.btnJoin.disabled = busy;
  }

  setLobbyStatus(message, isError = false) {
    this.lobbyStatus.textContent = message || '';
    this.lobbyStatus.classList.toggle('error', isError);
  }

  showRoomCode(code) {
    this.roomCodeDisplay.textContent = `Código da sala: ${code}`;
  }

  enterGame() {
    this.lobby.classList.add('hidden');
    this.hud.classList.add('active');
  }

  backToLobby() {
    this.lobby.classList.remove('hidden');
    this.hud.classList.remove('active');
    this.setLobbyBusy(false);
  }

  setRole(role) {
    if (role === 'esconde') {
      this.rolePill.textContent = 'Você está ESCONDENDO';
      this.rolePill.className = 'pill role-esconde';
    } else if (role === 'procura') {
      this.rolePill.textContent = 'Você está PROCURANDO';
      this.rolePill.className = 'pill role-procura';
    } else {
      this.rolePill.textContent = 'Aguardando papéis…';
      this.rolePill.className = 'pill';
    }
  }

  setTimer(seconds) {
    this.timerPill.textContent = seconds > 0 ? `${seconds}s` : '--';
  }

  setPlayersCount(count) {
    this.playersPanel.textContent = `Jogadores: ${count}`;
  }

  setPhaseBanner(phase) {
    this.banner.textContent = PHASE_LABELS[phase] || '';
    this.banner.classList.toggle('hidden', !PHASE_LABELS[phase] || phase === 'result');
  }

  showResult(message) {
    this.resultMessage.textContent = message;
    this.result.classList.add('active');
  }

  hideResult() {
    this.result.classList.remove('active');
  }
}
