// file: src/App.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { listenActivities } from './services/activities'

const styles = {
  page: { minHeight: '100dvh', background: 'linear-gradient(135deg, #fff 0%, #f7fafc 100%)', color: '#111', fontFamily: "'Raleway', system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'"},
  container: { maxWidth: 1120, margin: '0 auto', padding: '24px' },
  grid: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, minmax(0,1fr))'},
  cell: { position:'relative', borderRadius:16, border:'1px solid #e5e7eb', background:'#fff', padding:12, aspectRatio:'1 / 1', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' },
  button: { border:'1px solid #d1d5db', borderRadius:12, padding:'8px 12px', background:'#fff', cursor:'pointer' },
  modalBackdrop: { position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' },
  modalWrap: { position:'relative', display:'grid', placeItems:'center', minHeight:'100%', padding:20 },
  modalCard: { background:'#fff', borderRadius:16, padding:20, maxWidth:560, width:'100%', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }
}

// ---------- Modal ----------
// VERVANG je huidige Modal door deze variant op basis van <dialog>
function Modal({ open, onClose, children }) {
  const ref = React.useRef(null)

  // Open/close via native showModal/close (regelt scroll lock automatisch)
  React.useEffect(() => {
    const dlg = ref.current
    if (!dlg) return

    const handleCancel = (e) => { e.preventDefault(); onClose?.() } // Esc
    const handleClose  = () => { onClose?.() }

    dlg.addEventListener('cancel', handleCancel)
    dlg.addEventListener('close', handleClose)

    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()

    return () => {
      dlg.removeEventListener('cancel', handleCancel)
      dlg.removeEventListener('close', handleClose)
      if (dlg.open) dlg.close()
    }
  }, [open, onClose])

  // Backdrop-click: klik buiten de kaart => sluit dialog
  const onDialogClick = (e) => {
    const dlg = ref.current
    if (!dlg) return
    const rect = dlg.getBoundingClientRect()
    const clickedOutside =
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom
    if (clickedOutside) dlg.close() // triggert onClose via 'close' event
  }

  // NB: <dialog> rendert ook als niet-open; verberg via style
  return (
    <dialog
      ref={ref}
      onClick={onDialogClick}
      style={{
        border: 'none',
        padding: 0,
        borderRadius: 16,
        maxWidth: 560,
        width: 'calc(100% - 40px)',
        boxShadow: '0 8px 24px rgba(0,0,0,.20)',
        // verberg als niet open
        display: open ? 'block' : 'none'
      }}
    >
      <div
        style={{ background:'#fff', borderRadius:16, padding:20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  )
}

// ---------- UI helpers ----------
function truncateMultiline(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  return cut.replace(/\s+\S*$/, '') + '…'; // knip af op woordgrens
}
const InfoLine = ({ icon, children }) => (
  <li style={{ display:'flex', gap:8, alignItems:'center' }}>
    <span aria-hidden>{icon}</span>
    <span>{children}</span>
  </li>
)
const euro = (n) => Number(n).toFixed(2)

// ---------- Cells ----------
function DayCell({ day, isToday, onClick, title }) {
  // Redesign: headerbalk met datum, titel gecentreerd, geen vergrendeling
  const card = {
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid #e5e7eb', //bf2412
    background: isToday ? '#b8ceab' : '#ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingBottom: 23,
    height: '100%'
  }
  const header = {
    fontFamily: "'Raleway', sans-serif",
    background: isToday ? '#7F1D1D' : '#c2d1c2',
    borderRadius: 16,
    color: isToday ? '#e5e7eb' : '#111827',
    fontWeight: 700,
    padding: '6px 8px',
    fontSize: isToday ? 16 : 13,
    textAlign: 'center'
  }
  const body = {
    fontFamily: "'Nunito Sans', sans-serif",
    flexGrow: 1,
    fontSize: isToday ? 16 : 13,
    color: '#525252',
    padding: 10,
    textAlign: 'center',
    lineHeight: 1.3,
    overflow: 'hidden',
    wordBreak: 'break-word',     // breek lange woorden
    overflowWrap: 'anywhere',    // nog agressiever breken waar kan
    maxHeight: 51
  }
  const btn = (minHeight = 140) => ({
    ...card,
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
    outlineOffset: 0,
    minHeight
  })

  return (
    <button
      aria-label={`Dag ${day}`}
      // alle datums zijn klikbaar → geen disabled
      onClick={onClick}
      style={btn()}
    >
      <div style={header}>{`${day} december`}</div>
      <div style={body}>{title}</div>
    </button>
  )
}

function FinishCell({ label }) {
  return (
    <div style={{...styles.cell, display:'grid', placeItems:'center', background:'linear-gradient(135deg, #7F1D1D, #FCA5A5)'}}>
      <div style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 800, fontSize: 25, color: '#e5e7eb' }}>{label}</div>
      <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 24, color:'#e5e7eb' }}>🎅 Feest!</div>
    </div>
  )
}
function useColumns() {
  const [cols, setCols] = React.useState(2)
  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      // <480px: 2, <900px: 3, anders: 4
      setCols(w < 480 ? 2 : w < 900 ? 3 : 4)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return cols
}

