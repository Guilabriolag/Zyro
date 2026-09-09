// Joystick.js
// Joystick virtual touch-friendly. Só produz um valor { x, y } de -1..1.
// Não sabe nada sobre movimento de jogador — isso é responsabilidade do
// Input, que traduz esse valor em uma intenção de movimento no mundo.

export class Joystick {
  constructor(container) {
    this.container = container;
    this.radius = 44;
    this.deadZone = 0.12;
    this.value = { x: 0, y: 0 };
    this.touchId = null;
    this.origin = { x: 0, y: 0 };

    this.base = document.createElement('div');
    this.base.className = 'joystick-base';
    this.knob = document.createElement('div');
    this.knob.className = 'joystick-knob';
    this.base.appendChild(this.knob);
    container.appendChild(this.base);

    container.addEventListener('touchstart', (e) => this._start(e), { passive: false });
    container.addEventListener('touchmove', (e) => this._move(e), { passive: false });
    container.addEventListener('touchend', (e) => this._end(e), { passive: false });
    container.addEventListener('touchcancel', (e) => this._end(e), { passive: false });
  }

  _start(e) {
    if (this.touchId !== null) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    const rect = this.base.getBoundingClientRect();
    this.origin.x = rect.left + rect.width / 2;
    this.origin.y = rect.top + rect.height / 2;
  }

  _move(e) {
    if (this.touchId === null) return;
    const t = [...e.changedTouches].find((t) => t.identifier === this.touchId);
    if (!t) return;
    e.preventDefault();

    let dx = t.clientX - this.origin.x;
    let dy = t.clientY - this.origin.y;
    const dist = Math.min(Math.hypot(dx, dy), this.radius);
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * dist;
    dy = Math.sin(angle) * dist;

    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;

    let nx = dx / this.radius;
    let ny = dy / this.radius;
    if (Math.hypot(nx, ny) < this.deadZone) {
      nx = 0;
      ny = 0;
    }
    this.value.x = nx;
    this.value.y = ny;
  }

  _end(e) {
    const stillDown = [...e.touches].some((t) => t.identifier === this.touchId);
    if (stillDown) return;
    this.touchId = null;
    this.value.x = 0;
    this.value.y = 0;
    this.knob.style.transform = 'translate(0px, 0px)';
  }

  getValue() {
    return this.value;
  }
}
