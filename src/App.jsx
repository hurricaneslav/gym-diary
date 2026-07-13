import { useState, useEffect, useCallback, useRef } from "react";
import { api, API_URL, BOT_USERNAME } from "./api.js";

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso) => { try { const [y,m,d]=iso.split("-"); return `${d}.${m}.${y}`; } catch { return iso; } };

// Есть ли в черновике тренировки/замера реально внесённые данные (не просто
// пустая заготовка) — используется при предупреждении о переключении профиля.
const workoutDraftHasData = (exercises=[]) => {
  const hasData=s=>s.bilateral?(s.weightL||s.repsL||s.weightR||s.repsR):(s.weight||s.reps);
  return exercises.some(e=>e.sets?.some(hasData));
};
const measurementDraftHasData = (vals={}) => Object.values(vals).some(v=>v!==""&&v!=null);

const MEASUREMENT_FIELDS = [
  {key:"weight",label:"Вес тела"},{key:"waist",label:"Талия"},{key:"chest",label:"Грудь"},
  {key:"shoulders",label:"Плечи"},{key:"armRight",label:"Правая рука"},{key:"armLeft",label:"Левая рука"},
  {key:"forearmRight",label:"Правое предплечье"},{key:"forearmLeft",label:"Левое предплечье"},
  {key:"glutes",label:"Ягодицы"},{key:"quadRight",label:"Правый квадрицепс"},{key:"quadLeft",label:"Левый квадрицепс"},
  {key:"calfRight",label:"Правая икра"},{key:"calfLeft",label:"Левая икра"},
];

