export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'CITY_MANAGER', 'OPERATIONS'] as const
export const VENDOR_ROLES = ['VENDOR', 'VENDOR_STAFF'] as const
export const isAdminRole = (role: string) => (ADMIN_ROLES as readonly string[]).includes(role)
export const isVendorRole = (role: string) => (VENDOR_ROLES as readonly string[]).includes(role)
