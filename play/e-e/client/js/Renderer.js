// Renderer.js
// Interpreta estado -> representação visual. Não decide regras de jogo:
// só sabe desenhar o que o State descreve (posição, rotação, situação).
//
//   estado.posicao      -> mesh.position
//   estado.rotacao      -> mesh.rotation
//   estado.situacao     -> visibilidade / cor (ex: "encontrado")

import * as THREE from 'three';

export class PlayerRenderer {
  constructor(scene) {
    this.scene = scene;
    this.meshes = new Map();
  }

  ensure(id, { isLocal = false } = {}) {
    if (this.meshes.has(id)) return this.meshes.get(id);

    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.38, 0.85, 4, 10);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isLocal ? 0x4fc3f7 : 0xff8a65,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.78;
    body.castShadow = true;
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.12, 0.28, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.95, 0.34);
    group.add(nose);

    this.scene.add(group);
    this.meshes.set(id, { group, body, bodyMat });
    return this.meshes.get(id);
  }

  update(id, posicao, rotacao, situacao) {
    const entry = this.meshes.get(id);
    if (!entry) return;
    entry.group.position.set(posicao.x, posicao.y, posicao.z);
    if (rotacao) entry.group.rotation.y = rotacao.y || 0;

    if (situacao === 'encontrado') {
      entry.bodyMat.color.setHex(0xd9694f);
      entry.bodyMat.emissive?.setHex?.(0x3a1810);
    }
  }

  remove(id) {
    const entry = this.meshes.get(id);
    if (!entry) return;
    this.scene.remove(entry.group);
    this.meshes.delete(id);
  }

  hide(id) {
    const entry = this.meshes.get(id);
    if (entry) entry.group.visible = false;
  }

  show(id) {
    const entry = this.meshes.get(id);
    if (entry) entry.group.visible = true;
  }

  has(id) {
    return this.meshes.has(id);
  }
}
