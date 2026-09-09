// World.js
// Representa o território local: terreno, obstáculos, iluminação.
// Não conhece rede, papéis de jogo ou regras — apenas o espaço físico
// onde as entidades existem.

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { OBSTACLE_LAYOUT } from './WorldRules.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.entities = new Map();
    this._buildLighting();
    this._buildTerrain();
    this._buildObstacles();
  }

  _buildLighting() {
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x1c2b1c, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffedc2, 1.05);
    sun.position.set(10, 16, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);

    this.scene.fog = new THREE.Fog(0x0d1210, 18, 42);
  }

  _buildTerrain() {
    const geo = new THREE.PlaneGeometry(44, 44, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c3a2b, roughness: 1 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // muro invisível de referência visual (borda da arena)
    const edgeGeo = new THREE.RingGeometry(20.5, 21, 48);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x4a5c46, side: THREE.DoubleSide });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.01;
    this.scene.add(edge);
  }

  _buildObstacles() {
    OBSTACLE_LAYOUT.forEach((o, i) => {
      const geo = new THREE.BoxGeometry(o.w, o.h, o.w);
      const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(o.x, o.h / 2, o.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const entity = new Entity(`obstacle_${i}`, 'obstaculo', {
        posicao: { x: o.x, y: o.h / 2, z: o.z },
        tamanho: { w: o.w, h: o.h },
      });
      this.entities.set(entity.id, entity);
    });
  }

  addEntity(entity) {
    this.entities.set(entity.id, entity);
  }

  removeEntity(id) {
    this.entities.delete(id);
  }

  getEntity(id) {
    return this.entities.get(id);
  }

  getObstacles() {
    return [...this.entities.values()].filter((e) => e.type === 'obstaculo');
  }
}
