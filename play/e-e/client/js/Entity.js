// Entity.js
// Unidade conceitual mínima da Gramática Zero: algo que existe, possui
// estado, e pode ter esse estado alterado. O motor não sabe o que a
// entidade "significa" — apenas que ela tem um id, um tipo e um estado.

export class Entity {
  constructor(id, type, initialState = {}) {
    this.id = id;
    this.type = type;
    this.state = { ...initialState };
    this.relations = [];
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    return this.state;
  }

  getState() {
    return this.state;
  }

  addRelation(relation) {
    this.relations.push(relation);
  }
}
