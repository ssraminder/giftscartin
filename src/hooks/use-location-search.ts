'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LocationResult } from '@/types'

export type { LocationResult }

interface UseLocationSearchReturn {
  results: LocationResult[]
  loading: boolean
  error: string | null
}

export function useLocationSearch(query: string): UseLocationSearchReturn {
  const [results, setResults] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchResults = useCallback(async (searchQuery: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }

    if (searchQuery.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    // Skip for 1-3 digit partial pincodes
    if (/^\d{1,3}$/.test(searchQuery)) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(
        `/api/location/search?q=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      )
      const json = await res.json()

      if (json.success && json.data?.results) {
        setResults(json.data.results as LocationResult[])
      } else {
        setResults([])
        if (json.error) setError(json.error)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setResults([])
        setError('Failed to search locations')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length >= 2) {
      setLoading(true)
      debounceRef.current = setTimeout(() => {
        fetchResults(query)
      }, 300)
    } else {
      setResults([])
      setLoading(false)
      setError(null)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return { results, loading, error }
}
