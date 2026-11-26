import { useCallback, useState, useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

const readValue = <T,>(snapshot: string | null, initial: T): T => {
  if (snapshot === null) return initial
  try {
    return JSON.parse(snapshot) as T
  } catch {
    return initial
  }
}

export const usePreviewState = <T,>(id: string, initial: T) => {
  const key = `liquefy-docs-preview-v1:${id}`
  const [unsaved, setUnsaved] = useState<T>()
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }, [key])

  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const value = unsaved ?? readValue(snapshot, initial)
  const update = (change: (current: T) => T) => {
    const next = change(unsaved ?? readValue(getSnapshot(), initial))
    try {
      window.localStorage.setItem(key, JSON.stringify(next))
      setUnsaved(undefined)
      window.dispatchEvent(new Event('storage'))
    } catch {
      setUnsaved(next)
    }
  }

  return { value, update, hasUnsavedChanges: unsaved !== undefined }
}
