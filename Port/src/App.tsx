import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BatteryCharging, CircleHelp,
  Coffee, Crosshair, Footprints, Gem, Magnet, MapPin, Navigation, Pause,
  Play, Radar, RotateCcw, ScanEye, ScrollText, ShieldAlert, Ticket, X, Zap,
  type LucideIcon,
} from "lucide-react";
import {
  GameEngine, INITIAL_SNAPSHOT, UPGRADE_KEYS, upgradePrice,
  type GameSnapshot, type MessageTone, type UpgradeKey,
} from "./game/GameEngine";

type Screen = "intro" | "playing" | "paused";
type Toast = { id: number; text: string; tone: MessageTone };

const upgradeDetails: Record<UpgradeKey, { name: string; description: string; icon: LucideIcon }> = {
  speed: { name: "Velocidade", description: "Movimento +12% por n\u00edvel", icon: Footprints },
  stamina: { name: "Estamina", description: "Mais f\u00f4lego para correr", icon: BatteryCharging },
  coffee: { name: "Cafe\u00edna", description: "Recupera energia mais r\u00e1pido", icon: Coffee },
  scanner: { name: "Olfato", description: "Detecta amea\u00e7as mais longe", icon: Radar },
  stealth: { name: "Disfarce", description: "Reduz o alcance da vis\u00e3o inimiga", icon: ScanEye },
  magnet: { name: "Magnetismo", description: "Atrai itens ao seu redor", icon: Magnet },
};

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? "brand-mark small" : "brand-mark"} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="42" height="42" rx="12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 13H32M22 13V31M12 31H28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="31" r="3.5" fill="currentColor" />
    </svg>
  );
}

function Intro({ onStart, onGuide }: { onStart: () => void; onGuide: () => void }) {
  return (
    <section className="intro-screen" aria-label="Tela inicial de Tic-Tac">
      <div className="intro-art" />
      <div className="intro-shade" />
      <header className="intro-header">
        <div className="intro-lockup">
          <BrandMark />
          <span><strong>TIC-TAC</strong><small>COLETA INFILTRADA</small></span>
        </div>
        <div className="intro-header-right">
          <span className="edition-label">UM JOGO DE EXPLORA&Ccedil;&Atilde;O E FUGA</span>
          <button className="text-link light" type="button" onClick={onGuide}>COMO JOGAR <ArrowUpRight size={15} strokeWidth={2} /></button>
        </div>
      </header>

      <main className="intro-main">
        <div className="intro-eyebrow"><span className="live-dot" /> MISS&Atilde;O 01 <span className="eyebrow-divider" /> SHOPPING C&Oacute;SMICO</div>
        <h1 className="intro-title">TIC<span>-</span>TAC<span className="title-period">.</span></h1>
        <div className="intro-title-rule" />
        <p className="intro-overline">COLETA INFILTRADA</p>
        <h2>O shopping &eacute; deles.<br /><em>A sucata &eacute; sua.</em></h2>
        <p className="intro-description">Explore corredores alien&iacute;genas, recolha Lixo C&oacute;smico e transforme cada descoberta em uma nova habilidade. Mas n&atilde;o deixe que vejam voc&ecirc;.</p>
        <div className="intro-actions">
          <button className="primary-button" type="button" onClick={onStart}>
            <span>ENTRAR NA ARENA</span><span className="button-icon"><ArrowUpRight size={21} strokeWidth={2.3} /></span>
          </button>
          <button className="intro-secondary" type="button" onClick={onGuide}><Play size={14} fill="currentColor" /> COMO FUNCIONA</button>
        </div>
      </main>

      <footer className="intro-footer">
        <div className="intro-footer-left"><span className="footer-index">ARQUIVO / TT-001</span><span>ENTRE. COLETE. EVOLUA. REPITA.</span></div>
        <div className="intro-controls"><span><b>W A S D</b> MOVER</span><i /><span><b>SHIFT</b> CORRER</span><i /><span><b>MOUSE</b> OLHAR</span></div>
      </footer>
      <span className="intro-side-label">SETOR 07 &nbsp;/&nbsp; TRANSMISS&Atilde;O ATIVA</span>
    </section>
  );
}

