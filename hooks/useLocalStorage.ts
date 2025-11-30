import { useEffect, useState } from 'react'

/**
 * Custom hook for persisting state to localStorage
 * Automatically saves on state change with debouncing
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  debounceMs = 500
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Debounced save effect
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const timeoutId = setTimeout(() => {
      try {
        // Save state to localStorage
        window.localStorage.setItem(key, JSON.stringify(storedValue))
      } catch (error) {
        console.warn(`Error saving localStorage key "${key}":`, error)
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [key, storedValue, debounceMs])

  return [storedValue, setStoredValue]
}
