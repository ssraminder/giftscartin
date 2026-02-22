// Type declarations for Google Maps — avoids TS errors without installing full @types/google-maps
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: object
          ) => {
            getPlace: () => {
              place_id?: string
              formatted_address?: string
              name?: string
              address_components?: Array<{
                long_name: string
                short_name: string
                types: string[]
              }>
              geometry?: {
                location: {
                  lat: () => number
                  lng: () => number
                }
              }
            }
            addListener: (event: string, handler: () => void) => void
            setBounds: (bounds: object) => void
          }
        }
        Geocoder: new () => {
          geocode: (
            request: { location: { lat: number; lng: number } },
            callback: (
              results: Array<{
                address_components: Array<{
                  long_name: string
                  short_name: string
                  types: string[]
                }>
              }> | null,
              status: string
            ) => void
          ) => void
        }
      }
    }
  }
}

export {}
