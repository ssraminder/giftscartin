// Type declarations for Google Maps — avoids TS errors without installing full @types/google-maps
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          PlaceAutocompleteElement: new (options?: {
            componentRestrictions?: { country: string | string[] }
            types?: string[]
          }) => HTMLElement & {
            addEventListener(
              type: 'gmp-placeselect',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              listener: (event: { place: any }) => void
            ): void
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