const IconPlus = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 7.5h3l.5-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconChevron = ({dir="right"}) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{transform:dir==="left"?"rotate(180deg)":""}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const IconBilateral = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M6.5 2v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="2.5" cy="6.5" r="1.5" fill="currentColor" opacity=".7"/><circle cx="10.5" cy="6.5" r="1.5" fill="currentColor" opacity=".7"/></svg>;
const IconClose = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const IconMinimize = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 8.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const IconLink = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M6 8l2-2M5 9.5L3.5 11A2 2 0 111 8.5L2.5 7M9 5l1.5-1.5A2 2 0 1113 6L11.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0A;color:#FFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;-webkit-font-smoothing:antialiased}
.app-frame{max-width:390px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:#0A0A0A}
.tab-bar{display:flex;border-bottom:1px solid #2A2A2A;background:#0A0A0A;position:sticky;top:0;z-index:10}
.tab{flex:1 1 0;min-width:0;padding:14px 2px;text-align:center;font-size:11px;font-weight:500;letter-spacing:.01em;text-transform:uppercase;color:#555;cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s;background:none;border-left:none;border-right:none;border-top:none;user-select:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab.active{color:#FFF;border-bottom-color:#FFF}
.page{flex:1;overflow-y:auto;padding:16px;padding-bottom:32px}
.card{border:1px solid #2A2A2A;padding:14px 16px;margin-bottom:10px;cursor:pointer;background:#111;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:border-color .15s}
.card:active{border-color:#555}
.card-title{font-weight:600;font-size:15px}
.card-sub{font-size:12px;color:#666;margin-top:3px}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;border:1px solid #FFF;background:transparent;color:#FFF;font-size:14px;font-weight:600;letter-spacing:.02em;cursor:pointer;transition:background .15s,color .15s;margin-bottom:20px;user-select:none;font-family:inherit}
.btn:active{background:#FFF;color:#000}
.btn.ghost{border-color:#333;color:#888}.btn.ghost:active{background:#1A1A1A;color:#FFF}
.btn.danger{border-color:#FF4444;color:#FF4444}.btn.danger:active{background:#FF4444;color:#FFF}
.btn:disabled{opacity:.4;cursor:not-allowed}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:50;display:flex;flex-direction:column;justify-content:flex-end;max-width:390px;margin:0 auto;overflow:hidden}
.sheet{position:relative;background:#0A0A0A;border-top:1px solid #2A2A2A;max-height:92dvh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 16px 40px;animation:up .22s ease;scroll-behavior:auto}
@keyframes up{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
.handle{width:36px;height:4px;background:#333;margin:12px auto 16px}
.sheet-top-actions{position:absolute;top:14px;right:12px;display:flex;align-items:center;gap:6px;z-index:5}
.sheet-icon-btn{background:none;border:none;color:#666;cursor:pointer;padding:7px;display:flex;align-items:center;justify-content:center}
.sheet-icon-btn:active{color:#FFF}
.sheet-minimize-btn{background:none;border:1px solid #2A2A2A;color:#AAA;cursor:pointer;padding:6px 12px;font-size:12px;font-family:inherit;display:flex;align-items:center;gap:5px}
.sheet-minimize-btn:active{border-color:#FFF;color:#FFF}
.draft-card{border-color:#3A3220;background:#161208}
.draft-pill{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#E0A030;border:1px solid #4A3A1A;padding:2px 6px;flex-shrink:0}
.sheet-title-row{display:flex;align-items:center;gap:8px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #1E1E1E}
.sheet-title-inp{flex:1;background:none;border:none;border-bottom:1px solid #333;color:#FFF;font-size:18px;font-weight:700;letter-spacing:-.02em;outline:none;font-family:inherit;padding-bottom:3px;min-width:0}
.sheet-title-inp::placeholder{color:#444;font-weight:400}
.sheet-title-inp:focus{border-bottom-color:#888}
.field{margin-bottom:14px}
.lbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin-bottom:6px}
.inp{width:100%;background:#111;border:1px solid #2A2A2A;color:#FFF;font-size:15px;padding:11px 13px;outline:none;font-family:inherit;transition:border-color .15s;-webkit-appearance:none}
.inp:focus{border-color:#FFF}
.inp::placeholder{color:#444}
input[type=date].inp::-webkit-calendar-picker-indicator{filter:invert(.5)}
.ex-note-inp{width:100%;background:#111;border:1px solid #2A2A2A;color:#FFF;font-size:14px;padding:11px 13px;outline:none;font-family:inherit;transition:border-color .15s;resize:vertical;min-height:84px;line-height:1.5;margin-bottom:20px;-webkit-appearance:none}
.ex-note-inp:focus{border-color:#FFF}
.ex-note-inp::placeholder{color:#444}
.ex-note-inp:disabled{opacity:.5}
.ex-block{border:1px solid #2A2A2A;margin-bottom:14px;background:#111}
.ex-hd{padding:12px 14px;border-bottom:1px solid #1E1E1E;display:flex;align-items:center;gap:10px;position:relative}
.ex-num{font-size:11px;color:#555;flex-shrink:0;width:22px}
.ex-name-wrap{flex:1;position:relative;min-width:0}
.ex-name-inp{width:100%;background:none;border:none;color:#FFF;font-size:15px;font-weight:600;outline:none;font-family:inherit;padding:0}
.ex-name-inp::placeholder{color:#444;font-weight:400}
.suggestions{position:absolute;top:calc(100% + 6px);left:-14px;right:-14px;background:#1A1A1A;border:1px solid #333;z-index:100;max-height:160px;overflow-y:auto}
.sug-item{padding:10px 14px;font-size:14px;cursor:pointer;color:#CCC;border-bottom:1px solid #222}
.sug-item:last-child{border-bottom:none}
.sug-item:active{background:#2A2A2A}
.sug-match{color:#FFF;font-weight:600}
.prev{margin:0 14px;padding:8px 0 10px;font-size:12px;color:#555;border-bottom:1px solid #1A1A1A;font-style:italic}
.sets{padding:10px 14px;overflow:hidden;contain:layout}
.set-row{display:flex;align-items:center;gap:5px;margin-bottom:8px;width:100%;min-width:0}
.set-n{font-size:11px;color:#444;text-align:center;flex-shrink:0;width:18px}
.set-inp{background:#1A1A1A;border:1px solid #252525;color:#FFF;font-size:14px;padding:8px 6px;outline:none;font-family:inherit;text-align:center;-webkit-appearance:none;min-width:0;width:0;flex:1}
.set-inp:focus{border-color:#555}
.set-inp::placeholder{color:#3A3A3A;font-size:12px}
.set-inp.sm{font-size:12px;padding:7px 4px}
.set-sep{color:#444;text-align:center;font-size:13px;flex-shrink:0;width:10px}
.set-side{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#555;flex-shrink:0;width:14px;text-align:center}
.set-side.L{color:#5B9CF6}
.set-side.R{color:#F6845B}
.set-bi-wrap{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.set-bi-row{display:flex;align-items:center;gap:4px;min-width:0}
.btn-bi{background:none;border:none;color:#333;cursor:pointer;padding:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:color .15s}
.btn-bi:active{color:#888}
.btn-bi.active{color:#5B9CF6}
.del-btn{background:none;border:none;color:#444;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;line-height:1}
.del-btn:active{color:#FF4444}
.ex-comment{padding:0 14px 12px;margin-top:2px}
.ex-comment-inp{width:100%;background:none;border:none;border-top:1px solid #1A1A1A;color:#888;font-size:13px;padding:10px 0 0;outline:none;font-family:inherit;resize:none;line-height:1.5;min-height:36px}
.ex-comment-inp::placeholder{color:#3A3A3A}
.ex-comment-inp:focus{color:#CCC}
.w-ex-comment{padding:6px 14px 10px;font-size:12px;color:#555;font-style:italic;border-top:1px solid #1A1A1A;line-height:1.5}
.ex-hist-comment{font-size:12px;color:#555;font-style:italic;margin-top:6px;line-height:1.5}
.add-set{background:none;border:1px dashed #2A2A2A;color:#555;width:100%;padding:8px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;margin-top:4px}
.add-set:active{border-color:#555;color:#999}
.add-ex{background:none;border:1px dashed #2A2A2A;color:#555;width:100%;padding:12px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;margin-bottom:16px}
.add-ex:active{border-color:#888;color:#CCC}
.det-hd{display:flex;align-items:center;gap:10px;padding:16px 0;border-bottom:1px solid #1E1E1E;margin-bottom:16px}
.back-btn{background:none;border:1px solid #2A2A2A;color:#FFF;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px;font-family:inherit}
.back-btn:active{border-color:#FFF}
.det-title{font-size:17px;font-weight:700;letter-spacing:-.02em;flex:1;min-width:0}
.sec-lbl{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#444;margin-bottom:10px;margin-top:20px}
.sec-lbl:first-child{margin-top:0}
.ex-hist-item{border:1px solid #1E1E1E;padding:12px 14px;margin-bottom:8px;background:#111}
.ex-hist-date{font-size:11px;color:#555;margin-bottom:8px}
.ex-sets-disp{font-size:13px;color:#CCC;line-height:1.7}
.w-ex{border:1px solid #1E1E1E;margin-bottom:10px;background:#111}
.w-ex-name{padding:10px 14px;font-weight:600;font-size:14px;border-bottom:1px solid #1A1A1A;color:#DDD}
.w-sets{padding:10px 14px}
.w-set-row{display:flex;gap:6px;align-items:center;font-size:13px;color:#888;margin-bottom:4px}
.w-set-n{color:#444;width:20px;flex-shrink:0}
.w-set-v{color:#CCC}
.w-set-bi{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;width:100%}
.w-set-bi-side{color:#CCC}
.w-set-bi-side:last-child{text-align:left}
.w-set-bi-sep{color:#333;text-align:center}
.rename-inp{background:none;border:none;border-bottom:1px solid #444;color:#FFF;font-size:17px;font-weight:700;letter-spacing:-.02em;outline:none;font-family:inherit;flex:1;min-width:0;padding-bottom:2px}
.tag{display:inline-block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#555;border:1px solid #2A2A2A;padding:2px 6px;flex-shrink:0}
.divider{border:none;border-top:1px solid #1E1E1E;margin:16px 0}
.empty{text-align:center;padding:48px 24px;color:#444;font-size:14px;line-height:1.6}
.empty-icon{font-size:32px;margin-bottom:12px;opacity:.4}
.m-prev-hint{display:flex;align-items:center;gap:6px;margin-top:4px}
.m-prev-val{font-size:11px;color:#555;font-style:italic}
.m-prev-delta{font-size:11px;font-weight:600}
.m-prev-delta.pos{color:#4CAF50}
.m-prev-delta.neg{color:#EF5350}
.m-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.m-grid .field{margin-bottom:0}
.edit-badge{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#888;border:1px solid #2A2A2A;padding:3px 8px;cursor:pointer;background:none;font-family:inherit;flex-shrink:0}
.edit-badge:active{border-color:#FFF;color:#FFF}
.loading{text-align:center;padding:60px 24px;color:#444;font-size:13px}
.spinner{width:24px;height:24px;border:2px solid #2A2A2A;border-top-color:#FFF;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;border:1px solid #333;color:#CCC;font-size:13px;padding:10px 18px;z-index:200;white-space:nowrap;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.draft-bars-wrap{position:fixed;bottom:0;left:0;right:0;max-width:390px;margin:0 auto;z-index:45;display:flex;flex-direction:column}
.draft-bar{background:#1A1608;border-top:2px solid #E0A030;display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer;animation:up .2s ease;box-shadow:0 -4px 20px rgba(0,0,0,.4)}
.draft-bar-dot{width:9px;height:9px;background:#E0A030;flex-shrink:0;animation:pulse 1.6s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.draft-bar-text{flex:1;min-width:0}
.draft-bar-title{font-size:15px;font-weight:700;color:#FFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.draft-bar-sub{font-size:12px;color:#C08A30;margin-top:2px;font-weight:500}
.draft-bar-close{background:none;border:none;color:#8A7050;cursor:pointer;padding:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.draft-bar-close:active{color:#FFF}
.badge-active{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#4CAF50;border:1px solid #2E4A2E;padding:2px 6px;flex-shrink:0}
.badge-main{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#5B9CF6;border:1px solid #2A3A4A;padding:2px 6px;flex-shrink:0}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #1A1A1A;gap:12px}
.toggle-row:last-child{border-bottom:none}
.toggle-label{font-size:14px;color:#DDD}
.toggle-sub{font-size:11px;color:#555;margin-top:2px;line-height:1.4}
.switch{position:relative;width:42px;height:24px;flex-shrink:0;background:#242424;border:1px solid #2A2A2A;cursor:pointer;transition:background .15s,border-color .15s;padding:0}
.switch.on{background:#2E4A2E;border-color:#4CAF50}
.switch-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;background:#888;transition:left .15s,background .15s}
.switch.on .switch-knob{left:22px;background:#4CAF50}
.avatar{width:36px;height:36px;background:#1A1A1A;border:1px solid #2A2A2A;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#888;flex-shrink:0}
.friend-row{display:flex;align-items:center;gap:12px}
.search-row{display:flex;gap:8px;margin-bottom:14px}
.search-row .inp{flex:1}
.search-btn{background:none;border:1px solid #2A2A2A;color:#FFF;padding:0 16px;cursor:pointer;font-size:13px;font-family:inherit;flex-shrink:0}
.search-btn:active{border-color:#FFF}
.search-btn:disabled{opacity:.4}
.search-result{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #2A2A2A;background:#111;margin-bottom:14px;gap:10px}
.sub-tabs{display:flex;border-bottom:1px solid #2A2A2A;margin-bottom:16px}
.sub-tabs button{flex:1;padding:10px 4px;text-align:center;font-size:11px;font-weight:500;letter-spacing:.02em;text-transform:uppercase;color:#555;cursor:pointer;border-bottom:2px solid transparent;background:none;border-left:none;border-right:none;border-top:none;font-family:inherit}
.sub-tabs button.active{color:#FFF;border-bottom-color:#FFF}
`;

// ── Аварийное сохранение черновика в localStorage ────────────────────────
// В отличие от React-стейта (живёт только в памяти вкладки), это переживает
// полное убийство процесса Telegram Mini App в фоне — самый частый сценарий
// потери несохранённой тренировки на телефоне.
// Два независимых слота — тренировка и замер можно вести одновременно,
// не затирая черновик друг друга.
const DRAFT_STORAGE_KEYS = {
  workout: "gym_diary_draft_workout_v1",
  measurement: "gym_diary_draft_measurement_v1",
};

function saveDraftToStorage(type, draft) {
  try { localStorage.setItem(DRAFT_STORAGE_KEYS[type], JSON.stringify(draft)); } catch(e) {}
}
function loadDraftFromStorage(type) {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEYS[type]);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}
function clearDraftFromStorage(type) {
  try { localStorage.removeItem(DRAFT_STORAGE_KEYS[type]); } catch(e) {}
}

// ── Keyboard-aware scroll ─────────────────────────────────────────────────
// Единственный правильный способ: слушаем visualViewport.resize,
// когда клавиатура поднимается — плавно подматываем .sheet к активному полю.
// scrollIntoView НЕ используется — он вызывает прыжки body.
function useKeyboardScroll(sheetRef) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sheet = sheetRef.current;
        const active = document.activeElement;
        if (!sheet || !active || !sheet.contains(active)) return;
        const sheetRect = sheet.getBoundingClientRect();
        const elRect = active.getBoundingClientRect();
        const vpBottom = vv.offsetTop + vv.height;
        // Сколько пикселей элемент выходит за нижнюю границу viewport
        const overflow = elRect.bottom + 12 - vpBottom;
        if (overflow > 0) {
          sheet.scrollBy({ top: overflow, behavior: "smooth" });
        }
      });
    };
    vv.addEventListener("resize", onResize);
    return () => { vv.removeEventListener("resize", onResize); if (raf) cancelAnimationFrame(raf); };
  }, [sheetRef]);
}

// Блокируем скролл body пока шторка открыта
function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null;
}

// ── Autocomplete input ────────────────────────────────────────────────────
function ExNameInput({ value, onChange, allExNames }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const suggestions = value.trim().length > 0
    ? allExNames.filter(n => n.toLowerCase().includes(value.trim().toLowerCase()) && n.toLowerCase() !== value.trim().toLowerCase())
    : [];
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const highlight = (name) => {
    const idx = name.toLowerCase().indexOf(value.trim().toLowerCase());
    if (idx === -1) return <span>{name}</span>;
    return <span>{name.slice(0,idx)}<span className="sug-match">{name.slice(idx,idx+value.trim().length)}</span>{name.slice(idx+value.trim().length)}</span>;
  };
  return (
    <div className="ex-name-wrap" ref={wrapRef}>
      <input className="ex-name-inp" placeholder="Название упражнения" value={value}
        onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} autoComplete="off"/>
      {open && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(s => (
            <div key={s} className="sug-item" onMouseDown={e=>{e.preventDefault();onChange(s);setOpen(false);}}>
              {highlight(s)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WorkoutSheet ──────────────────────────────────────────────────────────
function WorkoutSheet({ workouts, initial, draft, onSave, onClose, onMinimize }) {
  const isEdit = !!initial;
  const defName = draft?.name ?? (isEdit ? initial.name : `Тренировка ${workouts.length + 1}`);
  const [name, setName] = useState(defName);
  const [date, setDate] = useState(draft?.date ?? (isEdit ? initial.date : today()));
  const [exercises, setExercises] = useState(() => {
    if (draft?.exercises) return draft.exercises;
    if (isEdit && initial.exercises.length > 0) {
      return initial.exercises.map(e=>({...e,id:e.id??Date.now()+Math.random(),sets:e.sets.map(s=>({...s}))}));
    }
    return [newEx()];
  });
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef(null);
  useKeyboardScroll(sheetRef);
  useLockBodyScroll();

  const allExNames = [...new Set(
    workouts.filter(w=>!isEdit||w.id!==initial?.id).flatMap(w=>w.exercises.map(e=>e.name.trim()).filter(Boolean))
  )];

  function newEx(){return{id:Date.now()+Math.random(),name:"",sets:[newSet()],comment:""};}
  function newSet(){return{weight:"",reps:"",bilateral:false,weightL:"",repsL:"",weightR:"",repsR:""};}
  const addEx=()=>setExercises(p=>[...p,newEx()]);
  const upEx=(id,f,v)=>setExercises(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
  const remEx=(id)=>setExercises(p=>p.filter(e=>e.id!==id));
  const addSet=(id)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:[...e.sets,newSet()]}:e));
  const upSet=(id,si,f,v)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,[f]:v}:s)}:e));
  const remSet=(id,si)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.filter((_,i)=>i!==si)}:e));
  const toggleBilateral=(id,si)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,bilateral:!s.bilateral}:s)}:e));

  // Есть ли реально внесённые данные (используется только для решения — нужно
  // ли спрашивать подтверждение при явном закрытии крестиком, не для сворачивания).
  const hasRealData = () => {
    const hasData=s=>s.bilateral?(s.weightL||s.repsL||s.weightR||s.repsR):(s.weight||s.reps);
    return exercises.some(e=>e.sets.some(hasData));
  };

  const buildDraft = () => ({ name, date, exercises });

  // Аварийное автосохранение: пишем в localStorage с небольшой задержкой после
  // каждого изменения (не на каждую букву). Сохраняем всегда, даже если пока
  // ничего не внесено — свернуть/потерять процесс можно на любом этапе.
  // Переживает убийство процесса Telegram в фоне — не только сворачивание внутри приложения.
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraftToStorage("workout", { editId: isEdit?initial.id:null, name, date, exercises });
    }, 600);
    return () => clearTimeout(t);
  }, [name, date, exercises]);

  const getPrev=(exName)=>{
    if(!exName.trim())return null;
    const lc=exName.trim().toLowerCase();
    const src=isEdit?workouts.filter(w=>w.id!==initial.id):workouts;
    const earlier=src.filter(w=>w.date<date);
    earlier.sort((a,b)=>b.date.localeCompare(a.date));
    for(const w of earlier){
      const f=w.exercises.find(e=>e.name.trim().toLowerCase()===lc);
      if(f)return{workout:w,exercise:f};
    }
    return null;
  };

  const handleSave=async()=>{
    setSaving(true);
    const hasData=s=>s.bilateral?(s.weightL||s.repsL||s.weightR||s.repsR):(s.weight||s.reps);
    const filtered=exercises
      .filter(e=>e.name.trim()||e.sets.some(hasData))
      .map(e=>({...e,sets:e.sets.filter(hasData)}));
    const payload={id:isEdit?initial.id:-1,name:name.trim()||defName,date,exercises:filtered};
    const res=await onSave(payload);
    clearDraftFromStorage("workout");
    setSaving(false);
    return res;
  };

  // Свернуть: всегда сохраняем черновик (и в память, и на диск) — даже пустую
  // заготовку, чтобы ничего не терялось на любом этапе заполнения.
  const handleMinimize=()=>{
    const d = buildDraft();
    saveDraftToStorage("workout", { editId: isEdit?initial.id:null, ...d });
    onMinimize(d);
  };

  // Закрыть крестиком: если есть данные — спросим подтверждение (можно случайно стереть тренировку)
  const handleCloseClick=()=>{
    if (hasRealData() && !window.confirm("Закрыть без сохранения? Внесённые данные будут потеряны.")) return;
    clearDraftFromStorage("workout");
    onClose();
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&handleMinimize()}>
      <div className="sheet" ref={sheetRef}>
        <div className="handle"/>
        <div className="sheet-top-actions">
          <button className="sheet-minimize-btn" onClick={handleMinimize} title="Свернуть"><IconMinimize/>Свернуть</button>
          <button className="sheet-icon-btn" onClick={handleCloseClick} title="Закрыть"><IconClose/></button>
        </div>
        <div className="sheet-title-row">
          <input className="sheet-title-inp" value={name} onChange={e=>setName(e.target.value)} placeholder={defName}/>
        </div>
        <div className="field">
          <div className="lbl">Дата</div>
          <input type="date" className="inp" value={date} onChange={e=>setDate(e.target.value)}/>
        </div>
        <div className="sec-lbl" style={{marginTop:20,marginBottom:12}}>Упражнения</div>
        {exercises.map((ex,ei)=>{
          const prev=getPrev(ex.name);
          return(
            <div key={ex.id} className="ex-block">
              <div className="ex-hd">
                <span className="ex-num">{ei+1}</span>
                <ExNameInput value={ex.name} onChange={v=>upEx(ex.id,"name",v)} allExNames={allExNames}/>
                {exercises.length>1&&<button className="del-btn" onClick={()=>remEx(ex.id)}><IconTrash/></button>}
              </div>
              {prev&&(
                <div className="prev">
                  Прошлый раз ({formatDate(prev.workout.date)}):&nbsp;
                  {prev.exercise.sets.filter(s=>s.bilateral?(s.weightL||s.repsL||s.weightR||s.repsR):(s.weight||s.reps)).map((s,i,arr)=>{
                    const str=s.bilateral
                      ?`Л${s.weightL||"—"}×${s.repsL||"—"} П${s.weightR||"—"}×${s.repsR||"—"}`
                      :`${s.weight?s.weight+"кг":"—"}×${s.reps||"—"}`;
                    return str+(i<arr.length-1?", ":"");
                  })}
                  {prev.exercise.comment?<><br/><span style={{fontStyle:"italic",color:"#555"}}>{prev.exercise.comment}</span></>:null}
                </div>
              )}
              <div className="sets">
                {ex.sets.map((s,si)=>(
                  <div key={si} className="set-row">
                    <span className="set-n">{si+1}</span>
                    {s.bilateral?(
                      <div className="set-bi-wrap">
                        <div className="set-bi-row">
                          <span className="set-side L">Л</span>
                          <input className="set-inp sm" type="number" inputMode="decimal" placeholder="кг" value={s.weightL} onChange={e=>upSet(ex.id,si,"weightL",e.target.value)}/>
                          <span className="set-sep">×</span>
                          <input className="set-inp sm" type="number" inputMode="numeric" placeholder="повт" value={s.repsL} onChange={e=>upSet(ex.id,si,"repsL",e.target.value)}/>
                        </div>
                        <div className="set-bi-row">
                          <span className="set-side R">П</span>
                          <input className="set-inp sm" type="number" inputMode="decimal" placeholder="кг" value={s.weightR} onChange={e=>upSet(ex.id,si,"weightR",e.target.value)}/>
                          <span className="set-sep">×</span>
                          <input className="set-inp sm" type="number" inputMode="numeric" placeholder="повт" value={s.repsR} onChange={e=>upSet(ex.id,si,"repsR",e.target.value)}/>
                        </div>
                      </div>
                    ):(
                      <>
                        <input className="set-inp" type="number" inputMode="decimal" placeholder="кг" value={s.weight} onChange={e=>upSet(ex.id,si,"weight",e.target.value)}/>
                        <span className="set-sep">×</span>
                        <input className="set-inp" type="number" inputMode="numeric" placeholder="повт" value={s.reps} onChange={e=>upSet(ex.id,si,"reps",e.target.value)}/>
                      </>
                    )}
                    <button className={`btn-bi${s.bilateral?" active":""}`} onClick={()=>toggleBilateral(ex.id,si)} title="Унилатеральный режим"><IconBilateral/></button>
                    <button className="del-btn" onClick={()=>remSet(ex.id,si)}><IconTrash/></button>
                  </div>
                ))}
                <button className="add-set" onClick={()=>addSet(ex.id)}><IconPlus/>подход</button>
              </div>
              <div className="ex-comment">
                <textarea
                  className="ex-comment-inp"
                  placeholder="Комментарий к упражнению..."
                  value={ex.comment||""}
                  onChange={e=>upEx(ex.id,"comment",e.target.value)}
                  rows={1}
                  onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
                />
              </div>
            </div>
          );
        })}
        <button className="add-ex" onClick={addEx}><IconPlus/>Добавить упражнение</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving?"Сохранение...":(isEdit?"Сохранить изменения":"Сохранить тренировку")}</button>
        <button className="btn ghost" onClick={handleCloseClick}>Отмена</button>
      </div>
    </div>
  );
}

// ── WorkoutsTab ───────────────────────────────────────────────────────────
function WorkoutsTab({workouts, setWorkouts, toast, workoutDraft, setWorkoutDraft}) {
  const [showNew,setShowNew]=useState(false);
  const [editId,setEditId]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [renamingId,setRenamingId]=useState(null);
  const [renameVal,setRenameVal]=useState("");
  const [restoredDraft,setRestoredDraft]=useState(null); // черновик, восстановленный в текущей открытой шторке

  const detail=detailId!=null?workouts.find(w=>w.id===detailId):null;
  const editTarget=editId!=null?workouts.find(w=>w.id===editId):null;

  // Когда черновик восстанавливается (клик по draft-bar/карточке), открываем нужную
  // шторку и сразу забираем данные локально — глобальный workoutDraft очищается, бар пропадает.
  useEffect(()=>{
    if(workoutDraft?.restoring){
      setRestoredDraft(workoutDraft);
      if(workoutDraft.editId!=null){ setEditId(workoutDraft.editId); setDetailId(null); }
      else { setShowNew(true); }
      setWorkoutDraft(null);
    }
  },[workoutDraft]);

  const draft = restoredDraft;

  const handleCreate=async(w)=>{
    const res=await api.saveWorkout(w);
    const saved={...w,id:res.id};
    setWorkouts(p=>[...p,saved]);
    setShowNew(false);
    setRestoredDraft(null);
    toast("Тренировка сохранена ✓");
  };
  const handleUpdate=async(w)=>{
    await api.saveWorkout(w);
    setWorkouts(p=>p.map(x=>x.id===w.id?w:x));
    setEditId(null); setDetailId(w.id);
    setRestoredDraft(null);
    toast("Изменения сохранены ✓");
  };
  const handleDelete=async(id)=>{
    if(!window.confirm("Удалить тренировку?"))return;
    await api.deleteWorkout(id);
    setWorkouts(p=>p.filter(w=>w.id!==id));
    setDetailId(null);
    toast("Удалено");
  };
  const startRename=(w)=>{setRenamingId(w.id);setRenameVal(w.name);};
  const commitRename=async(id)=>{
    if(!renameVal.trim()){setRenamingId(null);return;}
    const w=workouts.find(x=>x.id===id);
    const updated={...w,name:renameVal.trim()};
    await api.saveWorkout(updated);
    setWorkouts(p=>p.map(x=>x.id===id?updated:x));
    setRenamingId(null);
  };

  const handleMinimize=(draftData)=>{
    setShowNew(false);
    setEditId(null);
    setRestoredDraft(null);
    setWorkoutDraft({editId: editTarget?.id ?? null, ...draftData});
  };
  const handleSheetClose=()=>{
    setShowNew(false);
    setEditId(null);
    setRestoredDraft(null);
  };

  // Пока есть незавершённый черновик (тренировка) — запрещаем открывать
  // новую или другую тренировку на редактирование, чтобы старую не потерять.
  const guardOpen=(openFn)=>{
    if(workoutDraft && !workoutDraft.restoring){
      window.alert("Сначала заверши текущую тренировку — она ещё не сохранена. Нажми на неё в списке, чтобы продолжить.");
      return;
    }
    openFn();
  };

  // Черновик, свёрнутый именно здесь (тренировка) — показываем прямо в списке,
  // на том месте, где он был бы, если бы уже был сохранён, вместо плавающего
  // блока внизу (чтобы не путать со старой уже сохранённой версией при редактировании).
  const listDraft = workoutDraft && !workoutDraft.restoring ? workoutDraft : null;

  let listItems = [...workouts].sort((a,b)=>b.date.localeCompare(a.date)).map(w=>({isDraft:false,w}));
  if(listDraft){
    const foundIdx = listDraft.editId!=null ? listItems.findIndex(item=>item.w.id===listDraft.editId) : -1;
    if(foundIdx!==-1){
      listItems[foundIdx] = {isDraft:true,draft:listDraft};
    }else{
      listItems.push({isDraft:true,draft:listDraft});
      listItems.sort((a,b)=>{
        const da=a.isDraft?a.draft.date:a.w.date;
        const db=b.isDraft?b.draft.date:b.w.date;
        return db.localeCompare(da);
      });
    }
  }

  if(detail) return (
    <div className="page">
      <div className="det-hd">
        <button className="back-btn" onClick={()=>setDetailId(null)}><IconChevron dir="left"/>Назад</button>
        {renamingId===detail.id
          ?<input className="rename-inp" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onBlur={()=>commitRename(detail.id)} onKeyDown={e=>e.key==="Enter"&&commitRename(detail.id)} autoFocus/>
          :<span className="det-title">{detail.name}</span>}
        <button className="del-btn" onClick={()=>startRename(detail)}><IconEdit/></button>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <span style={{color:"#888",fontSize:13,flex:1,alignSelf:"center"}}>{formatDate(detail.date)}</span>
        <button className="edit-badge" onClick={()=>guardOpen(()=>{setDetailId(null);setEditId(detail.id);})}>✎ Редактировать</button>
      </div>
      <div className="sec-lbl">Упражнения — {detail.exercises.length}</div>
      {detail.exercises.length===0
        ?<div className="empty"><div className="empty-icon">📋</div>Упражнения не записаны</div>
        :detail.exercises.map((ex,i)=>(
          <div key={ex.id||i} className="w-ex">
            <div className="w-ex-name">{ex.name||`Упражнение ${i+1}`}</div>
            <div className="w-sets">
              {ex.sets.map((s,si)=>(
                <div key={si} className="w-set-row">
                  <span className="w-set-n">{si+1}</span>
                  {s.bilateral?(
                    <span className="w-set-v w-set-bi">
                      <span className="w-set-bi-side"><span style={{color:"#5B9CF6",fontSize:10}}>Л</span> {s.weightL?`${s.weightL} кг`:"—"} × {s.repsL||"—"}</span>
                      <span className="w-set-bi-sep">|</span>
                      <span className="w-set-bi-side"><span style={{color:"#F6845B",fontSize:10}}>П</span> {s.weightR?`${s.weightR} кг`:"—"} × {s.repsR||"—"}</span>
                    </span>
                  ):(
                    <span className="w-set-v">{s.weight?`${s.weight} кг`:"—"} × {s.reps||"—"} повт</span>
                  )}
                </div>
              ))}
            </div>
            {ex.comment&&<div className="w-ex-comment">{ex.comment}</div>}
          </div>
        ))}
      <hr className="divider"/>
      <button className="btn danger" onClick={()=>handleDelete(detail.id)}>Удалить тренировку</button>
      {editTarget&&<WorkoutSheet workouts={workouts} initial={editTarget} draft={draft} onSave={handleUpdate} onClose={handleSheetClose} onMinimize={handleMinimize}/>}
    </div>
  );

  return (
    <div className="page">
      <button className="btn" onClick={()=>guardOpen(()=>setShowNew(true))}><IconPlus/>Новая тренировка</button>
      {workouts.length===0 && !listDraft
        ?<div className="empty"><div className="empty-icon">🏋️</div>Тренировок пока нет.<br/>Начни первую!</div>
        :listItems.map((item,i,arr)=>item.isDraft?(
          <div key="draft-card" className="card draft-card" onClick={()=>setWorkoutDraft(prev=>({...prev,restoring:true}))}>
            <div style={{minWidth:0}}>
              <div className="card-title">{item.draft.name||"Тренировка"}</div>
              <div className="card-sub">{formatDate(item.draft.date)} · не сохранено</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <span className="draft-pill">Черновик</span><IconChevron/>
            </div>
          </div>
        ):(
          <div key={item.w.id} className="card" onClick={()=>setDetailId(item.w.id)}>
            <div style={{minWidth:0}}>
              <div className="card-title">{item.w.name}</div>
              <div className="card-sub">{formatDate(item.w.date)} · {item.w.exercises.length} упр.</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <span className="tag">#{arr.length-i}</span><IconChevron/>
            </div>
          </div>
        ))}
      {showNew&&<WorkoutSheet workouts={workouts} initial={null} draft={draft} onSave={handleCreate} onClose={handleSheetClose} onMinimize={handleMinimize}/>}
      {editTarget&&<WorkoutSheet workouts={workouts} initial={editTarget} draft={draft} onSave={handleUpdate} onClose={handleSheetClose} onMinimize={handleMinimize}/>}
    </div>
  );
}

// ── ExercisesTab ──────────────────────────────────────────────────────────
function ExercisesTab({workouts, setWorkouts, toast}) {
  const [selected,setSelected]=useState(null);
  const [renamingEx,setRenamingEx]=useState(false);
  const [renameExVal,setRenameExVal]=useState("");

  // Общие описания упражнений (техника, сетап и т.д.) — по имени, не по конкретной тренировке.
  const [notes,setNotes]=useState({});
  const [notesLoaded,setNotesLoaded]=useState(false);
  useEffect(()=>{
    api.getExerciseNotes().then(d=>{setNotes(d||{});setNotesLoaded(true);}).catch(()=>setNotesLoaded(true));
  },[]);
  const noteKey = selected ? selected.trim().toLowerCase() : null;
  const noteVal = noteKey!=null ? (notes[noteKey] ?? "") : "";
  const setNoteVal = (v) => setNotes(prev=>({...prev,[noteKey]:v}));
  // Автосохранение с задержкой, как и остальные черновики в приложении — но
  // только после того, как исходные заметки уже загружены (иначе можем
  // случайно затереть существующую заметку пустой строкой до загрузки).
  useEffect(()=>{
    if(!selected || !notesLoaded) return;
    const t=setTimeout(()=>{ api.saveExerciseNote(selected, notes[noteKey] ?? "").catch(()=>{}); }, 600);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selected, notesLoaded, notes[noteKey]]);

  const allNames=[...new Set(workouts.flatMap(w=>w.exercises.map(e=>e.name.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,"ru"));
  const getHistory=(name)=>{
    const lc=name.toLowerCase(),rows=[];
    workouts.forEach(w=>w.exercises.forEach(e=>{if(e.name.trim().toLowerCase()===lc)rows.push({workout:w,exercise:e});}));
    return rows.sort((a,b)=>b.workout.date.localeCompare(a.workout.date));
  };

  const startRenameEx=()=>{setRenameExVal(selected);setRenamingEx(true);};
  const commitRenameEx=async()=>{
    const newName=renameExVal.trim();
    if(!newName||newName===selected){setRenamingEx(false);return;}
    const lc=selected.toLowerCase();
    // Update all workouts that contain this exercise name
    const toUpdate=workouts.filter(w=>w.exercises.some(e=>e.name.trim().toLowerCase()===lc));
    await Promise.all(toUpdate.map(w=>{
      const updated={...w,exercises:w.exercises.map(e=>e.name.trim().toLowerCase()===lc?{...e,name:newName}:e)};
      return api.saveWorkout(updated).then(()=>updated);
    })).then(updatedList=>{
      setWorkouts(prev=>prev.map(w=>{
        const found=updatedList.find(u=>u.id===w.id);
        return found||w;
      }));
    });
    // Переносим заметку с описанием техники на новое имя вместе с самим упражнением
    const newLc=newName.trim().toLowerCase();
    api.renameExerciseNote(selected,newName).catch(()=>{});
    setNotes(prev=>{
      if(!(lc in prev)) return prev;
      const {[lc]:val,...rest}=prev;
      return {...rest,[newLc]:val};
    });
    toast(`«${selected}» → «${newName}» ✓`);
    setSelected(newName);
    setRenamingEx(false);
  };

  if(selected){
    const history=getHistory(selected);
    return(
      <div className="page">
        <div className="det-hd">
          <button className="back-btn" onClick={()=>{setSelected(null);setRenamingEx(false);}}><IconChevron dir="left"/>Назад</button>
          {renamingEx
            ?<input
                className="rename-inp"
                value={renameExVal}
                onChange={e=>setRenameExVal(e.target.value)}
                onBlur={commitRenameEx}
                onKeyDown={e=>{if(e.key==="Enter")commitRenameEx();if(e.key==="Escape"){setRenamingEx(false);}}}
                autoFocus
              />
            :<span className="det-title">{selected}</span>}
          <button className="del-btn" onClick={startRenameEx}><IconEdit/></button>
        </div>
        <div className="sec-lbl" style={{marginTop:0}}>Описание · техника выполнения</div>
        <textarea
          className="ex-note-inp"
          placeholder="Сетап, техника выполнения, на что обратить внимание..."
          value={noteVal}
          onChange={e=>setNoteVal(e.target.value)}
          disabled={!notesLoaded}
        />
        <div className="sec-lbl">{history.length} записей</div>
        {history.map(({workout,exercise},i)=>(
          <div key={i} className="ex-hist-item">
            <div className="ex-hist-date">{formatDate(workout.date)} · {workout.name}</div>
            <div className="ex-sets-disp">
              {exercise.sets.filter(s=>s.bilateral?(s.weightL||s.repsL||s.weightR||s.repsR):(s.weight||s.reps)).map((s,si)=>(
                <div key={si}>
                  <span style={{color:"#555"}}>{si+1}.</span>{" "}
                  {s.bilateral?(
                    <>
                      <span style={{color:"#5B9CF6",fontSize:10}}>Л</span> {s.weightL?`${s.weightL} кг`:"—"} × {s.repsL||"—"}
                      {" · "}
                      <span style={{color:"#F6845B",fontSize:10}}>П</span> {s.weightR?`${s.weightR} кг`:"—"} × {s.repsR||"—"}
                    </>
                  ):(
                    <>{s.weight?`${s.weight} кг`:"—"} × {s.reps?`${s.reps} повт`:"—"}</>
                  )}
                </div>
              ))}
            </div>
            {exercise.comment&&<div className="ex-hist-comment">{exercise.comment}</div>}
          </div>
        ))}
      </div>
    );
  }
  return(
    <div className="page">
      {allNames.length===0
        ?<div className="empty"><div className="empty-icon">📝</div>Упражнения появятся здесь<br/>после первой тренировки</div>
        :<>
          <div className="sec-lbl">{allNames.length} упражнений</div>
          {allNames.map(name=>{
            const count=workouts.filter(w=>w.exercises.some(e=>e.name.trim().toLowerCase()===name.toLowerCase())).length;
            return(
              <div key={name} className="card" onClick={()=>setSelected(name)}>
                <div style={{minWidth:0}}>
                  <div className="card-title">{name}</div>
                  <div className="card-sub">{count} {count===1?"запись":count<5?"записи":"записей"}</div>
                </div>
                <IconChevron/>
              </div>
            );
          })}
        </>}
    </div>
  );
}

// ── MeasurementSheet ──────────────────────────────────────────────────────
function MeasurementSheet({measurements, initial, draft, onSave, onClose, onMinimize}) {
  const isEdit=!!initial;
  const defName=draft?.name ?? (isEdit?initial.name:`Замер ${(measurements?.length||0) + 1}`);
  const [name,setName]=useState(defName);
  const [date,setDate]=useState(draft?.date ?? (isEdit?initial.date:today()));
  const [vals,setVals]=useState(()=>{
    if(draft?.vals) return draft.vals;
    if(!isEdit)return{};
    const v={};
    MEASUREMENT_FIELDS.forEach(f=>{if(initial[f.key]!=null&&initial[f.key]!=="")v[f.key]=initial[f.key];});
    return v;
  });
  const [saving,setSaving]=useState(false);
  const sheetRef=useRef(null);
  useKeyboardScroll(sheetRef);
  useLockBodyScroll();
  const set=(k,v)=>setVals(p=>({...p,[k]:v}));

  // Ищем предыдущий замер строго раньше текущей даты
  const prevMeasurement = (() => {
    const src = isEdit ? measurements.filter(m=>m.id!==initial.id) : measurements;
    const earlier = src.filter(m=>m.date < date);
    if(!earlier.length) return null;
    return earlier.reduce((best,m)=>m.date>best.date?m:best);
  })();

  const hasRealData = () => Object.values(vals).some(v=>v!==""&&v!=null);
  const buildDraft = () => ({ name, date, vals });

  useEffect(() => {
    const t = setTimeout(() => {
      saveDraftToStorage("measurement", { editId: isEdit?initial.id:null, name, date, vals });
    }, 600);
    return () => clearTimeout(t);
  }, [name, date, vals]);

  const handleSave=async()=>{
    setSaving(true);
    await onSave({id:isEdit?initial.id:-1,name:name.trim()||defName,date,...vals});
    clearDraftFromStorage("measurement");
    setSaving(false);
  };

  // Свернуть: всегда сохраняем черновик, даже пустую заготовку.
  const handleMinimize=()=>{
    const d = buildDraft();
    saveDraftToStorage("measurement", { editId: isEdit?initial.id:null, ...d });
    onMinimize(d);
  };
  const handleCloseClick=()=>{
    if (hasRealData() && !window.confirm("Закрыть без сохранения? Внесённые данные будут потеряны.")) return;
    clearDraftFromStorage("measurement");
    onClose();
  };

  // Показываем дельту: +1.5 кг или -2 см
  const delta=(key,cur)=>{
    if(!prevMeasurement||prevMeasurement[key]==null||prevMeasurement[key]==="")return null;
    if(cur==null||cur==="")return null;
    const d=(parseFloat(cur)-parseFloat(prevMeasurement[key])).toFixed(1);
    if(d==0)return null;
    return d>0?`+${d}`:`${d}`;
  };

  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&handleMinimize()}>
      <div className="sheet" ref={sheetRef}>
        <div className="handle"/>
        <div className="sheet-top-actions">
          <button className="sheet-minimize-btn" onClick={handleMinimize} title="Свернуть"><IconMinimize/>Свернуть</button>
          <button className="sheet-icon-btn" onClick={handleCloseClick} title="Закрыть"><IconClose/></button>
        </div>
        <div className="sheet-title-row">
          <input className="sheet-title-inp" value={name} onChange={e=>setName(e.target.value)} placeholder={defName}/>
        </div>
        <div className="field">
          <div className="lbl">Дата</div>
          <input type="date" className="inp" value={date} onChange={e=>setDate(e.target.value)}/>
        </div>
        {prevMeasurement&&(
          <div className="prev" style={{marginBottom:12,fontStyle:"normal"}}>
            Прошлый замер: <span style={{color:"#666"}}>{formatDate(prevMeasurement.date)}</span>
          </div>
        )}
        <div className="sec-lbl" style={{marginTop:16}}>Вес тела</div>
        <div className="field" style={{marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input className="inp" style={{flex:1}} type="number" inputMode="decimal" placeholder="кг, например 82.5" value={vals["weight"]||""} onChange={e=>set("weight",e.target.value)}/>
            {prevMeasurement&&prevMeasurement["weight"]&&(
              <div className="m-prev-hint">
                <span className="m-prev-val">{prevMeasurement["weight"]} кг</span>
                {delta("weight",vals["weight"])&&<span className={`m-prev-delta ${parseFloat(delta("weight",vals["weight"]))>0?"pos":"neg"}`}>{delta("weight",vals["weight"])}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="sec-lbl" style={{marginTop:16}}>Замеры (см)</div>
        <div className="m-grid" style={{marginTop:8}}>
          {MEASUREMENT_FIELDS.slice(1).map(f=>(
            <div key={f.key} className="field">
              <div className="lbl">{f.label}</div>
              <input className="inp" type="number" inputMode="decimal" placeholder="см" value={vals[f.key]||""} onChange={e=>set(f.key,e.target.value)}/>
              {prevMeasurement&&prevMeasurement[f.key]&&(
                <div className="m-prev-hint" style={{marginTop:4}}>
                  <span className="m-prev-val">{prevMeasurement[f.key]} см</span>
                  {delta(f.key,vals[f.key])&&<span className={`m-prev-delta ${parseFloat(delta(f.key,vals[f.key]))>0?"pos":"neg"}`}>{delta(f.key,vals[f.key])}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{height:20}}/>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving?"Сохранение...":(isEdit?"Сохранить изменения":"Сохранить замер")}</button>
        <button className="btn ghost" onClick={handleCloseClick}>Отмена</button>
      </div>
    </div>
  );
}

// ── MeasurementsTab ───────────────────────────────────────────────────────
function MeasurementsTab({measurements,setMeasurements,toast,measurementDraft,setMeasurementDraft}) {
  const [showNew,setShowNew]=useState(false);
  const [editId,setEditId]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [renamingId,setRenamingId]=useState(null);
  const [renameVal,setRenameVal]=useState("");
  const [restoredDraft,setRestoredDraft]=useState(null);

  const detail=detailId!=null?measurements.find(m=>m.id===detailId):null;
  const editTarget=editId!=null?measurements.find(m=>m.id===editId):null;

  useEffect(()=>{
    if(measurementDraft?.restoring){
      setRestoredDraft(measurementDraft);
      if(measurementDraft.editId!=null){ setEditId(measurementDraft.editId); setDetailId(null); }
      else { setShowNew(true); }
      setMeasurementDraft(null);
    }
  },[measurementDraft]);

  const draft = restoredDraft;

  const handleCreate=async(m)=>{
    const res=await api.saveMeasurement(m);
    const saved={...m,id:res.id};
    setMeasurements(p=>[...p,saved]);
    setShowNew(false);
    setRestoredDraft(null);
    toast("Замер сохранён ✓");
  };
  const handleUpdate=async(m)=>{
    await api.saveMeasurement(m);
    setMeasurements(p=>p.map(x=>x.id===m.id?m:x));
    setEditId(null); setDetailId(m.id);
    setRestoredDraft(null);
    toast("Изменения сохранены ✓");
  };
  const handleDelete=async(id)=>{
    if(!window.confirm("Удалить замер?"))return;
    await api.deleteMeasurement(id);
    setMeasurements(p=>p.filter(m=>m.id!==id));
    setDetailId(null);
    toast("Удалено");
  };
  const startRename=(m)=>{setRenamingId(m.id);setRenameVal(m.name);};
  const commitRename=async(id)=>{
    if(!renameVal.trim()){setRenamingId(null);return;}
    const m=measurements.find(x=>x.id===id);
    const updated={...m,name:renameVal.trim()};
    await api.saveMeasurement(updated);
    setMeasurements(p=>p.map(x=>x.id===id?updated:x));
    setRenamingId(null);
  };

  const handleMinimize=(draftData)=>{
    setShowNew(false);
    setEditId(null);
    setRestoredDraft(null);
    setMeasurementDraft({editId: editTarget?.id ?? null, ...draftData});
  };
  const handleSheetClose=()=>{
    setShowNew(false);
    setEditId(null);
    setRestoredDraft(null);
  };

  // Пока есть незавершённый черновик (замер) — запрещаем открывать новый
  // или другой замер на редактирование, чтобы старый не потерять.
  const guardOpen=(openFn)=>{
    if(measurementDraft && !measurementDraft.restoring){
      window.alert("Сначала заверши текущий замер — он ещё не сохранён. Нажми на него в списке, чтобы продолжить.");
      return;
    }
    openFn();
  };

  // Черновик, свёрнутый именно здесь (замер) — показываем прямо в списке на
  // правильном месте, вместо плавающего блока внизу.
  const listDraft = measurementDraft && !measurementDraft.restoring ? measurementDraft : null;

  let listItems = [...measurements].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>({isDraft:false,m}));
  if(listDraft){
    const foundIdx = listDraft.editId!=null ? listItems.findIndex(item=>item.m.id===listDraft.editId) : -1;
    if(foundIdx!==-1){
      listItems[foundIdx] = {isDraft:true,draft:listDraft};
    }else{
      listItems.push({isDraft:true,draft:listDraft});
      listItems.sort((a,b)=>{
        const da=a.isDraft?a.draft.date:a.m.date;
        const db=b.isDraft?b.draft.date:b.m.date;
        return db.localeCompare(da);
      });
    }
  }

  if(detail){
    const filled=MEASUREMENT_FIELDS.filter(f=>detail[f.key]!==""&&detail[f.key]!=null);

    // Ищем предыдущий замер строго раньше текущего по дате
    const prevM = (() => {
      const earlier = measurements.filter(m=>m.id!==detail.id && m.date < detail.date);
      if(!earlier.length) return null;
      return earlier.reduce((best,m)=>m.date>best.date?m:best);
    })();
    const delta=(key)=>{
      if(!prevM||prevM[key]==null||prevM[key]==="")return null;
      if(detail[key]==null||detail[key]==="")return null;
      const d=(parseFloat(detail[key])-parseFloat(prevM[key])).toFixed(1);
      if(d==0)return null;
      return d>0?`+${d}`:`${d}`;
    };

    return(
      <div className="page">
        <div className="det-hd">
          <button className="back-btn" onClick={()=>setDetailId(null)}><IconChevron dir="left"/>Назад</button>
          {renamingId===detail.id
            ?<input className="rename-inp" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onBlur={()=>commitRename(detail.id)} onKeyDown={e=>e.key==="Enter"&&commitRename(detail.id)} autoFocus/>
            :<span className="det-title">{detail.name}</span>}
          <button className="del-btn" onClick={()=>startRename(detail)}><IconEdit/></button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <span style={{color:"#888",fontSize:13,flex:1,alignSelf:"center"}}>{formatDate(detail.date)}</span>
          <button className="edit-badge" onClick={()=>guardOpen(()=>{setDetailId(null);setEditId(detail.id);})}>✎ Редактировать</button>
        </div>
        {prevM&&(
          <div className="prev" style={{marginBottom:16,fontStyle:"normal"}}>
            Сравнение с замером от <span style={{color:"#666"}}>{formatDate(prevM.date)}</span>
          </div>
        )}
        <div className="sec-lbl">Показатели</div>
        {filled.length===0
          ?<p style={{color:"#555",fontSize:13}}>Ничего не заполнено</p>
          :filled.map(f=>{
            const d=delta(f.key);
            const hasPrev=prevM&&prevM[f.key]!=null&&prevM[f.key]!=="";
            return(
              <div key={f.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1A1A1A"}}>
                <span style={{color:"#888",fontSize:13}}>{f.label}</span>
                <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                  {hasPrev&&(
                    <span style={{fontSize:11,color:"#555",fontStyle:"italic"}}>{prevM[f.key]} {f.key==="weight"?"кг":"см"}</span>
                  )}
                  {hasPrev&&<span style={{color:"#444",fontSize:11}}>→</span>}
                  <span style={{fontWeight:600,fontSize:15}}>{detail[f.key]} <span style={{color:"#555",fontWeight:400,fontSize:12}}>{f.key==="weight"?"кг":"см"}</span></span>
                  {d&&<span className={`m-prev-delta ${parseFloat(d)>0?"pos":"neg"}`} style={{fontSize:12}}>{d}</span>}
                </div>
              </div>
            );
          })}
        <hr className="divider"/>
        <button className="btn danger" onClick={()=>handleDelete(detail.id)}>Удалить замер</button>
        {editTarget&&<MeasurementSheet measurements={measurements} initial={editTarget} draft={draft} onSave={handleUpdate} onClose={handleSheetClose} onMinimize={handleMinimize}/>}
      </div>
    );
  }
  return(
    <div className="page">
      <button className="btn" onClick={()=>guardOpen(()=>setShowNew(true))}><IconPlus/>Измерить тело</button>
      {measurements.length===0 && !listDraft
        ?<div className="empty"><div className="empty-icon">📏</div>Замеров пока нет.<br/>Добавь первый!</div>
        :listItems.map((item,i,arr)=>{
          if(item.isDraft) return(
            <div key="draft-card" className="card draft-card" onClick={()=>setMeasurementDraft(prev=>({...prev,restoring:true}))}>
              <div style={{minWidth:0}}>
                <div className="card-title">{item.draft.name||"Замер"}</div>
                <div className="card-sub">{formatDate(item.draft.date)} · не сохранено</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <span className="draft-pill">Черновик</span><IconChevron/>
              </div>
            </div>
          );
          const m=item.m;
          const fc=MEASUREMENT_FIELDS.filter(f=>m[f.key]!==""&&m[f.key]!=null).length;
          return(
            <div key={m.id} className="card" onClick={()=>setDetailId(m.id)}>
              <div style={{minWidth:0}}>
                <div className="card-title">{m.name}</div>
                <div className="card-sub">{formatDate(m.date)} · {fc} показателей</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <span className="tag">#{arr.length-i}</span><IconChevron/>
              </div>
            </div>
          );
        })}
      {showNew&&<MeasurementSheet measurements={measurements} initial={null} draft={draft} onSave={handleCreate} onClose={handleSheetClose} onMinimize={handleMinimize}/>}
      {editTarget&&<MeasurementSheet measurements={measurements} initial={editTarget} draft={draft} onSave={handleUpdate} onClose={handleSheetClose} onMinimize={handleMinimize}/>}
    </div>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────
function ToggleRow({label, sub, checked, onChange}) {
  return (
    <div className="toggle-row">
      <div style={{flex:1,minWidth:0}}>
        <div className="toggle-label">{label}</div>
        {sub&&<div className="toggle-sub">{sub}</div>}
      </div>
      <button className={`switch${checked?" on":""}`} onClick={()=>onChange(!checked)}>
        <span className="switch-knob"/>
      </button>
    </div>
  );
}

// ── ProfileCreateSheet ────────────────────────────────────────────────────
function ProfileCreateSheet({onSave, onClose}) {
  const [name,setName]=useState("");
  const [saving,setSaving]=useState(false);
  const sheetRef=useRef(null);
  useKeyboardScroll(sheetRef);
  useLockBodyScroll();
  const handleSave=async()=>{
    setSaving(true);
    await onSave(name.trim()||"Новый профиль");
    setSaving(false);
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" ref={sheetRef}>
        <div className="handle"/>
        <div className="sheet-top-actions">
          <button className="sheet-icon-btn" onClick={onClose} title="Закрыть"><IconClose/></button>
        </div>
        <div className="sheet-title-row">
          <input className="sheet-title-inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Название профиля" autoFocus/>
        </div>
        <p style={{color:"#666",fontSize:13,marginBottom:20,lineHeight:1.5}}>
          Новый профиль — это отдельный чистый дневник: тренировки, упражнения и замеры не будут пересекаться с другими профилями. Удобно, если ведёшь дневник за кого-то ещё.
        </p>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving?"Создание...":"Создать профиль"}</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

// ── FriendProfileView (только просмотр) ──────────────────────────────────
function FriendProfileView({friendId, onBack, onRemove}) {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [subTab,setSubTab]=useState(0);
  const [selectedEx,setSelectedEx]=useState(null);

  useEffect(()=>{
    api.getFriendProfile(friendId).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  },[friendId]);

  if(loading) return (
    <div className="page">
      <div className="det-hd"><button className="back-btn" onClick={onBack}><IconChevron dir="left"/>Назад</button></div>
      <div className="loading"><div className="spinner"/><div>Загрузка...</div></div>
    </div>
  );
  if(!data) return (
    <div className="page">
      <div className="det-hd"><button className="back-btn" onClick={onBack}><IconChevron dir="left"/>Назад</button></div>
      <div className="empty">Не удалось загрузить профиль</div>
    </div>
  );

  const workouts = data.workouts || [];
  const friendMeasurements = data.measurements || [];
  const hasNothing = !data.show_workouts && !data.show_exercises && !data.show_measurements;
  const allNames = data.show_exercises
    ? [...new Set(workouts.flatMap(w=>w.exercises.map(e=>e.name.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,"ru"))
    : [];

  if(selectedEx){
    const lc=selectedEx.toLowerCase();
    const rows=[];
    workouts.forEach(w=>w.exercises.forEach(e=>{if(e.name.trim().toLowerCase()===lc)rows.push({workout:w,exercise:e});}));
    rows.sort((a,b)=>b.workout.date.localeCompare(a.workout.date));
    return(
      <div className="page">
        <div className="det-hd">
          <button className="back-btn" onClick={()=>setSelectedEx(null)}><IconChevron dir="left"/>Назад</button>
          <span className="det-title">{selectedEx}</span>
        </div>
        <div className="sec-lbl">{rows.length} записей</div>
        {rows.map(({workout,exercise},i)=>(
          <div key={i} className="ex-hist-item">
            <div className="ex-hist-date">{formatDate(workout.date)} · {workout.name}</div>
            <div className="ex-sets-disp">
              {exercise.sets.filter(s=>s.bilateral?(s.weightL||s.repsL||s.weightR||s.repsR):(s.weight||s.reps)).map((s,si)=>(
                <div key={si}>
                  <span style={{color:"#555"}}>{si+1}.</span>{" "}
                  {s.bilateral?(
                    <>
                      <span style={{color:"#5B9CF6",fontSize:10}}>Л</span> {s.weightL?`${s.weightL} кг`:"—"} × {s.repsL||"—"}
                      {" · "}
                      <span style={{color:"#F6845B",fontSize:10}}>П</span> {s.weightR?`${s.weightR} кг`:"—"} × {s.repsR||"—"}
                    </>
                  ):(
                    <>{s.weight?`${s.weight} кг`:"—"} × {s.reps?`${s.reps} повт`:"—"}</>
                  )}
                </div>
              ))}
            </div>
            {exercise.comment&&<div className="ex-hist-comment">{exercise.comment}</div>}
          </div>
        ))}
      </div>
    );
  }

  return(
    <div className="page">
      <div className="det-hd">
        <button className="back-btn" onClick={onBack}><IconChevron dir="left"/>Назад</button>
        <span className="det-title">{data.name}</span>
      </div>
      {hasNothing
        ?<div className="empty"><div className="empty-icon">🔒</div>Профиль скрыт<br/>Пользователь не открыл доступ к просмотру</div>
        :(
          <>
            <div className="sub-tabs">
              {data.show_workouts&&<button className={subTab===0?"active":""} onClick={()=>setSubTab(0)}>Тренировки</button>}
              {data.show_exercises&&<button className={subTab===1?"active":""} onClick={()=>setSubTab(1)}>Упражнения</button>}
              {data.show_measurements&&<button className={subTab===2?"active":""} onClick={()=>setSubTab(2)}>Замеры</button>}
            </div>
            {subTab===0&&data.show_workouts&&(
              workouts.length===0
                ?<div className="empty"><div className="empty-icon">🏋️</div>Тренировок пока нет</div>
                :[...workouts].sort((a,b)=>b.date.localeCompare(a.date)).map(w=>(
                  <div key={w.id} className="w-ex" style={{marginBottom:10}}>
                    <div className="w-ex-name" style={{display:"flex",justifyContent:"space-between"}}>
                      <span>{w.name}</span><span style={{color:"#555",fontWeight:400,fontSize:12}}>{formatDate(w.date)}</span>
                    </div>
                    <div className="w-sets">
                      {w.exercises.map((ex,ei)=>(
                        <div key={ei} style={{marginBottom:12}}>
                          <div style={{fontSize:13,color:"#AAA",marginBottom:4,fontWeight:600}}>{ex.name||`Упражнение ${ei+1}`}</div>
                          {ex.sets.map((s,si)=>(
                            <div key={si} className="w-set-row">
                              <span className="w-set-n">{si+1}</span>
                              {s.bilateral?(
                                <span className="w-set-v w-set-bi">
                                  <span className="w-set-bi-side"><span style={{color:"#5B9CF6",fontSize:10}}>Л</span> {s.weightL?`${s.weightL} кг`:"—"} × {s.repsL||"—"}</span>
                                  <span className="w-set-bi-sep">|</span>
                                  <span className="w-set-bi-side"><span style={{color:"#F6845B",fontSize:10}}>П</span> {s.weightR?`${s.weightR} кг`:"—"} × {s.repsR||"—"}</span>
                                </span>
                              ):(
                                <span className="w-set-v">{s.weight?`${s.weight} кг`:"—"} × {s.reps||"—"} повт</span>
                              )}
                            </div>
                          ))}
                          {ex.comment&&<div className="w-ex-comment" style={{borderTop:"none",paddingLeft:0}}>{ex.comment}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
            {subTab===1&&data.show_exercises&&(
              allNames.length===0
                ?<div className="empty"><div className="empty-icon">📝</div>Упражнений пока нет</div>
                :allNames.map(name=>{
                  const count=workouts.filter(w=>w.exercises.some(e=>e.name.trim().toLowerCase()===name.toLowerCase())).length;
                  return(
                    <div key={name} className="card" onClick={()=>setSelectedEx(name)}>
                      <div style={{minWidth:0}}>
                        <div className="card-title">{name}</div>
                        <div className="card-sub">{count} {count===1?"запись":count<5?"записи":"записей"}</div>
                      </div>
                      <IconChevron/>
                    </div>
                  );
                })
            )}
            {subTab===2&&data.show_measurements&&(
              friendMeasurements.length===0
                ?<div className="empty"><div className="empty-icon">📏</div>Замеров пока нет</div>
                :[...friendMeasurements].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>{
                  const filled=MEASUREMENT_FIELDS.filter(f=>m[f.key]!==""&&m[f.key]!=null);
                  return(
                    <div key={m.id} className="w-ex" style={{marginBottom:10}}>
                      <div className="w-ex-name" style={{display:"flex",justifyContent:"space-between"}}>
                        <span>{m.name}</span><span style={{color:"#555",fontWeight:400,fontSize:12}}>{formatDate(m.date)}</span>
                      </div>
                      {filled.length===0
                        ?<p style={{color:"#555",fontSize:12,marginTop:8}}>Ничего не заполнено</p>
                        :filled.map(f=>(
                          <div key={f.key} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:"1px solid #1A1A1A"}}>
                            <span style={{color:"#888",fontSize:12}}>{f.label}</span>
                            <span style={{fontSize:13,fontWeight:600}}>{m[f.key]} <span style={{color:"#555",fontWeight:400,fontSize:11}}>{f.key==="weight"?"кг":"см"}</span></span>
                          </div>
                        ))}
                    </div>
                  );
                })
            )}
          </>
        )}
      <hr className="divider"/>
      <button className="btn danger" onClick={onRemove}>Удалить из друзей</button>
    </div>
  );
}

// ── ProfileTab ────────────────────────────────────────────────────────────
function ProfileTab({profiles, setProfiles, friends, setFriends, onProfileSwitch, toast, hasUnsavedDrafts}) {
  const [detailId,setDetailId]=useState(null);
  const [renamingId,setRenamingId]=useState(null);
  const [renameVal,setRenameVal]=useState("");
  const [showCreate,setShowCreate]=useState(false);

  const [friendQuery,setFriendQuery]=useState("");
  const [friendResults,setFriendResults]=useState(null);
  const [searching,setSearching]=useState(false);
  const [openFriendId,setOpenFriendId]=useState(null);
  const [inviteBusy,setInviteBusy]=useState(false);

  const detail=detailId!=null?profiles.find(p=>p.id===detailId):null;

  const startRename=(p)=>{setRenamingId(p.id);setRenameVal(p.name);};
  const commitRename=async(id)=>{
    if(!renameVal.trim()){setRenamingId(null);return;}
    await api.updateProfile(id,{name:renameVal.trim()});
    setProfiles(prev=>prev.map(p=>p.id===id?{...p,name:renameVal.trim()}:p));
    setRenamingId(null);
  };

  const handleToggle=async(id,field,value)=>{
    await api.updateProfile(id,{[field]:value});
    if(field==="is_main"&&value){
      setProfiles(prev=>prev.map(p=>p.id===id?{...p,is_main:true}:{...p,is_main:false}));
    }else{
      setProfiles(prev=>prev.map(p=>p.id===id?{...p,[field]:value}:p));
    }
    toast("Сохранено ✓");
  };

  const [exportBusy,setExportBusy]=useState(false);
  const handleExport=async(profile)=>{
    setExportBusy(true);
    const fileName=`${(profile.name||"профиль").replace(/[\\/:*?"<>|]/g,"_")}.txt`;
    try{
      const tg=window.Telegram?.WebApp;
      if(tg && typeof tg.downloadFile==="function"){
        // Внутри Telegram (особенно на iOS) обычная Blob-ссылка не скачивается —
        // файл просто открывается на просмотр, без возможности сохранить/скопировать.
        // downloadFile просит скачать сам клиент Telegram — для этого нужна прямая
        // ссылка без наших кастомных заголовков, поэтому берём одноразовый токен.
        const {token}=await api.createExportToken(profile.id);
        const url=`${API_URL}/profiles/${profile.id}/export?token=${token}`;
        tg.downloadFile({url,file_name:fileName},()=>{});
      }else{
        const text=await api.exportProfile(profile.id);
        const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url;
        a.download=fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }catch(e){
      window.alert("Не удалось выгрузить данные");
    }
    setExportBusy(false);
  };

  const handleActivate=async(id)=>{
    if(hasUnsavedDrafts && !window.confirm("У тебя есть несохранённая тренировка или замер — при переключении профиля они будут потеряны. Переключить профиль?")) return;
    await api.activateProfile(id);
    setProfiles(prev=>prev.map(p=>({...p,is_active:p.id===id})));
    onProfileSwitch();
    setDetailId(null);
    toast("Профиль активен ✓");
  };

  const handleDelete=async(id)=>{
    const wasActiveBefore=profiles.find(p=>p.id===id)?.is_active;
    let msg="Удалить профиль? Все его тренировки, упражнения и замеры удалятся без возможности восстановления.";
    if(wasActiveBefore && hasUnsavedDrafts) msg+="\n\nТакже у тебя есть несохранённая тренировка или замер — они будут потеряны.";
    if(!window.confirm(msg))return;
    try{
      const wasActive=wasActiveBefore;
      await api.deleteProfile(id);
      setProfiles(prev=>prev.filter(p=>p.id!==id));
      setDetailId(null);
      if(wasActive) onProfileSwitch();
      toast("Профиль удалён");
    }catch(e){
      window.alert("Нельзя удалить последний профиль");
    }
  };

  const handleCreate=async(name)=>{
    const res=await api.createProfile(name);
    setProfiles(prev=>[...prev,{id:res.id,name,is_main:false,is_active:false,show_workouts:true,show_exercises:true,show_comments:true,show_measurements:true}]);
    setShowCreate(false);
    toast("Профиль создан ✓");
  };

  const handleInvite=async()=>{
    if(!BOT_USERNAME){
      window.alert("Юзернейм бота не настроен. Добавь VITE_BOT_USERNAME в переменные окружения фронтенда.");
      return;
    }
    setInviteBusy(true);
    try{
      const {code}=await api.getInviteCode();
      const link=`https://t.me/${BOT_USERNAME}?start=add_${code}`;
      const shareUrl=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Присоединяйся к моему дневнику тренировок 💪")}`;
      if(window.Telegram?.WebApp?.openTelegramLink){
        window.Telegram.WebApp.openTelegramLink(shareUrl);
      }else{
        window.open(shareUrl,"_blank");
      }
    }catch(e){
      toast("Не удалось создать ссылку");
    }
    setInviteBusy(false);
  };

  const handleSearch=async()=>{
    if(!friendQuery.trim())return;
    setSearching(true);
    try{
      const res=await api.searchFriend(friendQuery.trim());
      setFriendResults(res);
    }catch(e){
      setFriendResults([]);
    }
    setSearching(false);
  };

  const handleAddByUsername=async(result)=>{
    try{
      await api.addFriendByUsername(result.username);
      setFriendResults(null);
      setFriendQuery("");
      setFriends(prev=>[...prev, {id:result.id, username:result.username, name:result.name}]);
      toast("Друг добавлен ✓");
    }catch(e){
      window.alert("Не удалось добавить — возможно пользователь ещё не открывал приложение");
    }
  };

  const handleRemoveFriend=async(id)=>{
    if(!window.confirm("Удалить из друзей?"))return;
    await api.removeFriend(id);
    setFriends(prev=>prev.filter(f=>f.id!==id));
  };

  if(openFriendId) return (
    <FriendProfileView
      friendId={openFriendId}
      onBack={()=>setOpenFriendId(null)}
      onRemove={async()=>{await handleRemoveFriend(openFriendId);setOpenFriendId(null);}}
    />
  );

  if(detail){
    return(
      <div className="page">
        <div className="det-hd">
          <button className="back-btn" onClick={()=>{setDetailId(null);setRenamingId(null);}}><IconChevron dir="left"/>Назад</button>
          {renamingId===detail.id
            ?<input className="rename-inp" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onBlur={()=>commitRename(detail.id)} onKeyDown={e=>e.key==="Enter"&&commitRename(detail.id)} autoFocus/>
            :<span className="det-title">{detail.name}</span>}
          <button className="del-btn" onClick={()=>startRename(detail)}><IconEdit/></button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {detail.is_active&&<span className="badge-active">Активен</span>}
          {detail.is_main&&<span className="badge-main">Основной</span>}
        </div>
        <div className="sec-lbl">Настройки видимости для друзей</div>
        <ToggleRow label="Сделать профиль основным" sub="Именно этот профиль будут видеть друзья" checked={detail.is_main} onChange={v=>handleToggle(detail.id,"is_main",v)}/>
        <ToggleRow label="Отображать тренировки" checked={detail.show_workouts} onChange={v=>handleToggle(detail.id,"show_workouts",v)}/>
        <ToggleRow label="Отображать упражнения" checked={detail.show_exercises} onChange={v=>handleToggle(detail.id,"show_exercises",v)}/>
        <ToggleRow label="Отображать замеры" checked={detail.show_measurements} onChange={v=>handleToggle(detail.id,"show_measurements",v)}/>
        <ToggleRow label="Отображать комментарии к упражнениям" checked={detail.show_comments} onChange={v=>handleToggle(detail.id,"show_comments",v)}/>
        <div style={{height:20}}/>
        <button className="btn ghost" onClick={()=>handleExport(detail)} disabled={exportBusy}>
          {exportBusy?"Готовим файл...":"Выгрузить тренировки и замеры (.txt)"}
        </button>
        {!detail.is_active&&<button className="btn" onClick={()=>handleActivate(detail.id)}>Сделать активным</button>}
        {profiles.length>1&&<button className="btn danger" onClick={()=>handleDelete(detail.id)}>Удалить профиль</button>}
      </div>
    );
  }

  return(
    <div className="page">
      <button className="btn" onClick={()=>setShowCreate(true)}><IconPlus/>Новый профиль</button>
      {profiles.map(p=>(
        <div key={p.id} className="card" onClick={()=>setDetailId(p.id)}>
          <div style={{minWidth:0}}>
            <div className="card-title">{p.name}</div>
            <div className="card-sub" style={{display:"flex",gap:6,marginTop:5}}>
              {p.is_active&&<span className="badge-active">Активен</span>}
              {p.is_main&&<span className="badge-main">Основной</span>}
            </div>
          </div>
          <IconChevron/>
        </div>
      ))}

      <div className="sec-lbl" style={{marginTop:32}}>Друзья</div>
      <button className="btn ghost" onClick={handleInvite} disabled={inviteBusy}>
        <IconLink/>{inviteBusy?"Готовим ссылку...":"Пригласить друга"}
      </button>
      <div className="search-row">
        <input className="inp" placeholder="Юзернейм друга" value={friendQuery} onChange={e=>setFriendQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
        <button className="search-btn" onClick={handleSearch} disabled={searching}>{searching?"...":"Найти"}</button>
      </div>
      {friendResults&&(
        friendResults.length===0
          ?<p style={{color:"#555",fontSize:13,marginBottom:14}}>Никого не нашли</p>
          :friendResults.map(r=>(
            <div key={r.id} className="search-result">
              <span>{r.name}{r.username&&<span style={{color:"#555"}}> · @{r.username}</span>}</span>
              <button className="edit-badge" onClick={()=>handleAddByUsername(r)}>Добавить</button>
            </div>
          ))
      )}

      {friends.length===0
        ?<p style={{color:"#555",fontSize:13,marginTop:4}}>Пока нет друзей — пригласи через ссылку или найди по юзернейму</p>
        :friends.map(f=>(
          <div key={f.id} className="card" onClick={()=>setOpenFriendId(f.id)}>
            <div className="friend-row" style={{minWidth:0}}>
              <div className="avatar">{(f.name||"?")[0].toUpperCase()}</div>
              <div style={{minWidth:0}}>
                <div className="card-title">{f.name}</div>
                {f.username&&<div className="card-sub">@{f.username}</div>}
              </div>
            </div>
            <IconChevron/>
          </div>
        ))}

      {showCreate&&<ProfileCreateSheet onSave={handleCreate} onClose={()=>setShowCreate(false)}/>}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState(0);
  const [workouts,setWorkouts]=useState([]);
  const [measurements,setMeasurements]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [friends,setFriends]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [toastMsg,setToastMsg]=useState("");
  const [workoutDraft,setWorkoutDraft]=useState(null); // {editId, name, date, exercises, restoring}
  const [measurementDraft,setMeasurementDraft]=useState(null); // {editId, name, date, vals, restoring}

  const showToast=(msg)=>{
    setToastMsg(msg);
    setTimeout(()=>setToastMsg(""),2200);
  };

  // Инициализация Telegram Mini App: сообщаем что приложение готово и
  // разворачиваем на всю доступную высоту (обычный режим, без requestFullscreen —
  // он давал непредсказуемые наезды на системные элементы на разных телефонах).
  useEffect(()=>{
    const tg = window.Telegram?.WebApp;
    if(!tg) return;
    tg.ready?.();
    tg.expand?.();
  },[]);

  // Загружаем вообще всё один раз при старте: тренировки, замеры, профили, друзей.
  // Вкладка "Профиль" больше не делает свой отдельный запрос при каждом открытии —
  // она просто показывает то, что уже лежит в памяти приложения.

  // Только дневник (тренировки/замеры) — используется при переключении активного
  // профиля, когда список профилей и друзей не изменился, менять их незачем.
  const reloadDiaryOnly=()=>{
    setLoading(true);
    Promise.all([api.getWorkouts(), api.getMeasurements()])
      .then(([w,m])=>{
        setWorkouts([...w].reverse());
        setMeasurements([...m].reverse());
        setLoading(false);
      })
      .catch(()=>{
        setError("Не удалось подключиться к серверу.\nПроверь что бэкенд запущен.");
        setLoading(false);
      });
  };

  const initialLoad = async () => {
    // Ссылка-приглашение всегда в формате t.me/бот?start=add_XXXX (обычный
    // диплинк бота) — он гарантированно создаёт/открывает диалог с ботом и
    // тот присылает сообщение с кнопкой запуска. Формат ?startapp= технически
    // тоже поддерживается (Menu Button настроен), но открывает Mini App в
    // обход чата с ботом — диалог не создаётся, поэтому для инвайтов не используется.
    // Проверяем оба источника на случай если где-то всё же попадётся startapp-ссылка.
    const params = new URLSearchParams(window.location.search);
    const nativeParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    const legacyParam = params.get("invite");
    const rawInvite = legacyParam || nativeParam;
    let justAddedFriend = false;

    if(rawInvite && rawInvite.startsWith("add_")){
      const code = rawInvite.slice(4);
      if(legacyParam){
        // Оставляет след в адресной строке — вычищаем, иначе при повторном
        // открытии той же кнопки приглашение будет "срабатывать" заново.
        params.delete("invite");
        const cleanUrl = window.location.pathname + (params.toString()?`?${params.toString()}`:"") + window.location.hash;
        window.history.replaceState({}, "", cleanUrl);
      }

      try{
        const before = await api.getFriends();
        await api.addFriendByCode(code);
        const after = await api.getFriends();
        justAddedFriend = after.length > before.length;
      }catch(e){
        // ссылка невалидна или уже друзья — молча игнорируем
      }
    }

    setError(null);
    setLoading(true);
    try{
      const [w,m,p,f] = await Promise.all([api.getWorkouts(), api.getMeasurements(), api.getProfiles(), api.getFriends()]);
      setWorkouts([...w].reverse()); // сервер даёт DESC, нам нужен ASC для логики
      setMeasurements([...m].reverse());
      setProfiles(p);
      setFriends(f);
      setLoading(false);
      if(justAddedFriend) showToast("Вы добавлены в друзья ✓");

      // Если процесс приложения был убит в фоне до того, как незавершённая
      // тренировка/замер была сохранена или явно закрыта — предлагаем её
      // восстановить (тем же плавающим блоком, что и при обычном сворачивании).
      // Тренировка и замер проверяются независимо — оба черновика могут
      // существовать одновременно.
      const storedWorkout = loadDraftFromStorage("workout");
      if(storedWorkout) setWorkoutDraft({...storedWorkout, restoring:false});
      const storedMeasurement = loadDraftFromStorage("measurement");
      if(storedMeasurement) setMeasurementDraft({...storedMeasurement, restoring:false});
    }catch(e){
      // Бэкенд на Railway может "просыпаться" несколько секунд после простоя —
      // api.js уже делает несколько попыток сам, это резервный случай на будущее.
      setError("Не удалось подключиться к серверу.\nЭто может занять несколько секунд, если сервер долго не использовался — попробуй ещё раз.");
      setLoading(false);
    }
  };

  useEffect(()=>{ initialLoad(); },[]);

  // После переключения/удаления активного профиля дневник меняется — оба
  // черновика относятся к старому профилю и больше не актуальны, сбрасываем их.
  const handleProfileSwitch=()=>{
    setWorkoutDraft(null);
    setMeasurementDraft(null);
    reloadDiaryOnly();
  };

  if(loading) return(
    <>
      <style>{css}</style>
      <div className="app-frame">
        <div className="loading"><div className="spinner"/><div>Загрузка...</div></div>
      </div>
    </>
  );

  if(error) return(
    <>
      <style>{css}</style>
      <div className="app-frame">
        <div className="empty" style={{paddingTop:80}}>
          <div className="empty-icon">⚠️</div>
          <div style={{whiteSpace:"pre-line",marginBottom:20}}>{error}</div>
          <button className="btn" style={{maxWidth:200,margin:"0 auto"}} onClick={initialLoad}>Попробовать снова</button>
        </div>
      </div>
    </>
  );

  // Показываем плавающий блок для черновика тренировки, только если мы НЕ на
  // вкладке Тренировки (там он уже виден прямо в списке на своём месте).
  const showWorkoutBar = workoutDraft && !workoutDraft.restoring && tab!==0;
  // Аналогично для замера — прячем на вкладке Замеры.
  const showMeasurementBar = measurementDraft && !measurementDraft.restoring && tab!==2;

  // Есть ли несохранённые данные в черновиках — если да, при переключении
  // профиля (или удалении активного) предупреждаем, что они будут потеряны.
  const hasUnsavedDrafts =
    (!!workoutDraft && workoutDraftHasData(workoutDraft.exercises)) ||
    (!!measurementDraft && measurementDraftHasData(measurementDraft.vals));

  return(
    <>
      <style>{css}</style>
      <div className="app-frame">
        <div className="tab-bar">
          {["Тренировки","Упражнения","Замеры","Профиль"].map((t,i)=>(
            <button key={i} className={`tab${tab===i?" active":""}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
        {tab===0&&<WorkoutsTab workouts={workouts} setWorkouts={setWorkouts} toast={showToast} workoutDraft={workoutDraft} setWorkoutDraft={setWorkoutDraft}/>}
        {tab===1&&<ExercisesTab workouts={workouts} setWorkouts={setWorkouts} toast={showToast}/>}
        {tab===2&&<MeasurementsTab measurements={measurements} setMeasurements={setMeasurements} toast={showToast} measurementDraft={measurementDraft} setMeasurementDraft={setMeasurementDraft}/>}
        {tab===3&&<ProfileTab profiles={profiles} setProfiles={setProfiles} friends={friends} setFriends={setFriends} onProfileSwitch={handleProfileSwitch} toast={showToast} hasUnsavedDrafts={hasUnsavedDrafts}/>}
        {(showWorkoutBar||showMeasurementBar)&&(
          <div className="draft-bars-wrap">
            {showWorkoutBar&&(
              <div className="draft-bar" onClick={()=>{
                setWorkoutDraft(p=>({...p,restoring:true}));
                setTab(0);
              }}>
                <span className="draft-bar-dot"/>
                <div className="draft-bar-text">
                  <div className="draft-bar-title">{workoutDraft.name || "Тренировка"}</div>
                  <div className="draft-bar-sub">Тренировка не сохранена · нажми чтобы продолжить</div>
                </div>
                <button className="draft-bar-close" onClick={(e)=>{e.stopPropagation();if(window.confirm("Отменить незавершённую запись? Данные будут потеряны.")){clearDraftFromStorage("workout");setWorkoutDraft(null);}}}><IconClose/></button>
              </div>
            )}
            {showMeasurementBar&&(
              <div className="draft-bar" onClick={()=>{
                setMeasurementDraft(p=>({...p,restoring:true}));
                setTab(2);
              }}>
                <span className="draft-bar-dot"/>
                <div className="draft-bar-text">
                  <div className="draft-bar-title">{measurementDraft.name || "Замер"}</div>
                  <div className="draft-bar-sub">Замер не сохранён · нажми чтобы продолжить</div>
                </div>
                <button className="draft-bar-close" onClick={(e)=>{e.stopPropagation();if(window.confirm("Отменить незавершённую запись? Данные будут потеряны.")){clearDraftFromStorage("measurement");setMeasurementDraft(null);}}}><IconClose/></button>
              </div>
            )}
          </div>
        )}
        <Toast msg={toastMsg}/>
      </div>
    </>
  );
}
