export interface StaticCity {
  cityId: string
  cityName: string
  citySlug: string
  isActive: boolean
  isComingSoon: boolean
  displayName: string
}

export const POPULAR_CITIES: StaticCity[] = [
  {
    cityId: 'city_chandigarh',
    cityName: 'Chandigarh',
    citySlug: 'chandigarh',
    isActive: true,
    isComingSoon: false,
    displayName: 'Chandigarh',
  },
  {
    cityId: 'city_mohali',
    cityName: 'Mohali',
    citySlug: 'mohali',
    isActive: true,
    isComingSoon: false,
    displayName: 'Mohali',
  },
  {
    cityId: 'city_panchkula',
    cityName: 'Panchkula',
    citySlug: 'panchkula',
    isActive: true,
    isComingSoon: false,
    displayName: 'Panchkula',
  },
  {
    cityId: 'cmlteragt0000wyl9f44qkte9',
    cityName: 'Patiala',
    citySlug: 'patiala',
    isActive: true,
    isComingSoon: true,
    displayName: 'Patiala',
  },
  {
    cityId: 'city_ludhiana',
    cityName: 'Ludhiana',
    citySlug: 'ludhiana',
    isActive: true,
    isComingSoon: true,
    displayName: 'Ludhiana',
  },
  {
    cityId: 'city_bathinda',
    cityName: 'Bathinda',
    citySlug: 'bathinda',
    isActive: true,
    isComingSoon: true,
    displayName: 'Bathinda',
  },
  {
    cityId: 'city_sangrur',
    cityName: 'Sangrur',
    citySlug: 'sangrur',
    isActive: true,
    isComingSoon: true,
    displayName: 'Sangrur',
  },
  {
    cityId: 'city_nabha',
    cityName: 'Nabha',
    citySlug: 'nabha',
    isActive: true,
    isComingSoon: true,
    displayName: 'Nabha',
  },
]

// Fast lookup by slug — used when user arrives on /chandigarh etc.
export const CITY_BY_SLUG = Object.fromEntries(
  POPULAR_CITIES.map(c => [c.citySlug, c])
)

// Fast lookup by pincode prefix — used for partial pincode matching client-side
export const PINCODE_PREFIX_MAP: Record<string, string> = {
  '160': 'city_chandigarh',
  '140': 'city_mohali',
  '134': 'city_panchkula',
  '147': 'cmlteragt0000wyl9f44qkte9', // Patiala
  '141': 'city_ludhiana',
  '142': 'city_ludhiana',
  '151': 'city_bathinda',
  '148': 'city_sangrur',
}
