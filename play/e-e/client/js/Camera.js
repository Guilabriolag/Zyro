// Camera.js
// Controle de câmera em terceira pessoa por arraste de toque (lado direito
// da tela). Não depende de mouse. Mantém yaw/pitch e reposiciona a câmera
// em torno de um alvo (o jogador local) a cada frame.

export class CameraController {
  constructor(container, camera) {
    this.camera = camera;
    this.yaw = Math.PI;
    this.pitch = -0.28;
    this.distance = 6.5;
    this.touchId = null;
    this.last = { x: 0, y: 0 };

    container.addEventListener('touchstart', (e) => this._start(e), { passive: false });
    container.addEventListener('touchmove', (e) => this._move(e), { passive: false });
    container.addEventListener('touchend', (e) => this._end(e), { passive: false });
    container.addEventListener('touchcancel', (e) => this._end(e), { passive: false });
  }

  _start(e) {
    if (this.touchId !== null) return;
    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    this.last.x = t.clientX;
    this.last.y = t.clientY;
  }

  _move(e) {
    const t = [...e.changedTouches].find((t) => t.identifier === this.touchId);
    if (!t) return;
    e.preventDefault();
    const dx = t.clientX - this.last.x;
    const dy = t.clientY - this.last.y;
    this.last.x = t.clientX;
    this.last.y = t.clientY;
    this.yaw -= dx * 0.006;
    this.pitch = Math.max(-0.85, Math.min(0.35, this.pitch - dy * 0.006));
  }

  _end(e) {
    const stillDown = [...e.touches].some((t) => t.identifier === this.touchId);
    if (!stillDown) this.touchId = null;
  }

  updateTarget(targetPos) {
    const x = targetPos.x + this.distance * Math.cos(this.pitch) * Math.sin(this.yaw);
    const z = targetPos.z + this.distance * Math.cos(this.pitch) * Math.cos(this.yaw);
    const y = targetPos.y + 1.5 + this.distance * Math.sin(-this.pitch);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(targetPos.x, targetPos.y + 1.0, targetPos.z);
  }
}