function Guide({ inGame, onClose, onStart }: { inGame: boolean; onClose: () => void; onStart: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div className="modal-topline"><span>MANUAL DE CAMPO <span className="slash">/</span> 001</span><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        <div className="guide-heading"><span className="guide-symbol"><Crosshair size={27} strokeWidth={1.5} /></span><h2 id="guide-title">Toda rota tem<br />uma recompensa<span>.</span></h2></div>
        <div className="guide-steps">
          <div><span className="step-number">01</span><div><h3>Explore e recolha</h3><p>Junte guardanapos, embalagens POC-POFT e n&uacute;cleos raros. Aproxime-se das lixeiras e pressione <b>E</b> ou toque em <b>Coletar</b>.</p></div><ArrowDownRight size={19} /></div>
          <div><span className="step-number">02</span><div><h3>N&atilde;o seja visto</h3><p>Desvie do campo de vis&atilde;o dos alien&iacute;genas. Plantas oferecem esconderijo; esferas brilhantes concedem poderes tempor&aacute;rios.</p></div><ArrowDownRight size={19} /></div>
          <div><span className="step-number">03</span><div><h3>Volte mais forte</h3><p>Leve a carga at&eacute; a base verde. Troque seus tickets e n&uacute;cleos por melhorias permanentes e comece outra rodada.</p></div><ArrowDownRight size={19} /></div>
        </div>
        <div className="guide-bottom"><span><b>WASD / JOYSTICK</b> mover</span><span><b>SHIFT / CORRER</b> acelerar</span><span><b>ARRASTE</b> olhar</span><span><b>E / BOT&Atilde;O</b> interagir</span></div>
        <button className="primary-button guide-button" type="button" onClick={inGame ? onClose : onStart}><span>{inGame ? "VOLTAR PARA A ARENA" : "ENTENDI, VAMOS JOGAR"}</span><span className="button-icon"><ArrowRight size={20} /></span></button>
      </section>
    </div>
  );
}

function PauseMenu({ snapshot, onResume, onRestart }: { snapshot: GameSnapshot; onResume: () => void; onRestart: () => void }) {
  return (
    <div className="modal-backdrop pause-backdrop">
      <section className="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <span className="pause-kicker">TRANSMISS&Atilde;O INTERROMPIDA <span className="pause-lines">//</span> RODADA {String(snapshot.wave).padStart(2, "0")}</span>
        <h2 id="pause-title">Pausa para<br /><em>respirar.</em></h2>
        <p>O shopping continua aqui quando voc&ecirc; voltar.</p>
        <button className="primary-button pause-resume" type="button" onClick={onResume}><span>VOLTAR AO JOGO</span><span className="button-icon"><Play size={18} fill="currentColor" /></span></button>
        <button className="restart-button" type="button" onClick={onRestart}><RotateCcw size={16} /> REINICIAR PARTIDA</button>
      </section>
    </div>
  );
}

function Shop({ snapshot, onClose, onBuy, onNextWave }: { snapshot: GameSnapshot; onClose: () => void; onBuy: (key: UpgradeKey) => void; onNextWave: () => void }) {
  return (
    <aside className="shop-panel" aria-label="Base secreta e melhorias">
      <div className="shop-top"><span><span className="shop-online-dot" /> TERMINAL DE EVOLU&Ccedil;&Atilde;O</span><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar loja"><X size={20} /></button></div>
      <h2>Base<br /><em>secreta.</em></h2>
      <p className="shop-description">Sua coleta vira uma vantagem na pr&oacute;xima incurs&atilde;o.</p>
      <div className="shop-wallet"><div><Ticket size={17} /><span>TICKETS</span><strong>{snapshot.tickets}</strong></div><span className="wallet-separator" /><div><Gem size={17} /><span>N&Uacute;CLEOS</span><strong>{snapshot.cores}</strong></div></div>
      <div className="shop-section-label"><span>MELHORIAS PERMANENTES</span><span>PRE&Ccedil;O</span></div>
      <div className="upgrade-list">
        {UPGRADE_KEYS.map((key) => {
          const meta = upgradeDetails[key];
          const Icon = meta.icon;
          const level = snapshot.upgrades[key];
          const price = upgradePrice(key, level);
          const affordable = snapshot.tickets >= price.tickets && snapshot.cores >= price.cores;
          return (
            <button className={`upgrade-row ${affordable ? "affordable" : ""}`} key={key} type="button" onClick={() => onBuy(key)} disabled={!affordable} title={affordable ? `Comprar ${meta.name}` : "Recursos insuficientes"}>
              <span className="upgrade-icon"><Icon size={20} strokeWidth={1.8} /></span>
              <span className="upgrade-copy"><span>{meta.name} <small>NV. {String(level).padStart(2, "0")}</small></span><em>{meta.description}</em></span>
              <span className="upgrade-price"><span>{price.tickets}<Ticket size={13} /></span>{price.cores > 0 && <span>{price.cores}<Gem size={13} /></span>}</span>
              <span className="upgrade-plus">+</span>
            </button>
          );
        })}
      </div>
      {snapshot.roundReady ? (
        <button className="next-wave" type="button" onClick={onNextWave}><span>INICIAR RODADA {String(snapshot.wave + 1).padStart(2, "0")}</span><ArrowRight size={19} /></button>
      ) : (
        <p className="shop-footer-note"><MapPin size={14} /> {snapshot.binsLeft} ponto{snapshot.binsLeft !== 1 ? "s" : ""} de coleta ainda na arena</p>
      )}
    </aside>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const move = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const dx = clientX - rect.left - rect.width / 2;
    const dy = clientY - rect.top - rect.height / 2;
    const radius = rect.width * 0.33;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    setOffset({ x, y });
    onChange(x / radius, y / radius);
  };

  const release = (pointerId: number) => {
    if (pointerRef.current !== pointerId) return;
    pointerRef.current = null;
    setOffset({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div className="joystick" ref={baseRef} role="group" aria-label="Controle de movimento"
      onPointerDown={(event) => { event.preventDefault(); pointerRef.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); move(event.clientX, event.clientY); }}
      onPointerMove={(event) => { if (pointerRef.current === event.pointerId) move(event.clientX, event.clientY); }}
      onPointerUp={(event) => release(event.pointerId)} onPointerCancel={(event) => release(event.pointerId)}>
      <span className="joystick-cross">+</span><span className="joystick-knob" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} />
    </div>
  );
}

