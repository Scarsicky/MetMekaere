import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { db } from '../firebase'


const colRef = collection(db, 'activities')


export function listenActivities(callback) {
// documenten hebben id '1'..'24' + een numeriek veld 'day' voor sortering
const q = query(colRef, orderBy('day'))
return onSnapshot(q, (snap) => {
const out = {}
snap.forEach((d) => { out[d.id] = d.data() })
callback(out)
})
}


export async function saveActivity(day, data) {
    const dref = doc(db, 'activities', String(day))
    const payload = {
      day: Number(day),
      title: data.title || `Dag ${day}`,
      body: data.body || '',
      location: data.location || '',
      time: data.time || '',            // 24u-formaat "HH:mm"
      endTime: data.endTime || '',
      costEUR: typeof data.costEUR === 'number'
        ? data.costEUR
        : (data.costEUR ? Number(data.costEUR) : 0),
    emoji: data.emoji || ''
    }
    await setDoc(dref, payload, { merge: true })
  }
  
  export async function ensureSeed() {
    const existing = await getDocs(colRef)
    if (existing.empty) {
      const defaults = Array.from({ length: 24 }, (_, i) => i + 1)
      await Promise.all(
        defaults.map((d) =>
          saveActivity(d, {
            title: `Dag ${d}`,
            body: '',
            location: '',
            time: '',
            endTime: '',
            costEUR: 0,
            emoji: ''
          })
        )
      )
    }
  }