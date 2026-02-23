'use client'

import { useState } from 'react'
import { MapplsAreaSearch, type MapplsResult } from '@/components/location/mappls-area-search'

export default function LocationTestPage() {
  const [selectedResult, setSelectedResult] = useState<MapplsResult | null>(null)
  const [biasedResult, setBiasedResult] = useState<MapplsResult | null>(null)
  const [patialaResult, setPatialaResult] = useState<MapplsResult | null>(null)

  // Raw API test state
  const [tokenResult, setTokenResult] = useState<string>('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [rawQuery, setRawQuery] = useState('')
  const [rawResult, setRawResult] = useState<string>('')
  const [rawLoading, setRawLoading] = useState(false)

  async function testToken() {
    setTokenLoading(true)
    setTokenResult('')
    try {
      const res = await fetch('/api/mappls/token')
      const json = await res.json()
      setTokenResult(JSON.stringify(json, null, 2))
    } catch (err) {
      setTokenResult(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTokenLoading(false)
    }
  }

  async function testSearch() {
    if (!rawQuery.trim()) return
    setRawLoading(true)
    setRawResult('')
    try {
      const res = await fetch(`/api/mappls/search?q=${encodeURIComponent(rawQuery)}`)
      const json = await res.json()
      setRawResult(JSON.stringify(json, null, 2))
    } catch (err) {
      setRawResult(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRawLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Mappls Location Search &mdash; Test
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Testing Mappls (MapMyIndia) Autosuggest API integration
          </p>
        </div>

        {/* Component Test 1: No bias */}
        <div className="bg-white rounded-lg shadow-sm border p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            1. Area Search (no city bias)
          </h2>
          <p className="text-sm text-gray-500">
            Search for any area, locality, or landmark in India.
          </p>
          <MapplsAreaSearch
            placeholder="Search any area in India..."
            onSelect={setSelectedResult}
          />
          {selectedResult && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Selected result:</p>
              <pre className="bg-gray-50 border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Component Test 2: Chandigarh bias */}
        <div className="bg-white rounded-lg shadow-sm border p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            2. Area Search (Chandigarh bias)
          </h2>
          <p className="text-sm text-gray-500">
            Biased to Chandigarh (30.7333, 76.7794). Results should prioritize
            Chandigarh-area locations.
          </p>
          <p className="text-xs text-blue-600 font-mono">
            Bounded to &plusmn;40km around Chandigarh: SW (76.36, 30.37) &rarr; NE (77.20, 31.09)
          </p>
          <MapplsAreaSearch
            placeholder="Search in Chandigarh..."
            onSelect={setBiasedResult}
            cityBias={{ lat: 30.7333, lng: 76.7794 }}
          />
          {biasedResult && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Selected result:</p>
              <pre className="bg-gray-50 border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(biasedResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Component Test 3: Patiala bias */}
        <div className="bg-white rounded-lg shadow-sm border p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            3. Area Search (Patiala bias)
          </h2>
          <p className="text-sm text-gray-500">
            Biased to Patiala (30.3398, 76.3869). Verifies bounds filtering
            works for non-Chandigarh cities.
          </p>
          <p className="text-xs text-blue-600 font-mono">
            Bounded to &plusmn;40km around Patiala: SW (75.97, 29.98) &rarr; NE (76.80, 30.70)
          </p>
          <MapplsAreaSearch
            placeholder="Search in Patiala..."
            onSelect={setPatialaResult}
            cityBias={{ lat: 30.3398, lng: 76.3869 }}
          />
          {patialaResult && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Selected result:</p>
              <pre className="bg-gray-50 border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(patialaResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Raw API: Token */}
        <div className="bg-white rounded-lg shadow-sm border p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            4. Raw API &mdash; Token Test
          </h2>
          <p className="text-sm text-gray-500">
            Fetch an OAuth token from Mappls via the server-side proxy.
          </p>
          <button
            onClick={testToken}
            disabled={tokenLoading}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {tokenLoading ? 'Fetching...' : 'Test Token'}
          </button>
          {tokenResult && (
            <pre className="bg-gray-50 border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap max-h-48">
              {tokenResult}
            </pre>
          )}
        </div>

        {/* Raw API: Search */}
        <div className="bg-white rounded-lg shadow-sm border p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            5. Raw API &mdash; Search Test
          </h2>
          <p className="text-sm text-gray-500">
            Call the search proxy directly and view raw JSON response.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') testSearch()
              }}
              placeholder="Enter search query..."
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              onClick={testSearch}
              disabled={rawLoading || !rawQuery.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {rawLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {rawResult && (
            <pre className="bg-gray-50 border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
              {rawResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
