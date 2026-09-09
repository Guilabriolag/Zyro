// Input.js
// Fluxo: TOQUE -> JOYSTICK -> intenção de movimento -> (Game aplica ao
// estado do jogador). O movimento é relativo à orientação da câmera, para
// que "empurrar para frente" sempre signifique "para onde estou olhando".

export class Input {
  constructor(joystick, cameraController) {
    this.joystick = joystick;
    this.cameraController = cameraController;
  }

  getMovementIntent() {
    const v = this.joystick.getValue();
    if (v.x === 0 && v.y === 0) return { x: 0, z: 0 };

    const yaw = this.cameraController.yaw;
    const forward = -v.y; // arrastar para cima = andar para frente
    const strafe = v.x;

    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    return {
      x: strafe * cos + forward * sin,
      z: -strafe * sin + forward * cos,
    };
  }
}