// ---------- App ----------
export default function App() {
  const [selectedDay, setSelectedDay] = useState(null)
  const [activities, setActivities] = useState({})
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const cols = useColumns()
  const gridStyle = { display:'grid', gap:12, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, alignItems:'stretch' }
  const cardMinHeight = cols === 2 ? 160 : cols === 3 ? 150 : 140  // geef 2-koloms extra hoogte
  const maxChars =  60 // cols === 2 ? 60 : cols === 3 ? 50 : 40

  // Firestore live data
  useEffect(() => {
    const unsub = listenActivities(setActivities)
    return () => unsub()
  }, [])

  // PWA: install prompt
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])
  useEffect(() => {
  // Wacht heel even; als er geen beforeinstallprompt komt, toon hulp
  const t = setTimeout(() => {
    if (!canInstall) setShowInstallHelp(true);
  }, 2000);
  return () => clearTimeout(t);
}, [canInstall]);

  // Kalenderlogica

  // ✅ Debug: zet handmatig een dag om "vandaag" te simuleren (bv. 5 = toon 5 december als vandaag)
const DEBUG_FAKE_TODAY = null // 👉 zet op null of false om uit te schakelen

// Bepaal standaard datum
let now = new Date()
let isDecember = now.getMonth() === 11
let today = now.getDate()

if (DEBUG_FAKE_TODAY) {
  isDecember = true         // forceer december
  today = DEBUG_FAKE_TODAY  // vervang huidige dag
}

const isToday = (d) => isDecember && d === today


  const days = Array.from({ length: 24 }, (_, i) => i + 1)

  // Installactie
  const openInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setCanInstall(false)
  }

  const selected = selectedDay ? activities[String(selectedDay)] : null
  const buildDate = new Date(import.meta.env.VITE_BUILD_DATE || Date.now())
  

  return (
    <main style={styles.page}>
      <header style={styles.container}>
      <img src="/logo.png" alt="Met Mekaere logo" style={{ maxWidth: 160, margin: '0 auto 12px auto', display: 'block' }} />
        <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 40, fontWeight: 500, letterSpacing: 1, textAlign: 'center'}}>Adventskalender Met Mekaere</h1>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: 30, color:'#525252', marginTop: 6, textAlign: 'center' }}>Samen verbinden</p>
        <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
          {canInstall && (<button onClick={openInstall} style={styles.button}>App installeren</button>)}
        </div>
      </header>

      <section style={{ ...styles.container, paddingTop: 0 }}>
  <div style={gridStyle}>
    {days.map((d) => (
      <DayCell
        key={d}
        day={d}
        isToday={isToday(d)}
        onClick={() => setSelectedDay(d)}
        title={truncateMultiline((activities[String(d)]?.title) || `Dag ${d}`, maxChars)}
      />
    ))}
    <FinishCell label="25 dec" />
    <FinishCell label="26 dec" />
  </div>
</section>



      {/* Modal met details */}
      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)}>
        <div style={{ display:'flex', gap:12 }}>
          {/* <div style={{ fontSize: 24 }}>🎄</div> */}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            {selected?.emoji ? <span style={{ marginLeft: 6 }}>{selected.emoji}</span> : null} {selected?.title || `Dag ${selectedDay}`}
            </h2>
            <p style={{ color:'#3f3f46', lineHeight: 1.6 }}>
              {selected?.body || 'Nog geen activiteit toegevoegd.'}
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:'8px 0 0 0', color:'#374151', fontSize:14, display:'grid', gap:6 }}>
              {selected?.location ? <InfoLine icon="📍">{selected.location}</InfoLine> : null}
              {(selected?.time || selected?.endTime) ? (
                <InfoLine icon="🕒">
                  {selected?.time}{selected?.endTime ? `–${selected.endTime}` : ''}
                </InfoLine>
              ) : null}
              {selected?.costEUR > 0 ? <InfoLine icon="💶">€ {euro(selected.costEUR)}</InfoLine> : null}
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setSelectedDay(null)} style={styles.button}>Sluiten</button>
        </div>
      </Modal>

      <footer style={{...styles.container, fontSize: 12, color:'#6b7280', textAlign: 'center'}}>
        <div>Versie {__APP_VERSION__}</div>
        <div>Build {new Date(__BUILD_DATE__).toLocaleDateString('nl-NL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })}</div>
        © MetMekaere 2025.
        {showInstallHelp && !canInstall && (
  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
    <strong>App installeren:</strong>{' '}
    <span>
      Op iPhone/iPad: open in Safari → Deel-knop → <em>Voeg toe aan beginscherm</em>.
      Op Android: open menu ⋮ → <em>App installeren</em> of <em>Toevoegen aan startscherm</em>.
    </span>
  </div>
)}
      </footer>
    </main>
  )
}
