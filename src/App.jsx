import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.js";

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso) => { try { const [y,m,d]=iso.split("-"); return `${d}.${m}.${y}`; } catch { return iso; } };

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

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0A;color:#FFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;-webkit-font-smoothing:antialiased}
.app-frame{max-width:390px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:#0A0A0A}
.tab-bar{display:flex;border-bottom:1px solid #2A2A2A;background:#0A0A0A;position:sticky;top:0;z-index:10}
.tab{flex:1;padding:14px 4px;text-align:center;font-size:12px;font-weight:500;letter-spacing:.02em;text-transform:uppercase;color:#555;cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s;background:none;border-left:none;border-right:none;border-top:none;user-select:none}
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
.sheet{background:#0A0A0A;border-top:1px solid #2A2A2A;max-height:92dvh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 16px 40px;animation:up .22s ease;scroll-behavior:auto}
@keyframes up{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
.handle{width:36px;height:4px;background:#333;margin:12px auto 16px}
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
.set-row{display:flex;align-items:center;gap:6px;margin-bottom:8px;width:100%;min-width:0}
.set-n{font-size:11px;color:#444;text-align:center;flex-shrink:0;width:18px}
.set-inp{background:#1A1A1A;border:1px solid #252525;color:#FFF;font-size:14px;padding:8px 6px;outline:none;font-family:inherit;text-align:center;-webkit-appearance:none;min-width:0;width:0;flex:1}
.set-inp:focus{border-color:#555}
.set-inp::placeholder{color:#3A3A3A;font-size:12px}
.set-sep{color:#444;text-align:center;font-size:13px;flex-shrink:0;width:10px}
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
.w-set-n{color:#444;width:20px}
.w-set-v{color:#CCC}
.rename-inp{background:none;border:none;border-bottom:1px solid #444;color:#FFF;font-size:17px;font-weight:700;letter-spacing:-.02em;outline:none;font-family:inherit;flex:1;min-width:0;padding-bottom:2px}
.tag{display:inline-block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#555;border:1px solid #2A2A2A;padding:2px 6px;flex-shrink:0}
.divider{border:none;border-top:1px solid #1E1E1E;margin:16px 0}
.empty{text-align:center;padding:48px 24px;color:#444;font-size:14px;line-height:1.6}
.empty-icon{font-size:32px;margin-bottom:12px;opacity:.4}
.m-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.m-grid .field{margin-bottom:0}
.edit-badge{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#888;border:1px solid #2A2A2A;padding:3px 8px;cursor:pointer;background:none;font-family:inherit;flex-shrink:0}
.edit-badge:active{border-color:#FFF;color:#FFF}
.loading{text-align:center;padding:60px 24px;color:#444;font-size:13px}
.spinner{width:24px;height:24px;border:2px solid #2A2A2A;border-top-color:#FFF;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;border:1px solid #333;color:#CCC;font-size:13px;padding:10px 18px;z-index:200;white-space:nowrap;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
`;

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
function WorkoutSheet({ workouts, initial, onSave, onClose }) {
  const isEdit = !!initial;
  const defName = isEdit ? initial.name : `Тренировка ${workouts.length + 1}`;
  const [name, setName] = useState(defName);
  const [date, setDate] = useState(isEdit ? initial.date : today());
  const [exercises, setExercises] = useState(
    isEdit && initial.exercises.length > 0
      ? initial.exercises.map(e=>({...e,id:e.id??Date.now()+Math.random(),sets:e.sets.map(s=>({...s}))}))
      : [newEx()]
  );
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef(null);
  useKeyboardScroll(sheetRef);
  useLockBodyScroll();

  const allExNames = [...new Set(
    workouts.filter(w=>!isEdit||w.id!==initial?.id).flatMap(w=>w.exercises.map(e=>e.name.trim()).filter(Boolean))
  )];

  function newEx(){return{id:Date.now()+Math.random(),name:"",sets:[newSet()],comment:""};}
  function newSet(){return{weight:"",reps:""};}
  const addEx=()=>setExercises(p=>[...p,newEx()]);
  const upEx=(id,f,v)=>setExercises(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
  const remEx=(id)=>setExercises(p=>p.filter(e=>e.id!==id));
  const addSet=(id)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:[...e.sets,newSet()]}:e));
  const upSet=(id,si,f,v)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,[f]:v}:s)}:e));
  const remSet=(id,si)=>setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.filter((_,i)=>i!==si)}:e));

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
    const filtered=exercises.filter(e=>e.name.trim()||e.sets.some(s=>s.weight||s.reps)).map(e=>({...e,sets:e.sets.filter(s=>s.weight||s.reps)}));
    const payload={id:isEdit?initial.id:-1,name:name.trim()||defName,date,exercises:filtered};
    const res=await onSave(payload);
    setSaving(false);
    return res;
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" ref={sheetRef}>
        <div className="handle"/>
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
                  {prev.exercise.sets.filter(s=>s.weight||s.reps).map((s,i,arr)=>`${s.weight?s.weight+"кг":"—"}×${s.reps||"—"}${i<arr.length-1?", ":""}`)}
                  {prev.exercise.comment?<><br/><span style={{fontStyle:"italic",color:"#555"}}>{prev.exercise.comment}</span></>:null}
                </div>
              )}
              <div className="sets">
                {ex.sets.map((s,si)=>(
                  <div key={si} className="set-row">
                    <span className="set-n">{si+1}</span>
                    <input className="set-inp" type="number" inputMode="decimal" placeholder="кг" value={s.weight} onChange={e=>upSet(ex.id,si,"weight",e.target.value)}/>
                    <span className="set-sep">×</span>
                    <input className="set-inp" type="number" inputMode="numeric" placeholder="повт" value={s.reps} onChange={e=>upSet(ex.id,si,"reps",e.target.value)}/>
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
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

// ── WorkoutsTab ───────────────────────────────────────────────────────────
function WorkoutsTab({workouts, setWorkouts, toast}) {
  const [showNew,setShowNew]=useState(false);
  const [editId,setEditId]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [renamingId,setRenamingId]=useState(null);
  const [renameVal,setRenameVal]=useState("");

  const detail=detailId!=null?workouts.find(w=>w.id===detailId):null;
  const editTarget=editId!=null?workouts.find(w=>w.id===editId):null;
  const nextId = null; // не используется — ID генерирует сервер

  const handleCreate=async(w)=>{
    const res=await api.saveWorkout(w);
    const saved={...w,id:res.id};
    setWorkouts(p=>[...p,saved]);
    setShowNew(false);
    toast("Тренировка сохранена ✓");
  };
  const handleUpdate=async(w)=>{
    await api.saveWorkout(w);
    setWorkouts(p=>p.map(x=>x.id===w.id?w:x));
    setEditId(null); setDetailId(w.id);
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
        <button className="edit-badge" onClick={()=>{setDetailId(null);setEditId(detail.id);}}>✎ Редактировать</button>
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
                  <span className="w-set-v">{s.weight?`${s.weight} кг`:"—"} × {s.reps||"—"} повт</span>
                </div>
              ))}
            </div>
            {ex.comment&&<div className="w-ex-comment">{ex.comment}</div>}
          </div>
        ))}
      <hr className="divider"/>
      <button className="btn danger" onClick={()=>handleDelete(detail.id)}>Удалить тренировку</button>
      {editTarget&&<WorkoutSheet workouts={workouts} initial={editTarget} onSave={handleUpdate} onClose={()=>setEditId(null)}/>}
    </div>
  );

  return (
    <div className="page">
      <button className="btn" onClick={()=>setShowNew(true)}><IconPlus/>Новая тренировка</button>
      {workouts.length===0
        ?<div className="empty"><div className="empty-icon">🏋️</div>Тренировок пока нет.<br/>Начни первую!</div>
        :[...workouts].sort((a,b)=>b.date.localeCompare(a.date)).map(w=>(
          <div key={w.id} className="card" onClick={()=>setDetailId(w.id)}>
            <div style={{minWidth:0}}>
              <div className="card-title">{w.name}</div>
              <div className="card-sub">{formatDate(w.date)} · {w.exercises.length} упр.</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <span className="tag">#{w.id}</span><IconChevron/>
            </div>
          </div>
        ))}
      {showNew&&<WorkoutSheet workouts={workouts} initial={null} onSave={handleCreate} onClose={()=>setShowNew(false)}/>}
      {editTarget&&<WorkoutSheet workouts={workouts} initial={editTarget} onSave={handleUpdate} onClose={()=>setEditId(null)}/>}
    </div>
  );
}

// ── ExercisesTab ──────────────────────────────────────────────────────────
function ExercisesTab({workouts, setWorkouts, toast}) {
  const [selected,setSelected]=useState(null);
  const [renamingEx,setRenamingEx]=useState(false);
  const [renameExVal,setRenameExVal]=useState("");

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
        <div className="sec-lbl">{history.length} записей</div>
        {history.map(({workout,exercise},i)=>(
          <div key={i} className="ex-hist-item">
            <div className="ex-hist-date">{formatDate(workout.date)} · {workout.name}</div>
            <div className="ex-sets-disp">
              {exercise.sets.filter(s=>s.weight||s.reps).map((s,si)=>(
                <div key={si}><span style={{color:"#555"}}>{si+1}.</span> {s.weight?`${s.weight} кг`:"—"} × {s.reps?`${s.reps} повт`:"—"}</div>
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
function MeasurementSheet({measurements, initial, onSave, onClose}) {
  const isEdit=!!initial;
  const defName=isEdit?initial.name:`Замер ${(measurements?.length||0) + 1}`;
  const [name,setName]=useState(defName);
  const [date,setDate]=useState(isEdit?initial.date:today());
  const [vals,setVals]=useState(()=>{
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
  const handleSave=async()=>{
    setSaving(true);
    await onSave({id:isEdit?initial.id:-1,name:name.trim()||defName,date,...vals});
    setSaving(false);
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" ref={sheetRef}>
        <div className="handle"/>
        <div className="sheet-title-row">
          <input className="sheet-title-inp" value={name} onChange={e=>setName(e.target.value)} placeholder={defName}/>
        </div>
        <div className="field">
          <div className="lbl">Дата</div>
          <input type="date" className="inp" value={date} onChange={e=>setDate(e.target.value)}/>
        </div>
        <div className="sec-lbl" style={{marginTop:16}}>Вес тела</div>
        <div className="field" style={{marginTop:8}}>
          <input className="inp" type="number" inputMode="decimal" placeholder="кг, например 82.5" value={vals["weight"]||""} onChange={e=>set("weight",e.target.value)}/>
        </div>
        <div className="sec-lbl" style={{marginTop:16}}>Замеры (см)</div>
        <div className="m-grid" style={{marginTop:8}}>
          {MEASUREMENT_FIELDS.slice(1).map(f=>(
            <div key={f.key} className="field">
              <div className="lbl">{f.label}</div>
              <input className="inp" type="number" inputMode="decimal" placeholder="см" value={vals[f.key]||""} onChange={e=>set(f.key,e.target.value)}/>
            </div>
          ))}
        </div>
        <div style={{height:20}}/>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving?"Сохранение...":(isEdit?"Сохранить изменения":"Сохранить замер")}</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

// ── MeasurementsTab ───────────────────────────────────────────────────────
function MeasurementsTab({measurements,setMeasurements,toast}) {
  const [showNew,setShowNew]=useState(false);
  const [editId,setEditId]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [renamingId,setRenamingId]=useState(null);
  const [renameVal,setRenameVal]=useState("");

  const detail=detailId!=null?measurements.find(m=>m.id===detailId):null;
  const editTarget=editId!=null?measurements.find(m=>m.id===editId):null;
  const nextId = null; // не используется — ID генерирует сервер

  const handleCreate=async(m)=>{
    const res=await api.saveMeasurement(m);
    const saved={...m,id:res.id};
    setMeasurements(p=>[...p,saved]);
    setShowNew(false);
    toast("Замер сохранён ✓");
  };
  const handleUpdate=async(m)=>{
    await api.saveMeasurement(m);
    setMeasurements(p=>p.map(x=>x.id===m.id?m:x));
    setEditId(null); setDetailId(m.id);
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

  if(detail){
    const filled=MEASUREMENT_FIELDS.filter(f=>detail[f.key]!==""&&detail[f.key]!=null);
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
          <button className="edit-badge" onClick={()=>{setDetailId(null);setEditId(detail.id);}}>✎ Редактировать</button>
        </div>
        <div className="sec-lbl">Показатели</div>
        {filled.length===0
          ?<p style={{color:"#555",fontSize:13}}>Ничего не заполнено</p>
          :filled.map(f=>(
            <div key={f.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1A1A1A"}}>
              <span style={{color:"#888",fontSize:13}}>{f.label}</span>
              <span style={{fontWeight:600,fontSize:15}}>{detail[f.key]} <span style={{color:"#555",fontWeight:400,fontSize:12}}>{f.key==="weight"?"кг":"см"}</span></span>
            </div>
          ))}
        <hr className="divider"/>
        <button className="btn danger" onClick={()=>handleDelete(detail.id)}>Удалить замер</button>
        {editTarget&&<MeasurementSheet measurements={measurements} initial={editTarget} onSave={handleUpdate} onClose={()=>setEditId(null)}/>}
      </div>
    );
  }
  return(
    <div className="page">
      <button className="btn" onClick={()=>setShowNew(true)}><IconPlus/>Измерить тело</button>
      {measurements.length===0
        ?<div className="empty"><div className="empty-icon">📏</div>Замеров пока нет.<br/>Добавь первый!</div>
        :[...measurements].reverse().map(m=>{
          const fc=MEASUREMENT_FIELDS.filter(f=>m[f.key]!==""&&m[f.key]!=null).length;
          return(
            <div key={m.id} className="card" onClick={()=>setDetailId(m.id)}>
              <div style={{minWidth:0}}>
                <div className="card-title">{m.name}</div>
                <div className="card-sub">{formatDate(m.date)} · {fc} показателей</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <span className="tag">#{m.id}</span><IconChevron/>
              </div>
            </div>
          );
        })}
      {showNew&&<MeasurementSheet measurements={measurements} initial={null} onSave={handleCreate} onClose={()=>setShowNew(false)}/>}
      {editTarget&&<MeasurementSheet measurements={measurements} initial={editTarget} onSave={handleUpdate} onClose={()=>setEditId(null)}/>}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState(0);
  const [workouts,setWorkouts]=useState([]);
  const [measurements,setMeasurements]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [toastMsg,setToastMsg]=useState("");

  const showToast=(msg)=>{
    setToastMsg(msg);
    setTimeout(()=>setToastMsg(""),2200);
  };

  useEffect(()=>{
    Promise.all([api.getWorkouts(), api.getMeasurements()])
      .then(([w,m])=>{
        setWorkouts([...w].reverse()); // сервер даёт DESC, нам нужен ASC для логики
        setMeasurements([...m].reverse());
        setLoading(false);
      })
      .catch(()=>{
        setError("Не удалось подключиться к серверу.\nПроверь что бэкенд запущен.");
        setLoading(false);
      });
  },[]);

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
          <div style={{whiteSpace:"pre-line"}}>{error}</div>
        </div>
      </div>
    </>
  );

  return(
    <>
      <style>{css}</style>
      <div className="app-frame">
        <div className="tab-bar">
          {["Тренировки","Упражнения","Замеры"].map((t,i)=>(
            <button key={i} className={`tab${tab===i?" active":""}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
        {tab===0&&<WorkoutsTab workouts={workouts} setWorkouts={setWorkouts} toast={showToast}/>}
        {tab===1&&<ExercisesTab workouts={workouts} setWorkouts={setWorkouts} toast={showToast}/>}
        {tab===2&&<MeasurementsTab measurements={measurements} setMeasurements={setMeasurements} toast={showToast}/>}
        <Toast msg={toastMsg}/>
      </div>
    </>
  );
}
