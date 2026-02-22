export interface VendorAddressResult {
  address: string       // Full formatted address
  details: string       // Unit, floor, landmark (user-entered)
  lat: number
  lng: number
  pincode: string
  city: string
  state: string
  source: 'google' | 'map' | 'manual'
}

export type AddressMode = 'search' | 'map' | 'confirmed'