function GameHud({
  snapshot, toast, shopOpen, onPause, onGuide, onInteract, onOpenShop, onCloseShop, onBuy, onNextWave, onMove, onRun,
}: {
  snapshot: GameSnapshot;
  toast: Toast | null;
  shopOpen: boolean;
  onPause: () => void;
  onGuide: () => void;
  onInteract: () => void;
  onOpenShop: () => void;
  onCloseShop: () => void;
  onBuy: (key: UpgradeKey) => void;
  onNextWave: () => void;
  onMove: (x: number, y: number) => void;
  onRun: (running: boolean) => void;
}) {
  return (
    <div className={`game-hud ${snapshot.alerted ? "is-alerted" : ""} ${shopOpen ? "shop-is-open" : ""}`}>
      <div className="alert-vignette" aria-hidden="true" />
      <header className="game-topbar">
        <div className="game-brand"><BrandMark small /><span><strong>TIC-TAC</strong><small>COLETA INFILTRADA</small></span></div>
        <div className="mission-progress"><span className="mission-kicker">OBJETIVO DA RODADA {String(snapshot.wave).padStart(2, "0")}</span><span className="mission-title">{snapshot.roundReady ? "Volte \u00e0 base. A pr\u00f3xima rodada espera." : "Recolha os pontos de descarte"}</span><div className="mission-track"><span style={{ width: `${(snapshot.binsTotal - snapshot.binsLeft) / snapshot.binsTotal * 100}%` }} /></div></div>
        <div className="top-actions"><span className="wave-label">RODADA <strong>{String(snapshot.wave).padStart(2, "0")}</strong></span><button className="hud-icon-button help-button" type="button" onClick={onGuide} aria-label="Como jogar"><CircleHelp size={20} /></button><button className="hud-icon-button" type="button" onClick={onPause} aria-label="Pausar jogo"><Pause size={19} fill="currentColor" /></button></div>
      </header>

      <div className="inventory-panel">
        <div className="hud-section-heading"><span>MOCHILA <b>/</b> CARGA ATUAL</span><span className="inventory-indicator" /></div>
        <div className="inventory-resources">
          <div><span className="resource-icon paper"><ScrollText size={18} /></span><strong>{String(snapshot.napkins).padStart(2, "0")}</strong><small>GUARDANAPOS</small></div>
          <div><span className="resource-icon package"><Coffee size={18} /></span><strong>{String(snapshot.packs).padStart(2, "0")}</strong><small>POC-POFT</small></div>
          <div><span className="resource-icon crystal"><Gem size={18} /></span><strong>{String(snapshot.carriedCores).padStart(2, "0")}</strong><small>N&Uacute;CLEOS</small></div>
        </div>
        <div className="inventory-bottom"><Ticket size={17} /><span>TICKETS NA BASE</span><strong>{snapshot.tickets}</strong></div>
      </div>

      <div className="world-counter"><span className="counter-dot" /><span>{snapshot.binsLeft} / {snapshot.binsTotal}</span><small>PONTOS RESTANTES</small></div>

      <div className="scanner-panel">
        <div className="scanner-label">LOCALIZADOR <span>// BASE</span></div>
        <div className="scanner-main"><span className="scanner-arrow" style={{ transform: `rotate(${snapshot.baseBearing}deg)` }}><Navigation size={26} fill="currentColor" strokeWidth={1.5} /></span><span><strong>{snapshot.baseDistance} <small>m</small></strong><em>BASE SEGURA</em></span></div>
        <div className={`threat-reading ${snapshot.alerted ? "danger" : ""}`}><span className="threat-pulse" /><span>{snapshot.alerted ? "VOC\u00ca FOI VISTO" : snapshot.threatDistance !== null ? `RASTRO A ${snapshot.threatDistance} M` : "SEM RASTROS PR\u00d3XIMOS"}</span><ShieldAlert size={15} /></div>
      </div>

      <div className="stamina-panel"><div className="stamina-title"><span><Zap size={15} fill="currentColor" /> ENERGIA</span><span>{Math.round(snapshot.stamina / snapshot.maxStamina * 100)}%</span></div><div className="stamina-track"><span style={{ width: `${snapshot.stamina / snapshot.maxStamina * 100}%` }} /></div><small>SEGURE SHIFT PARA CORRER</small></div>
      {snapshot.effects.length > 0 && <div className="active-effects"><span>PODER ATIVO</span>{snapshot.effects.map((effect) => <strong className={`effect-${effect.color}`} key={effect.name}>{effect.name} <b>{Math.ceil(effect.time)}s</b></strong>)}</div>}

      {toast && <div className={`game-toast toast-${toast.tone}`} key={toast.id}><span className="toast-dot" />{toast.text}</div>}

      {snapshot.interaction && <button className="interaction-button" type="button" onClick={onInteract}><span className="key-hint">E</span><span>{snapshot.interaction}</span><ArrowRight size={18} /></button>}
      {snapshot.nearBase && !shopOpen && <button className="open-shop-button" type="button" onClick={onOpenShop}><Zap size={17} /> ABRIR MELHORIAS <ArrowRight size={16} /></button>}

      <div className="desktop-tip"><span>WASD <b>MOVER</b></span><i /><span>SHIFT <b>CORRER</b></span><i /><span>ARRASTE <b>OLHAR</b></span><i /><span>E <b>INTERAGIR</b></span></div>

      <div className="mobile-controls"><Joystick onChange={onMove} /><button className="run-button" type="button" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onRun(true); }} onPointerUp={() => onRun(false)} onPointerCancel={() => onRun(false)}><Footprints size={22} /> CORRER</button></div>

      {shopOpen && <Shop snapshot={snapshot} onClose={onCloseShop} onBuy={onBuy} onNextWave={onNextWave} />}
    </div>
  );
}

