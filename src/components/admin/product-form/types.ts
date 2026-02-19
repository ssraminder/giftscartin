// Types for the admin product form

export type ProductType = 'SIMPLE' | 'VARIABLE'
export type AddonType = 'CHECKBOX' | 'RADIO' | 'SELECT' | 'TEXT_INPUT' | 'TEXTAREA' | 'FILE_UPLOAD'

export interface CategoryOption {
  id: string
  name: string
  slug: string
  parentId: string | null
  isActive: boolean
  addonTemplates?: CategoryAddonTemplate[]
}

export interface CategoryAddonTemplate {
  id: string
  categoryId: string
  name: string
  description: string | null
  type: AddonType
  required: boolean
  maxLength: number | null
  placeholder: string | null
  acceptedFileTypes: string[]
  maxFileSizeMb: number | null
  sortOrder: number
  options: CategoryAddonTemplateOption[]
}

export interface CategoryAddonTemplateOption {
  id: string
  label: string
  price: number
  image: string | null
  isDefault: boolean
  sortOrder: number
}

export interface AttributeOptionData {
  id?: string
  value: string
  sortOrder: number
}

export interface AttributeData {
  id?: string
  name: string
  slug: string
  isForVariations: boolean
  sortOrder: number
  options: AttributeOptionData[]
}

export interface VariationData {
  id?: string
  attributes: Record<string, string>
  price: number
  salePrice: number | null
  sku: string | null
  stockQty: number | null
  image: string | null
  isActive: boolean
  sortOrder: number
}

export interface AddonOptionData {
  id?: string
  label: string
  price: number
  image: string | null
  isDefault: boolean
  sortOrder: number
}

export interface AddonGroupData {
  id?: string
  name: string
  description: string | null
  type: AddonType
  required: boolean
  maxLength: number | null
  placeholder: string | null
  acceptedFileTypes: string[]
  maxFileSizeMb: number | null
  templateGroupId: string | null
  isOverridden: boolean
  sortOrder: number
  options: AddonOptionData[]
}

export interface UpsellProduct {
  id: string
  name: string
  slug: string
  images: string[]
  basePrice: number
}

export interface ProductFormData {
  // General
  name: string
  slug: string
  productType: ProductType
  categoryId: string
  shortDesc: string
  description: string
  isVeg: boolean
  isActive: boolean
  // Pricing (Simple only)
  basePrice: number
  // Inventory
  sku: string
  stockQty: number | null
  dailyLimit: number | null
  // Images
  images: string[]
  // Attributes
  attributes: AttributeData[]
  // Variations
  variations: VariationData[]
  // Addons
  addonGroups: AddonGroupData[]
  // SEO
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  ogImage: string
  canonicalUrl: string
  // Advanced
  occasion: string[]
  tags: string[]
  weight: string
  sortOrder: number
  upsellIds: string[]
  upsellProducts: UpsellProduct[]
}

export interface ProductFormProps {
  mode: 'create' | 'edit'
  initialData?: ProductWithRelations
  categories: CategoryOption[]
  onSave: (data: ProductFormData) => Promise<void>
}

// The shape coming from the API GET /api/admin/products/[id]
export interface ProductWithRelations {
  id: string
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  categoryId: string
  productType: ProductType
  basePrice: number | string
  images: string[]
  tags: string[]
  occasion: string[]
  weight: string | null
  isVeg: boolean
  isActive: boolean
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string[]
  ogImage: string | null
  canonicalUrl: string | null
  createdAt: string
  updatedAt: string
  category: { id: string; name: string; slug: string }
  attributes: Array<{
    id: string
    name: string
    slug: string
    isForVariations: boolean
    sortOrder: number
    options: Array<{ id: string; value: string; sortOrder: number }>
  }>
  variations: Array<{
    id: string
    attributes: Record<string, string>
    price: number | string
    salePrice: number | string | null
    sku: string | null
    stockQty: number | null
    image: string | null
    isActive: boolean
    sortOrder: number
  }>
  addonGroups: Array<{
    id: string
    name: string
    description: string | null
    type: AddonType
    required: boolean
    maxLength: number | null
    placeholder: string | null
    acceptedFileTypes: string[]
    maxFileSizeMb: number | null
    templateGroupId: string | null
    isOverridden: boolean
    sortOrder: number
    options: Array<{
      id: string
      label: string
      price: number | string
      image: string | null
      isDefault: boolean
      sortOrder: number
    }>
  }>
  upsells: Array<{
    id: string
    upsellProductId: string
    upsellProduct: UpsellProduct
  }>
}
