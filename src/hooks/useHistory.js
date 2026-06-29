import { useState } from 'react'

export function useHistory(key) {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || [] }
    catch { return [] }
  })

  const add = (entry) => {
    const updated = [{ ...entry, timestamp: new Date().toISOString() }, ...history].slice(0, 5)
    setHistory(updated)
    localStorage.setItem(key, JSON.stringify(updated))
  }

  const clear = () => {
    setHistory([])
    localStorage.removeItem(key)
  }

  return { history, add, clear }
}