export default function App() {
  const arenaRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastCount = useRef(0);
  const [screen, setScreen] = useState<Screen>("intro");
  const [guideOpen, setGuideOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [toast, setToast] = useState<Toast | null>(null);
  const [shopDismissed, setShopDismissed] = useState(false);

  const createEngine = () => {
    if (!arenaRef.current || engineRef.current) return;
    engineRef.current = new GameEngine(
      arenaRef.current,
      setSnapshot,
      (text, tone) => {
        setToast({ id: ++toastCount.current, text, tone });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3300);
      },
      () => { engineRef.current?.setPaused(true); setScreen("paused"); },
    );
  };

  useEffect(() => () => {
    engineRef.current?.destroy();
    engineRef.current = null;
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => { if (!snapshot.nearBase) setShopDismissed(false); }, [snapshot.nearBase]);

  const start = () => { createEngine(); engineRef.current?.start(); setGuideOpen(false); setScreen("playing"); };
  const pause = () => { engineRef.current?.setPaused(true); setScreen("paused"); };
  const resume = () => { engineRef.current?.setPaused(false); setScreen("playing"); };
  const restart = () => { engineRef.current?.reset(); setShopDismissed(false); setGuideOpen(false); setScreen("playing"); };
  const openGuide = () => { if (screen === "playing") engineRef.current?.setPaused(true); setGuideOpen(true); };
  const closeGuide = () => { setGuideOpen(false); if (screen === "playing") engineRef.current?.setPaused(false); };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.code !== "Escape") return;
      if (guideOpen) closeGuide();
      else if (screen === "paused") resume();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [guideOpen, screen]);

  const shopOpen = screen === "playing" && snapshot.nearBase && !shopDismissed && !guideOpen;

  return (
    <div className="app-shell">
      <div className="game-stage" ref={arenaRef} />
      {screen !== "intro" && <GameHud
        snapshot={snapshot}
        toast={toast}
        shopOpen={shopOpen}
        onPause={pause}
        onGuide={openGuide}
        onInteract={() => engineRef.current?.interact()}
        onOpenShop={() => setShopDismissed(false)}
        onCloseShop={() => setShopDismissed(true)}
        onBuy={(key) => engineRef.current?.buyUpgrade(key)}
        onNextWave={() => { engineRef.current?.nextWave(); setShopDismissed(true); }}
        onMove={(x, y) => engineRef.current?.setJoystick(x, y)}
        onRun={(running) => engineRef.current?.setRunning(running)}
      />}
      {screen === "intro" && <Intro onStart={start} onGuide={openGuide} />}
      {screen === "paused" && !guideOpen && <PauseMenu snapshot={snapshot} onResume={resume} onRestart={restart} />}
      {guideOpen && <Guide inGame={screen !== "intro"} onClose={closeGuide} onStart={start} />}
    </div>
  );
}