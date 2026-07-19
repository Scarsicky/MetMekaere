
import React, { useEffect, useMemo, useState } from 'react'
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase'
import { listenActivities, saveActivity } from './services/activities'


const c = { wrap:{ maxWidth: 900, margin:'40px auto', padding:'0 20px', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto' }, input:{ width:'100%', padding:'10px', border:'1px solid #e5e7eb', borderRadius:10 }, btn:{ padding:'10px 14px', border:'1px solid #d1d5db', borderRadius:10, background:'#fff', cursor:'pointer' } }


export default function Admin() {
const [user, setUser] = useState(null)
const [activities, setActivities] = useState({})
const [day, setDay] = useState(1)
const [title, setTitle] = useState('')
const [body, setBody] = useState('')
const days = useMemo(() => Array.from({ length: 24 }, (_, i) => i + 1), [])
const [location, setLocation] = useState('')
const [time, setTime] = useState('')      // Starttijd "HH:mm"
const [endTime, setEndTime] = useState('') // Eindtijd HH:mm
const [costEUR, setCostEUR] = useState(0) // als nummer
const [emoji, setEmoji] = useState('')
const emojiOptions = ['🎄','⭐','❄️','🎁','🕯️','🍪','☕','🎶','🧑‍🎄','🦌','🌟','👪','📷','🧣','🧤','🛷','🕒','📍','💶','😎','😀','💪','🎀','🥰','🎶']
const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null

useEffect(() => onAuthStateChanged(auth, setUser), [])
useEffect(() => { const unsub = listenActivities(setActivities); return () => unsub() }, [])


useEffect(() => {
const d = String(day)
setTitle(activities[d]?.title || '')
setBody(activities[d]?.body || '')
setLocation(activities[d]?.location || '')
setTime(activities[d]?.time || '')
setEndTime(activities[d]?.endTime || '')
setCostEUR(typeof activities[d]?.costEUR === 'number' ? activities[d].costEUR : 0)
setEmoji(activities[d]?.emoji || '')
}, [day, activities])


const doEmail = async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); await signInWithEmailAndPassword(auth, f.get('email'), f.get('password')) }
const doSignOut = async () => { await signOut(auth) }
const doSave = async () => {try { await saveActivity(day, { title, body, location, time, endTime, costEUR: Number(costEUR), emoji })
  setSaveStatus('success')
} catch (err) {
  console.error(err)
  setSaveStatus('error')
}
  setTimeout(() => setSaveStatus(null), 3000)
}

return (
<div style={c.wrap}>
<h1>WELKOM BIJ DE SUPERGEWELDIGE ADMINPAGINA VAN METMEKAERE</h1>
{!user ? (
<div style={{ display:'grid', gap:16 }}>
<form onSubmit={doEmail} style={{ display:'grid', gap:8 }}>
<input style={c.input} name="email" type="email" placeholder="Email" required />
<input style={c.input} name="password" type="password" placeholder="Wachtwoord" required />
<button style={c.btn} type="submit">Inloggen</button>
</form>
</div>
) : (
<div style={{ display:'grid', gap:24 }}>
<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
<div>Ingelogd als <strong>{user.email}</strong></div>
<button onClick={doSignOut} style={c.btn}>Uitloggen</button>
</div>


<div style={{ display:'flex', gap:12, alignItems:'center' }}>
<label>Dag:&nbsp;
<select value={day} onChange={(e)=>setDay(Number(e.target.value))} style={{ ...c.input, width:120 }}>
{days.map(d => <option key={d} value={d}>{d}</option>)}
</select>
</label>
</div>


<div>
<label>Titel</label>
<input style={c.input} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={`Dag ${day}`} />
</div>
<div>
<label>Omschrijving</label>
<textarea rows={8} style={c.input} value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Activiteit omschrijving"></textarea>
</div>
<div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:25 }}>
  <div>
    <label style={{ display:'block', fontSize:12, color:'#6b7280', marginBottom:6 }}>Locatie</label>
    <input
      style={c.input}
      value={location}
      onChange={(e)=>setLocation(e.target.value)}
      placeholder="Bv. Dorpshuis Heerde"
    />
  </div>
  <div>
    <label style={{ display:'block', fontSize:12, color:'#6b7280', marginBottom:6 }}>Begintijd (24u)</label>
    <input
      style={c.input}
      type="time"
      value={time}
      onChange={(e)=>setTime(e.target.value)}
      placeholder="19:30"
    />
  </div>
  <div>
    <label style={{ display:'block', fontSize:12, color:'#6b7280', marginBottom:6 }}>Eindtijd (24u)</label>
    <input
      style={c.input}
      type="time"
      value={endTime}
      onChange={(e)=>setEndTime(e.target.value)}
      placeholder="21:30"
    />
  </div>
  <div>
    <label style={{ display:'block', fontSize:12, color:'#6b7280', marginBottom:6 }}>Kosten (€)</label>
    <input
      style={c.input}
      type="number"
      min="0"
      step="0.01"
      value={costEUR}
      onChange={(e)=>setCostEUR(e.target.value)}
      placeholder="0.00"
    />
  </div>
</div>
<div style={{ display:'grid', gridTemplateColumns:'3 1fr', gap:12 }}>
  <div>
    <label style={c.label}>Emoticon (selectie)</label>
    <select
      value={emojiOptions.includes(emoji) ? emoji : ''}
      onChange={(e) => setEmoji(e.target.value)}
      style={c.input}
    >
      <option value="">(geen)</option>
      {emojiOptions.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
      <option value="">— eigen invoer hieronder —</option>
    </select>
    <small style={{ color:'#6b7280' }}>Kies er één, of vul onderaan zelf iets in.</small>
  </div>

  <div>
    <label style={c.label}>Eigen emoticon (optioneel)</label>
    <input
      style={c.input}
      placeholder="bv. 🎄"
      value={emojiOptions.includes(emoji) ? '' : emoji}
      onChange={(e) => setEmoji(e.target.value)}
      maxLength={4} // veilig tegen lange tekst; emoji zijn meestal 1–2 codepoints
    />
    <small style={{ color:'#6b7280' }}>Laat leeg als je de selectie gebruikt.</small>
  </div>
</div>

<div>
<button onClick={doSave} style={c.btn}>Opslaan</button>
{saveStatus === 'success' && (
  <div style={{ marginTop: 8, color: '#16a34a', fontSize: 13}}>
    ✅ Activiteit opgeslagen
    </div>
)}
{saveStatus === 'error' && (
  <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13}}>
    ❌ Opslaan mislukt — controleer je verbinding of probeer opnieuw
  </div>
)}
</div>


<div>
<h3>Voorbeeld</h3>
<div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
<strong>
    {emoji ? <div style={{ fontSize: 24, marginBottom: 8 }}>{emoji}</div> : null}
    {title || `Dag ${day}`}</strong>
<p>{body || '—'}</p>
<ul style={{ listStyle:'none', padding:0, margin:0, color:'#475569', fontSize:14 }}>
  {location ? <li>📍 {location}</li> : null}
  {(time || endTime) ? <li>🕒 {time}{endTime ? `–${endTime}` : ''}</li> : null}
  {Number(costEUR) > 0 ? <li>💶 € {Number(costEUR).toFixed(2)}</li> : null}
</ul>
</div>
</div>
</div>
)}
</div>
)
}