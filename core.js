/* ═══════════════════════════════════════════════════
   ZYROLOG — CORE.JS
   Núcleo de estado compartilhado entre TODOS os pontos
   de interesse (Cartório, Barbearia, Sk8, Pizzaria, etc).
   Persistência via localStorage — funciona 100% estático,
   sem backend, pronto para GitHub Pages.
   ═══════════════════════════════════════════════════ */

const ZyroCore = (function () {
  const STORE_KEY = 'zyrolog_core_v1';

  const DEFAULT_STATE = {
    player: {
      created: false,
      name: '',
      role: '',        // dm | mb | jx | visitante
      avatar: '🧑',
      hair: null,
      color: '#D4AF37',
      zone: 'Pirapora do Bom Jesus',
      hash: '',
    },
    wallet: {
      connected: false,   // já passou pelo tutorial da Wallet of Satoshi
      sats: 0,
    },
    xp: {
      total: 0,
    },
    missions: {
      completed: [],       // array de ids de missão/tarefa já concluídas
      couponsDistributed: 0,
    },
    achievements: [],       // array de badges conquistadas {id, name, icon, date}
    inventory: {
      skateGear: [],
      hairstyle: null,
    },
    visited: [],             // ids de POIs já visitados (para lore/exploração)
    meta: {
      createdAt: null,
      lastSeen: null,
    },
  };

  // Clone manual — mais compatível que structuredClone (ausente em
  // WebViews antigas, ex: navegador interno de Instagram/WhatsApp).
  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (e) { return {}; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // merge raso pra garantir que campos novos do DEFAULT_STATE existam
      return deepMerge(clone(DEFAULT_STATE), parsed);
    } catch (e) {
      console.warn('[ZyroCore] Falha ao carregar estado, resetando.', e);
      return clone(DEFAULT_STATE);
    }
  }

  function deepMerge(base, override) {
    for (const k in override) {
      if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])) {
        base[k] = deepMerge(base[k] || {}, override[k]);
      } else {
        base[k] = override[k];
      }
    }
    return base;
  }

  let state = load();
  if (!state.meta.createdAt) state.meta.createdAt = Date.now();
  state.meta.lastSeen = Date.now();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('[ZyroCore] Não foi possível salvar (localStorage bloqueado). O progresso vale só para esta sessão.', e); }
  }

  function simpleHash(s) {
    let h = 0xdeadbeef;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return ((h ^ (h >>> 16)) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  function level(xpTotal) {
    // curva simples: 100xp por nível, crescendo levemente
    let lvl = 1, need = 100, acc = 0;
    while (xpTotal >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.15); }
    return { level: lvl, into: xpTotal - acc, need, pct: Math.min(100, Math.round(((xpTotal - acc) / need) * 100)) };
  }

  return {
    // ── PLAYER ──
    getPlayer() { return state.player; },
    hasCharacter() { return !!state.player.created; },
    createPlayer({ name, role, avatar, zone }) {
      state.player.created = true;
      state.player.name = name;
      state.player.role = role || state.player.role;
      state.player.avatar = avatar || state.player.avatar;
      state.player.zone = zone || state.player.zone;
      state.player.hash = simpleHash(name + role + Date.now());
      save();
      return state.player;
    },
    updateAppearance({ avatar, hair, color }) {
      if (avatar) state.player.avatar = avatar;
      if (hair !== undefined) state.player.hair = hair;
      if (color) state.player.color = color;
      save();
      return state.player;
    },

    // ── WALLET / SATS ──
    getSats() { return state.wallet.sats; },
    isWalletConnected() { return state.wallet.connected; },
    connectWallet() { state.wallet.connected = true; save(); },
    addSats(amount) { state.wallet.sats += amount; save(); return state.wallet.sats; },
    spendSats(amount) {
      if (state.wallet.sats < amount) return false;
      state.wallet.sats -= amount; save(); return true;
    },

    // ── XP / LEVEL ──
    getXP() { return state.xp.total; },
    addXP(amount) { state.xp.total += amount; save(); return state.xp.total; },
    getLevel() { return level(state.xp.total); },

    // ── MISSÕES / TAREFAS ──
    isMissionDone(id) { return state.missions.completed.includes(id); },
    completeMission(id, { xp = 0, sats = 0 } = {}) {
      if (this.isMissionDone(id)) return false;
      state.missions.completed.push(id);
      if (xp) this.addXP(xp);
      if (sats) this.addSats(sats);
      save();
      return true;
    },
    incrementCoupons(n = 1) { state.missions.couponsDistributed += n; save(); return state.missions.couponsDistributed; },
    getCoupons() { return state.missions.couponsDistributed; },

    // ── ACHIEVEMENTS ──
    unlockAchievement(id, name, icon = '🏅') {
      if (state.achievements.find(a => a.id === id)) return false;
      state.achievements.push({ id, name, icon, date: Date.now() });
      save();
      return true;
    },
    getAchievements() { return state.achievements; },

    // ── INVENTÁRIO ──
    equipGear(item) {
      if (!state.inventory.skateGear.includes(item)) state.inventory.skateGear.push(item);
      save();
    },
    getGear() { return state.inventory.skateGear; },

    // ── VISITADOS (lore/exploração) ──
    markVisited(poiId) {
      if (!state.visited.includes(poiId)) { state.visited.push(poiId); save(); }
    },
    hasVisited(poiId) { return state.visited.includes(poiId); },
    getVisitedCount() { return state.visited.length; },

    // ── UTIL ──
    reset() { state = clone(DEFAULT_STATE); state.meta.createdAt = Date.now(); save(); },
    raw() { return state; },
    save,
  };
})();

/* ═══════════════════════════════════════════════════
   TOAST GLOBAL — usa a div #toast (definida em shared.css)
   ═══════════════════════════════════════════════════ */
let __toastTimer;
function zToast(msg, type = '') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `vis ${type}`;
  if (navigator.vibrate) navigator.vibrate(30);
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

/* ═══════════════════════════════════════════════════
   HEADER STAT PILLS — atualiza sats/xp no header, se existir
   ═══════════════════════════════════════════════════ */
function zRefreshStatPills() {
  const satEl = document.getElementById('pill-sat');
  const xpEl = document.getElementById('pill-xp');
  if (satEl) satEl.textContent = ZyroCore.getSats();
  if (xpEl) xpEl.textContent = ZyroCore.getXP();
}
document.addEventListener('DOMContentLoaded', zRefreshStatPills);
