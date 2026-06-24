import { useState, useEffect, useCallback, useRef } from "react";

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso) => { try { const [y,m,d]=iso.split("-"); return `${d}.${m}.${y}`; } catch { return iso; } };
const STORAGE_KEY = "gym_diary_v1";
const loadData = () => { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):null; } catch{return null;} };
const saveData = (d) => { try{localStorage.setItem(STORAGE_KEY,JSON.stringify(d));}catch{} };
const initialState = { workouts: [], measurements: [] };

const MEASUREMENT_FIELDS = [
  {key:"weight",label:"Вес тела"},{key:"waist",label:"Талия"},{key:"chest",label:"Грудь"},
  {key:"shoulders",label:"Плечи"},{key:"armRight",label:"Правая рука"},{key:"armLeft",label:"Левая рука"},
  {key:"forearmRight",label:"Правое предплечье"},{key:"forearmLeft",label:"Левое предплечье"},
  {key:"glutes",label:"Ягодицы"},{key:"quadRight",label:"Правый квадрицепс"},{key:"quadLeft",label:"Левый квадрицепс"},
  {key:"calfRight",label:"Правая икра"},{key:"calfLeft",label:"Левая икра"},
];

const IconPlus = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 7.5h3l.5-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconChevron = ({dir="right"}) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{transform:dir==="left"?"rotate(180deg)":dir==="down"?"rotate(90deg)":""}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0A;color:#FFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;-webkit-font-smoothing:antialiased}
.app-frame{max-width:390px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:#0A0A0A;position:relative}
.tab-bar{display:flex;border-bottom:1px solid #2A2A2A;background:#0A0A0A;position:sticky;top:0;z-index:10;flex-shrink:0}
.tab{flex:1;padding:14px 4px;text-align:center;font-size:12px;font-weight:500;letter-spacing:.02em;text-transform:uppercase;color:#555;cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s;background:none;border-left:none;border-right:none;border-top:none;user-select:none}
.tab.active{color:#FFF;border-bottom-color:#FFF}
.page{flex:1;overflow-y:auto;padding:16px;padding-bottom:32px}
.card{border:1px solid #2A2A2A;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;background:#111;display:flex;align-items:center;justify-content:space-between;gap:12px}
.card:active{border-color:#555}
.card-title{font-weight:600;font-size:15px}
.card-sub{font-size:12px;color:#666;margin-top:3px}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;border:1px solid #FFF;background:transparent;color:#FFF;font-size:14px;font-weight:600;letter-spacing:.02em;cursor:pointer;transition:background .15s,color .15s;margin-bottom:20px;user-select:none;font-family:inherit}
.btn:active{background:#FFF;color:#000}
.btn.ghost{border-color:#333;color:#888}
.btn.ghost:active{background:#1A1A1A;color:#FFF}
.btn.danger{border-color:#FF4444;color:#FF4444}
.btn.danger:active{background:#FF4444;color:#FFF}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:50;display:flex;flex-direction:column;justify-content:flex-end;max-width:390px;margin:0 auto}
.sheet{background:#0A0A0A;border-top:1px solid #2A2A2A;max-height:92dvh;overflow-y:auto;padding:0 16px 40px;animation:up .22s ease}
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
.ex-num{font-size:11px;color:#555;letter-spacing:.06em;flex-shrink:0;width:22px}
.ex-name-wrap{flex:1;position:relative;min-width:0}
.ex-name-inp{width:100%;background:none;border:none;color:#FFF;font-size:15px;font-weight:600;outline:none;font-family:inherit;padding:0}
.ex-name-inp::placeholder{color:#444;font-weight:400}
.suggestions{position:absolute;top:calc(100% + 6px);left:-14px;right:-14px;background:#1A1A1A;border:1px solid #333;z-index:100;max-height:160px;overflow-y:auto}
.suggestion-item{padding:10px 14px;font-size:14px;cursor:pointer;color:#CCC;transition:background .1s;border-bottom:1px solid #222}
.suggestion-item:last-child{border-bottom:none}
.suggestion-item:active{background:#2A2A2A}
.suggestion-match{color:#FFF;font-weight:600}
.prev{margin:0 14px;padding:8px 0 10px;font-size:12px;color:#555;border-bottom:1px solid #1A1A1A;font-style:italic}
.sets{padding:10px 14px}
.set-row{display:grid;grid-template-columns:22px 1fr 12px 1fr 32px;align-items:center;gap:8px;margin-bottom:8px}
.set-n{font-size:11px;color:#444;text-align:center}
.set-inp{background:#1A1A1A;border:1px solid #252525;color:#FFF;font-size:14px;padding:8px 10px;outline:none;font-family:inherit;text-align:center;transition:border-color .12s;-webkit-appearance:none}
.set-inp:focus{border-color:#555}
.set-inp::placeholder{color:#3A3A3A;font-size:12px}
.set-sep{color:#444;text-align:center;font-size:13px}
.del-btn{background:none;border:none;color:#444;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;transition:color .12s;line-height:1}
.del-btn:active{color:#FF4444}
.add-set{background:none;border:1px dashed #2A2A2A;color:#555;width:100%;padding:8px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;transition:border-color .12s,color .12s;margin-top:4px}
.add-set:active{border-color:#555;color:#999}
.add-ex{background:none;border:1px dashed #2A2A2A;color:#555;width:100%;padding:12px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;letter-spacing:.02em;transition:border-color .12s,color .12s;margin-bottom:16px}
.add-ex:active{border-color:#888;color:#CCC}
.det-hd{display:flex;align-items:center;gap:10px;padding:16px 0;border-bottom:1px solid #1E1E1E;margin-bottom:16px}
.back-btn{background:none;border:1px solid #2A2A2A;color:#FFF;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px;font-family:inherit;flex-shrink:0;transition:border-color .12s}
.back-btn:active{border-color:#FFF}
.det-title{font-size:17px;font-weight:700;letter-spacing:-.02em;flex:1;min-width:0}
.sec-lbl{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#444;margin-bottom:10px;margin-top:20px}
.sec-lbl:first-child{margin-top:0}
.ex-hist-item{border:1px solid #1E1E1E;padding:12px 14px;margin-bottom:8px;background:#111}
.ex-hist-date{font-size:11px;color:#555;margin-bottom:8px;letter-spacing:.04em}
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
.edit-badge{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#888;border:1px solid #2A2A2A;padding:3px 8px;cursor:pointer;transition:border-color .12s,color .12s;background:none;font-family:inherit;flex-shrink:0}
.edit-badge:active{border-color:#FFF;color:#FFF}
`;

// ── Autocomplete exercise name input ────────────────────────────────────────
function ExNameInput({ value, onChange, allExNames, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const suggestions = value.trim().length > 0
    ? allExNames.filter(n => n.toLowerCase().includes(value.trim().toLowerCase()) && n.toLowerCase() !== value.trim().toLowerCase())
    : [];

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const highlightMatch = (name) => {
    const idx = name.toLowerCase().indexOf(value.trim().toLowerCase());
    if (idx === -1) return <span>{name}</span>;
    return <span>{name.slice(0,idx)}<span className="suggestion-match">{name.slice(idx, idx+value.trim().length)}</span>{name.slice(idx+value.trim().length)}</span>;
  };

  return (
    <div className="ex-name-wrap" ref={wrapRef}>
      <input
        className="ex-name-inp"
        placeholder={placeholder || "Название упражнения"}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(s => (
            <div key={s} className="suggestion-item"
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}>
              {highlightMatch(s)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WorkoutSheet (create + edit) ────────────────────────────────────────────
function WorkoutSheet({ workouts, initial, onSave, onClose }) {
  const isEdit = !!initial;
  const nextId = isEdit ? initial.id : workouts.length + 1;
  const defaultName = isEdit ? initial.name : `Тренировка ${nextId}`;

  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(isEdit ? initial.date : today());
  const [exercises, setExercises] = useState(
    isEdit && initial.exercises.length > 0
      ? initial.exercises.map(e => ({ ...e, id: e.id ?? Date.now()+Math.random(), sets: e.sets.map(s=>({...s})) }))
      : [newExercise()]
  );

  const allExNames = [...new Set(
    workouts
      .filter(w => !isEdit || w.id !== initial.id)
      .flatMap(w => w.exercises.map(e => e.name.trim()).filter(Boolean))
  )];

  function newExercise() { return { id: Date.now()+Math.random(), name:"", sets:[newSet()] }; }
  function newSet() { return { weight:"", reps:"" }; }

  const addExercise = () => setExercises(p=>[...p,newExercise()]);
  const upEx = (id,f,v) => setExercises(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
  const remEx = (id) => setExercises(p=>p.filter(e=>e.id!==id));
  const addSet = (id) => setExercises(p=>p.map(e=>e.id===id?{...e,sets:[...e.sets,newSet()]}:e));
  const upSet = (id,si,f,v) => setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,[f]:v}:s)}:e));
  const remSet = (id,si) => setExercises(p=>p.map(e=>e.id===id?{...e,sets:e.sets.filter((_,i)=>i!==si)}:e));

  const getPrev = (exName) => {
    if (!exName.trim()) return null;
    const lc = exName.trim().toLowerCase();
    const source = isEdit
      ? workouts.filter(w => w.id !== initial.id)
      : workouts;
    for (let i = source.length-1; i>=0; i--) {
      const f = source[i].exercises.find(e=>e.name.toLowerCase()===lc);
      if (f) return { workout: source[i], exercise: f };
    }
    return null;
  };

  const handleSave = () => {
    const filtered = exercises
      .filter(e=>e.name.trim()||e.sets.some(s=>s.weight||s.reps))
      .map(e=>({...e,sets:e.sets.filter(s=>s.weight||s.reps)}));
    onSave({ id: nextId, name: name.trim() || defaultName, date, exercises: filtered });
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="handle"/>
        <div className="sheet-title-row">
          <input
            className="sheet-title-inp"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder={defaultName}
          />
        </div>

        <div className="field">
          <div className="lbl">Дата</div>
          <input type="date" className="inp" value={date} onChange={e=>setDate(e.target.value)}/>
        </div>

        <div className="sec-lbl" style={{marginTop:20,marginBottom:12}}>Упражнения</div>

        {exercises.map((ex,ei) => {
          const prev = getPrev(ex.name);
          return (
            <div key={ex.id} className="ex-block">
              <div className="ex-hd">
                <span className="ex-num">{ei+1}</span>
                <ExNameInput
                  value={ex.name}
                  onChange={v=>upEx(ex.id,"name",v)}
                  allExNames={allExNames}
                />
                {exercises.length>1 && <button className="del-btn" onClick={()=>remEx(ex.id)}><IconTrash/></button>}
              </div>
              {prev && (
                <div className="prev">
                  Прошлый раз ({formatDate(prev.workout.date)}):&nbsp;
                  {prev.exercise.sets.map((s,i)=>`${s.weight?s.weight+"кг":"—"} × ${s.reps||"—"}${i<prev.exercise.sets.length-1?", ":""}`)}
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
            </div>
          );
        })}

        <button className="add-ex" onClick={addExercise}><IconPlus/>Добавить упражнение</button>
        <button className="btn" onClick={handleSave}>{isEdit ? "Сохранить изменения" : "Сохранить тренировку"}</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

// ── WorkoutsTab ──────────────────────────────────────────────────────────────
function WorkoutsTab({data,updateData}) {
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const detail = detailId != null ? data.workouts.find(w=>w.id===detailId) : null;
  const editTarget = editId != null ? data.workouts.find(w=>w.id===editId) : null;

  const handleCreate = (w) => {
    updateData(prev=>({...prev,workouts:[...prev.workouts,w]}));
    setShowNew(false);
  };
  const handleUpdate = (w) => {
    updateData(prev=>({...prev,workouts:prev.workouts.map(x=>x.id===w.id?w:x)}));
    setEditId(null);
    setDetailId(w.id);
  };
  const handleDelete = (id) => {
    if(!window.confirm("Удалить тренировку?"))return;
    updateData(prev=>({...prev,workouts:prev.workouts.filter(w=>w.id!==id)}));
    setDetailId(null);
  };
  const startRename = (w) => { setRenamingId(w.id); setRenameVal(w.name); };
  const commitRename = (id) => {
    if(!renameVal.trim()){setRenamingId(null);return;}
    updateData(prev=>({...prev,workouts:prev.workouts.map(w=>w.id===id?{...w,name:renameVal.trim()}:w)}));
    setRenamingId(null);
  };

  if (detail) return (
    <div className="page">
      <div className="det-hd">
        <button className="back-btn" onClick={()=>setDetailId(null)}><IconChevron dir="left"/>Назад</button>
        {renamingId===detail.id
          ? <input className="rename-inp" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onBlur={()=>commitRename(detail.id)} onKeyDown={e=>e.key==="Enter"&&commitRename(detail.id)} autoFocus/>
          : <span className="det-title">{detail.name}</span>}
        <button className="del-btn" onClick={()=>startRename(detail)} title="Переименовать"><IconEdit/></button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <span style={{color:"#888",fontSize:13,flex:1,alignSelf:"center"}}>{formatDate(detail.date)}</span>
        <button className="edit-badge" onClick={()=>{ setDetailId(null); setEditId(detail.id); }}>
          ✎ Редактировать
        </button>
      </div>

      <div className="sec-lbl">Упражнения — {detail.exercises.length}</div>
      {detail.exercises.length===0
        ? <div className="empty"><div className="empty-icon">📋</div>Упражнения не записаны</div>
        : detail.exercises.map((ex,i)=>(
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
          </div>
        ))}

      <hr className="divider"/>
      <button className="btn danger" onClick={()=>handleDelete(detail.id)}>Удалить тренировку</button>

      {editTarget && (
        <WorkoutSheet
          workouts={data.workouts}
          initial={editTarget}
          onSave={handleUpdate}
          onClose={()=>setEditId(null)}
        />
      )}
    </div>
  );

  return (
    <div className="page">
      <button className="btn" onClick={()=>setShowNew(true)}><IconPlus/>Новая тренировка</button>
      {data.workouts.length===0
        ? <div className="empty"><div className="empty-icon">🏋️</div>Тренировок пока нет.<br/>Начни первую!</div>
        : [...data.workouts].reverse().map(w=>(
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

      {showNew && (
        <WorkoutSheet
          workouts={data.workouts}
          initial={null}
          onSave={handleCreate}
          onClose={()=>setShowNew(false)}
        />
      )}
      {editTarget && (
        <WorkoutSheet
          workouts={data.workouts}
          initial={editTarget}
          onSave={handleUpdate}
          onClose={()=>setEditId(null)}
        />
      )}
    </div>
  );
}

// ── ExercisesTab ─────────────────────────────────────────────────────────────
function ExercisesTab({data}) {
  const [selected,setSelected]=useState(null);
  const allNames=[...new Set(data.workouts.flatMap(w=>w.exercises.map(e=>e.name.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,"ru"));
  const getHistory=(name)=>{
    const lc=name.toLowerCase(),rows=[];
    data.workouts.forEach(w=>w.exercises.forEach(e=>{if(e.name.trim().toLowerCase()===lc)rows.push({workout:w,exercise:e});}));
    return rows.reverse();
  };
  if(selected){
    const history=getHistory(selected);
    return(
      <div className="page">
        <div className="det-hd">
          <button className="back-btn" onClick={()=>setSelected(null)}><IconChevron dir="left"/>Назад</button>
          <span className="det-title">{selected}</span>
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
            const count=data.workouts.filter(w=>w.exercises.some(e=>e.name.trim().toLowerCase()===name.toLowerCase())).length;
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

// ── MeasurementSheet (create + edit) ─────────────────────────────────────────
function MeasurementSheet({ count, initial, onSave, onClose }) {
  const isEdit = !!initial;
  const defaultName = isEdit ? initial.name : `Замер ${count}`;
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(isEdit ? initial.date : today());
  const [vals, setVals] = useState(() => {
    if (!isEdit) return {};
    const v = {};
    MEASUREMENT_FIELDS.forEach(f=>{ if(initial[f.key]!=null&&initial[f.key]!=="") v[f.key]=initial[f.key]; });
    return v;
  });
  const set = (k,v) => setVals(p=>({...p,[k]:v}));
  const handleSave = () => onSave({ id: isEdit?initial.id:count, name: name.trim()||defaultName, date, ...vals });

  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="handle"/>
        <div className="sheet-title-row">
          <input
            className="sheet-title-inp"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder={defaultName}
          />
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
        <button className="btn" onClick={handleSave}>{isEdit?"Сохранить изменения":"Сохранить замер"}</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

// ── MeasurementsTab ──────────────────────────────────────────────────────────
function MeasurementsTab({data,updateData}) {
  const [showNew,setShowNew]=useState(false);
  const [editId,setEditId]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [renamingId,setRenamingId]=useState(null);
  const [renameVal,setRenameVal]=useState("");

  const detail=detailId!=null?data.measurements.find(m=>m.id===detailId):null;
  const editTarget=editId!=null?data.measurements.find(m=>m.id===editId):null;

  const handleCreate=(m)=>{updateData(prev=>({...prev,measurements:[...prev.measurements,m]}));setShowNew(false);};
  const handleUpdate=(m)=>{updateData(prev=>({...prev,measurements:prev.measurements.map(x=>x.id===m.id?m:x)}));setEditId(null);setDetailId(m.id);};
  const handleDelete=(id)=>{if(!window.confirm("Удалить замер?"))return;updateData(prev=>({...prev,measurements:prev.measurements.filter(m=>m.id!==id)}));setDetailId(null);};
  const startRename=(m)=>{setRenamingId(m.id);setRenameVal(m.name);};
  const commitRename=(id)=>{if(!renameVal.trim()){setRenamingId(null);return;}updateData(prev=>({...prev,measurements:prev.measurements.map(m=>m.id===id?{...m,name:renameVal.trim()}:m)}));setRenamingId(null);};

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
          <button className="edit-badge" onClick={()=>{setDetailId(null);setEditId(detail.id);}}>
            ✎ Редактировать
          </button>
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

        {editTarget&&<MeasurementSheet count={data.measurements.length+1} initial={editTarget} onSave={handleUpdate} onClose={()=>setEditId(null)}/>}
      </div>
    );
  }

  return(
    <div className="page">
      <button className="btn" onClick={()=>setShowNew(true)}><IconPlus/>Измерить тело</button>
      {data.measurements.length===0
        ?<div className="empty"><div className="empty-icon">📏</div>Замеров пока нет.<br/>Добавь первый!</div>
        :[...data.measurements].reverse().map(m=>{
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
      {showNew&&<MeasurementSheet count={data.measurements.length+1} initial={null} onSave={handleCreate} onClose={()=>setShowNew(false)}/>}
      {editTarget&&<MeasurementSheet count={data.measurements.length+1} initial={editTarget} onSave={handleUpdate} onClose={()=>setEditId(null)}/>}
    </div>
  );
}

export default function App() {
  const [tab,setTab]=useState(0);
  const [data,setData]=useState(()=>loadData()||initialState);
  useEffect(()=>{saveData(data);},[data]);
  const updateData=useCallback((fn)=>setData(prev=>fn(prev)),[]);
  return(
    <>
      <style>{css}</style>
      <div className="app-frame">
        <div className="tab-bar">
          {["Тренировки","Упражнения","Замеры"].map((t,i)=>(
            <button key={i} className={`tab${tab===i?" active":""}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
        {tab===0&&<WorkoutsTab data={data} updateData={updateData}/>}
        {tab===1&&<ExercisesTab data={data}/>}
        {tab===2&&<MeasurementsTab data={data} updateData={updateData}/>}
      </div>
    </>
  );
}
