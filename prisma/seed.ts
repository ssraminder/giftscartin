import { PrismaClient, UserRole, VendorStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ==================== CITIES ====================
  console.log('Creating cities...')

  const chandigarh = await prisma.city.upsert({
    where: { slug: 'chandigarh' },
    update: {},
    create: {
      name: 'Chandigarh',
      slug: 'chandigarh',
      state: 'Chandigarh',
      lat: 30.7333,
      lng: 76.7794,
      baseDeliveryCharge: 49,
      freeDeliveryAbove: 499,
    },
  })

  await prisma.city.upsert({
    where: { slug: 'mohali' },
    update: {},
    create: {
      name: 'Mohali',
      slug: 'mohali',
      state: 'Punjab',
      lat: 30.7046,
      lng: 76.7179,
      baseDeliveryCharge: 49,
      freeDeliveryAbove: 499,
    },
  })

  await prisma.city.upsert({
    where: { slug: 'panchkula' },
    update: {},
    create: {
      name: 'Panchkula',
      slug: 'panchkula',
      state: 'Haryana',
      lat: 30.6942,
      lng: 76.8606,
      baseDeliveryCharge: 49,
      freeDeliveryAbove: 499,
    },
  })

  // ==================== CITY ZONES (Chandigarh) ====================
  console.log('Creating city zones...')

  // Helper to generate pincode arrays
  function generatePincodes(prefix: string, start: number, end: number): string[] {
    const pincodes: string[] = []
    for (let i = start; i <= end; i++) {
      pincodes.push(`${prefix}${String(i).padStart(3, '0')}`)
    }
    return pincodes
  }

  // Core zone: Sectors 15-25 (pincodes 160015-160025)
  const corePincodes = generatePincodes('160', 15, 25)

  const coreZone = await prisma.cityZone.create({
    data: {
      cityId: chandigarh.id,
      name: 'Core (Sectors 15-25)',
      pincodes: corePincodes,
      extraCharge: 0,
    },
  })

  // Extended zone: Sectors 1-14 and 26-40 (pincodes 160001-160014, 160026-160040)
  const extendedPincodes = [
    ...generatePincodes('160', 1, 14),
    ...generatePincodes('160', 26, 40),
  ]

  await prisma.cityZone.create({
    data: {
      cityId: chandigarh.id,
      name: 'Extended (Sectors 1-14, 26-40)',
      pincodes: extendedPincodes,
      extraCharge: 30,
    },
  })

  // Outskirts zone: Mohali and Panchkula (pincodes 140301-140320, 134101-134120)
  const outskirtsPincodes = [
    ...generatePincodes('140', 301, 320),
    ...generatePincodes('134', 101, 120),
  ]

  await prisma.cityZone.create({
    data: {
      cityId: chandigarh.id,
      name: 'Outskirts (Mohali, Panchkula)',
      pincodes: outskirtsPincodes,
      extraCharge: 60,
    },
  })

  // ==================== DELIVERY SLOTS ====================
  console.log('Creating delivery slots...')

  const standardSlot = await prisma.deliverySlot.upsert({
    where: { slug: 'standard' },
    update: {},
    create: {
      name: 'Standard',
      slug: 'standard',
      startTime: '09:00',
      endTime: '21:00',
      baseCharge: 0,
    },
  })

  const fixedSlot = await prisma.deliverySlot.upsert({
    where: { slug: 'fixed-slot' },
    update: {},
    create: {
      name: 'Fixed Slot',
      slug: 'fixed-slot',
      startTime: '10:00',
      endTime: '12:00',
      baseCharge: 50,
    },
  })

  const midnightSlot = await prisma.deliverySlot.upsert({
    where: { slug: 'midnight' },
    update: {},
    create: {
      name: 'Midnight',
      slug: 'midnight',
      startTime: '23:00',
      endTime: '23:59',
      baseCharge: 199,
    },
  })

  const earlyMorningSlot = await prisma.deliverySlot.upsert({
    where: { slug: 'early-morning' },
    update: {},
    create: {
      name: 'Early Morning',
      slug: 'early-morning',
      startTime: '06:00',
      endTime: '08:00',
      baseCharge: 149,
    },
  })

  const expressSlot = await prisma.deliverySlot.upsert({
    where: { slug: 'express' },
    update: {},
    create: {
      name: 'Express',
      slug: 'express',
      startTime: '00:00',
      endTime: '23:59',
      baseCharge: 249,
    },
  })

  const allSlots = [standardSlot, fixedSlot, midnightSlot, earlyMorningSlot, expressSlot]

  // Link all delivery slots to Chandigarh
  console.log('Linking delivery slots to Chandigarh...')
  for (const slot of allSlots) {
    await prisma.cityDeliveryConfig.upsert({
      where: {
        cityId_slotId: { cityId: chandigarh.id, slotId: slot.id },
      },
      update: {},
      create: {
        cityId: chandigarh.id,
        slotId: slot.id,
        isAvailable: true,
      },
    })
  }

  // ==================== CATEGORIES ====================
  console.log('Creating categories...')

  // Parent categories
  const cakesCategory = await prisma.category.upsert({
    where: { slug: 'cakes' },
    update: {},
    create: {
      name: 'Cakes',
      slug: 'cakes',
      description: 'Freshly baked cakes for every occasion',
      image: '/placeholder-product.svg',
      sortOrder: 1,
    },
  })

  const flowersCategory = await prisma.category.upsert({
    where: { slug: 'flowers' },
    update: {},
    create: {
      name: 'Flowers',
      slug: 'flowers',
      description: 'Beautiful fresh flower arrangements',
      image: '/placeholder-product.svg',
      sortOrder: 2,
    },
  })

  const combosCategory = await prisma.category.upsert({
    where: { slug: 'combos' },
    update: {},
    create: {
      name: 'Combos',
      slug: 'combos',
      description: 'Perfect gift combinations',
      image: '/placeholder-product.svg',
      sortOrder: 3,
    },
  })

  const plantsCategory = await prisma.category.upsert({
    where: { slug: 'plants' },
    update: {},
    create: {
      name: 'Plants',
      slug: 'plants',
      description: 'Indoor and outdoor plants',
      image: '/placeholder-product.svg',
      sortOrder: 4,
    },
  })

  const giftsCategory = await prisma.category.upsert({
    where: { slug: 'gifts' },
    update: {},
    create: {
      name: 'Gifts',
      slug: 'gifts',
      description: 'Unique gifts for your loved ones',
      image: '/placeholder-product.svg',
      sortOrder: 5,
    },
  })

  // Cake subcategories
  const chocolateCakes = await prisma.category.upsert({
    where: { slug: 'chocolate-cakes' },
    update: {},
    create: {
      name: 'Chocolate Cakes',
      slug: 'chocolate-cakes',
      description: 'Rich chocolate cakes',
      image: '/placeholder-product.svg',
      parentId: cakesCategory.id,
      sortOrder: 1,
    },
  })

  const fruitCakes = await prisma.category.upsert({
    where: { slug: 'fruit-cakes' },
    update: {},
    create: {
      name: 'Fruit Cakes',
      slug: 'fruit-cakes',
      description: 'Fresh fruit cakes',
      image: '/placeholder-product.svg',
      parentId: cakesCategory.id,
      sortOrder: 2,
    },
  })

  const photoCakes = await prisma.category.upsert({
    where: { slug: 'photo-cakes' },
    update: {},
    create: {
      name: 'Photo Cakes',
      slug: 'photo-cakes',
      description: 'Personalized photo cakes',
      image: '/placeholder-product.svg',
      parentId: cakesCategory.id,
      sortOrder: 3,
    },
  })

  const egglessCakes = await prisma.category.upsert({
    where: { slug: 'eggless-cakes' },
    update: {},
    create: {
      name: 'Eggless Cakes',
      slug: 'eggless-cakes',
      description: 'Delicious eggless cakes',
      image: '/placeholder-product.svg',
      parentId: cakesCategory.id,
      sortOrder: 4,
    },
  })

  // Flower subcategories
  await prisma.category.upsert({
    where: { slug: 'roses' },
    update: {},
    create: {
      name: 'Roses',
      slug: 'roses',
      description: 'Beautiful roses',
      image: '/placeholder-product.svg',
      parentId: flowersCategory.id,
      sortOrder: 1,
    },
  })

  await prisma.category.upsert({
    where: { slug: 'mixed-bouquets' },
    update: {},
    create: {
      name: 'Mixed Bouquets',
      slug: 'mixed-bouquets',
      description: 'Mixed flower bouquets',
      image: '/placeholder-product.svg',
      parentId: flowersCategory.id,
      sortOrder: 2,
    },
  })

  await prisma.category.upsert({
    where: { slug: 'premium-flowers' },
    update: {},
    create: {
      name: 'Premium Flowers',
      slug: 'premium-flowers',
      description: 'Premium flower arrangements',
      image: '/placeholder-product.svg',
      parentId: flowersCategory.id,
      sortOrder: 3,
    },
  })

  // ==================== PRODUCTS ====================
  console.log('Creating products...')

  // Cake products
  const chocolateTruffleCake = await prisma.product.upsert({
    where: { slug: 'chocolate-truffle-cake' },
    update: {},
    create: {
      name: 'Chocolate Truffle Cake',
      slug: 'chocolate-truffle-cake',
      description: 'Rich and indulgent chocolate truffle cake layered with smooth ganache and topped with chocolate shavings.',
      shortDesc: 'Rich chocolate truffle cake with ganache',
      categoryId: chocolateCakes.id,
      basePrice: 599,
      images: ['/placeholder-product.svg'],
      tags: ['bestseller', 'chocolate'],
      occasion: ['birthday', 'anniversary'],
      weight: '500g',
      isVeg: true,
    },
  })

  const redVelvetCake = await prisma.product.upsert({
    where: { slug: 'red-velvet-cake' },
    update: {},
    create: {
      name: 'Red Velvet Cake',
      slug: 'red-velvet-cake',
      description: 'Classic red velvet cake with cream cheese frosting, perfect for celebrations.',
      shortDesc: 'Classic red velvet with cream cheese frosting',
      categoryId: cakesCategory.id,
      basePrice: 699,
      images: ['/placeholder-product.svg'],
      tags: ['popular', 'premium'],
      occasion: ['birthday', 'anniversary', 'valentines'],
      weight: '500g',
      isVeg: true,
    },
  })

  const blackForestCake = await prisma.product.upsert({
    where: { slug: 'black-forest-cake' },
    update: {},
    create: {
      name: 'Black Forest Cake',
      slug: 'black-forest-cake',
      description: 'Traditional black forest cake with layers of chocolate sponge, whipped cream, and cherries.',
      shortDesc: 'Traditional black forest with cherries',
      categoryId: chocolateCakes.id,
      basePrice: 549,
      images: ['/placeholder-product.svg'],
      tags: ['classic', 'chocolate'],
      occasion: ['birthday'],
      weight: '500g',
      isVeg: true,
    },
  })

  const butterscotchCake = await prisma.product.upsert({
    where: { slug: 'butterscotch-cake' },
    update: {},
    create: {
      name: 'Butterscotch Cake',
      slug: 'butterscotch-cake',
      description: 'Delicious butterscotch cake topped with crunchy caramel bits and smooth butterscotch frosting.',
      shortDesc: 'Butterscotch cake with caramel bits',
      categoryId: cakesCategory.id,
      basePrice: 499,
      images: ['/placeholder-product.svg'],
      tags: ['classic'],
      occasion: ['birthday'],
      weight: '500g',
      isVeg: true,
    },
  })

  const photoCake = await prisma.product.upsert({
    where: { slug: 'photo-cake' },
    update: {},
    create: {
      name: 'Photo Cake',
      slug: 'photo-cake',
      description: 'Personalized photo cake printed with your favorite photo on a delicious vanilla base.',
      shortDesc: 'Personalized photo cake on vanilla base',
      categoryId: photoCakes.id,
      basePrice: 899,
      images: ['/placeholder-product.svg'],
      tags: ['personalized', 'premium'],
      occasion: ['birthday', 'anniversary'],
      weight: '1kg',
      isVeg: true,
    },
  })

  // Additional cake products for variety
  const pineappleCake = await prisma.product.upsert({
    where: { slug: 'pineapple-cake' },
    update: {},
    create: {
      name: 'Pineapple Cake',
      slug: 'pineapple-cake',
      description: 'Light and refreshing pineapple cake with fresh pineapple chunks and whipped cream.',
      shortDesc: 'Fresh pineapple cake with whipped cream',
      categoryId: fruitCakes.id,
      basePrice: 549,
      images: ['/placeholder-product.svg'],
      tags: ['fruity', 'classic'],
      occasion: ['birthday'],
      weight: '500g',
      isVeg: true,
    },
  })

  const egglessChocolateCake = await prisma.product.upsert({
    where: { slug: 'eggless-chocolate-cake' },
    update: {},
    create: {
      name: 'Eggless Chocolate Cake',
      slug: 'eggless-chocolate-cake',
      description: 'Rich eggless chocolate cake that tastes just as amazing. Perfect for vegetarians.',
      shortDesc: 'Rich eggless chocolate cake',
      categoryId: egglessCakes.id,
      basePrice: 649,
      images: ['/placeholder-product.svg'],
      tags: ['eggless', 'chocolate'],
      occasion: ['birthday', 'anniversary'],
      weight: '500g',
      isVeg: true,
    },
  })

  // Flower products
  const redRosesBouquet = await prisma.product.upsert({
    where: { slug: 'red-roses-bouquet' },
    update: {},
    create: {
      name: 'Red Roses Bouquet',
      slug: 'red-roses-bouquet',
      description: 'Stunning bouquet of 12 fresh red roses wrapped in elegant packaging. Perfect for expressing love.',
      shortDesc: '12 fresh red roses bouquet',
      categoryId: flowersCategory.id,
      basePrice: 699,
      images: ['/placeholder-product.svg'],
      tags: ['bestseller', 'romantic'],
      occasion: ['valentines', 'anniversary', 'birthday'],
      isVeg: true,
    },
  })

  const mixedFlowerArrangement = await prisma.product.upsert({
    where: { slug: 'mixed-flower-arrangement' },
    update: {},
    create: {
      name: 'Mixed Flower Arrangement',
      slug: 'mixed-flower-arrangement',
      description: 'Beautiful arrangement of mixed seasonal flowers in a decorative basket.',
      shortDesc: 'Mixed seasonal flowers in basket',
      categoryId: flowersCategory.id,
      basePrice: 899,
      images: ['/placeholder-product.svg'],
      tags: ['premium', 'arrangement'],
      occasion: ['birthday', 'anniversary', 'housewarming'],
      isVeg: true,
    },
  })

  const orchidBunch = await prisma.product.upsert({
    where: { slug: 'orchid-bunch' },
    update: {},
    create: {
      name: 'Orchid Bunch',
      slug: 'orchid-bunch',
      description: 'Exotic purple orchid bunch that makes a luxurious and long-lasting gift.',
      shortDesc: 'Exotic purple orchid bunch',
      categoryId: flowersCategory.id,
      basePrice: 1299,
      images: ['/placeholder-product.svg'],
      tags: ['premium', 'exotic'],
      occasion: ['anniversary', 'birthday'],
      isVeg: true,
    },
  })

  const yellowLilyBouquet = await prisma.product.upsert({
    where: { slug: 'yellow-lily-bouquet' },
    update: {},
    create: {
      name: 'Yellow Lily Bouquet',
      slug: 'yellow-lily-bouquet',
      description: 'Bright and cheerful yellow lily bouquet to light up any occasion.',
      shortDesc: 'Bright yellow lily bouquet',
      categoryId: flowersCategory.id,
      basePrice: 799,
      images: ['/placeholder-product.svg'],
      tags: ['cheerful', 'lily'],
      occasion: ['birthday', 'congratulations'],
      isVeg: true,
    },
  })

  const sunflowerBunch = await prisma.product.upsert({
    where: { slug: 'sunflower-bunch' },
    update: {},
    create: {
      name: 'Sunflower Bunch',
      slug: 'sunflower-bunch',
      description: 'Vibrant bunch of sunflowers that bring happiness and warmth to any room.',
      shortDesc: 'Vibrant sunflower bunch',
      categoryId: flowersCategory.id,
      basePrice: 599,
      images: ['/placeholder-product.svg'],
      tags: ['cheerful', 'sunflower'],
      occasion: ['birthday', 'housewarming'],
      isVeg: true,
    },
  })

  // Combo products
  const cakeFlowersCombo = await prisma.product.upsert({
    where: { slug: 'cake-flowers-combo' },
    update: {},
    create: {
      name: 'Cake & Flowers Combo',
      slug: 'cake-flowers-combo',
      description: 'Perfect combination of a half kg chocolate cake with a bouquet of 12 red roses.',
      shortDesc: 'Chocolate cake + red roses bouquet',
      categoryId: combosCategory.id,
      basePrice: 1199,
      images: ['/placeholder-product.svg'],
      tags: ['bestseller', 'combo', 'value'],
      occasion: ['birthday', 'anniversary', 'valentines'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'roses-chocolate-combo' },
    update: {},
    create: {
      name: 'Roses & Chocolate Combo',
      slug: 'roses-chocolate-combo',
      description: 'Romantic combo of 6 red roses with a box of premium chocolates.',
      shortDesc: 'Red roses + premium chocolates',
      categoryId: combosCategory.id,
      basePrice: 999,
      images: ['/placeholder-product.svg'],
      tags: ['romantic', 'combo'],
      occasion: ['valentines', 'anniversary'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'celebration-hamper' },
    update: {},
    create: {
      name: 'Celebration Hamper',
      slug: 'celebration-hamper',
      description: 'Complete celebration hamper with cake, flowers, chocolates, and a greeting card.',
      shortDesc: 'Cake + flowers + chocolates + card',
      categoryId: combosCategory.id,
      basePrice: 1999,
      images: ['/placeholder-product.svg'],
      tags: ['premium', 'hamper'],
      occasion: ['birthday', 'anniversary'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'birthday-bash-combo' },
    update: {},
    create: {
      name: 'Birthday Bash Combo',
      slug: 'birthday-bash-combo',
      description: 'Birthday special combo with a 1kg cake, balloons, and a birthday banner.',
      shortDesc: '1kg cake + balloons + banner',
      categoryId: combosCategory.id,
      basePrice: 1499,
      images: ['/placeholder-product.svg'],
      tags: ['birthday', 'combo'],
      occasion: ['birthday'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'sweet-surprise-combo' },
    update: {},
    create: {
      name: 'Sweet Surprise Combo',
      slug: 'sweet-surprise-combo',
      description: 'A delightful surprise combo with a half kg red velvet cake and mixed flower bouquet.',
      shortDesc: 'Red velvet cake + mixed flowers',
      categoryId: combosCategory.id,
      basePrice: 1349,
      images: ['/placeholder-product.svg'],
      tags: ['surprise', 'combo'],
      occasion: ['birthday', 'anniversary'],
      isVeg: true,
    },
  })

  // Plant products
  const moneyPlant = await prisma.product.upsert({
    where: { slug: 'money-plant' },
    update: {},
    create: {
      name: 'Money Plant',
      slug: 'money-plant',
      description: 'Lucky money plant in a decorative ceramic pot. Low maintenance and air purifying.',
      shortDesc: 'Money plant in ceramic pot',
      categoryId: plantsCategory.id,
      basePrice: 399,
      images: ['/placeholder-product.svg'],
      tags: ['lucky', 'indoor'],
      occasion: ['housewarming', 'birthday'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'jade-plant' },
    update: {},
    create: {
      name: 'Jade Plant',
      slug: 'jade-plant',
      description: 'Beautiful jade plant known for bringing prosperity. Comes in a stylish pot.',
      shortDesc: 'Prosperity jade plant in stylish pot',
      categoryId: plantsCategory.id,
      basePrice: 499,
      images: ['/placeholder-product.svg'],
      tags: ['lucky', 'indoor', 'succulent'],
      occasion: ['housewarming', 'diwali'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'peace-lily' },
    update: {},
    create: {
      name: 'Peace Lily',
      slug: 'peace-lily',
      description: 'Elegant peace lily plant that purifies air and adds beauty to any space.',
      shortDesc: 'Air purifying peace lily',
      categoryId: plantsCategory.id,
      basePrice: 599,
      images: ['/placeholder-product.svg'],
      tags: ['air-purifying', 'indoor'],
      occasion: ['housewarming', 'birthday'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'snake-plant' },
    update: {},
    create: {
      name: 'Snake Plant',
      slug: 'snake-plant',
      description: 'Hardy snake plant that thrives in any condition. Perfect for beginners.',
      shortDesc: 'Low maintenance snake plant',
      categoryId: plantsCategory.id,
      basePrice: 449,
      images: ['/placeholder-product.svg'],
      tags: ['air-purifying', 'indoor', 'low-maintenance'],
      occasion: ['housewarming'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'bonsai-tree' },
    update: {},
    create: {
      name: 'Bonsai Tree',
      slug: 'bonsai-tree',
      description: 'Miniature bonsai tree in a ceramic pot. A unique and thoughtful gift.',
      shortDesc: 'Miniature bonsai in ceramic pot',
      categoryId: plantsCategory.id,
      basePrice: 899,
      images: ['/placeholder-product.svg'],
      tags: ['premium', 'unique'],
      occasion: ['birthday', 'housewarming'],
      isVeg: true,
    },
  })

  // Gift products
  await prisma.product.upsert({
    where: { slug: 'premium-chocolate-box' },
    update: {},
    create: {
      name: 'Premium Chocolate Box',
      slug: 'premium-chocolate-box',
      description: 'Luxurious box of 24 assorted premium chocolates. Perfect for any celebration.',
      shortDesc: '24 assorted premium chocolates',
      categoryId: giftsCategory.id,
      basePrice: 799,
      images: ['/placeholder-product.svg'],
      tags: ['premium', 'chocolate'],
      occasion: ['birthday', 'anniversary', 'diwali'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'scented-candle-set' },
    update: {},
    create: {
      name: 'Scented Candle Set',
      slug: 'scented-candle-set',
      description: 'Set of 3 luxury scented candles in lavender, vanilla, and rose fragrances.',
      shortDesc: '3 luxury scented candles set',
      categoryId: giftsCategory.id,
      basePrice: 699,
      images: ['/placeholder-product.svg'],
      tags: ['luxury', 'home-decor'],
      occasion: ['birthday', 'housewarming', 'diwali'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'personalized-mug' },
    update: {},
    create: {
      name: 'Personalized Mug',
      slug: 'personalized-mug',
      description: 'Custom printed ceramic mug with your photo and message. A memorable keepsake.',
      shortDesc: 'Custom photo printed ceramic mug',
      categoryId: giftsCategory.id,
      basePrice: 349,
      images: ['/placeholder-product.svg'],
      tags: ['personalized'],
      occasion: ['birthday', 'anniversary'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'dry-fruits-box' },
    update: {},
    create: {
      name: 'Dry Fruits Gift Box',
      slug: 'dry-fruits-box',
      description: 'Premium assorted dry fruits in an elegant gift box. Includes almonds, cashews, pistachios, and raisins.',
      shortDesc: 'Premium assorted dry fruits gift box',
      categoryId: giftsCategory.id,
      basePrice: 999,
      images: ['/placeholder-product.svg'],
      tags: ['premium', 'healthy'],
      occasion: ['diwali', 'birthday', 'housewarming'],
      isVeg: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'teddy-bear' },
    update: {},
    create: {
      name: 'Teddy Bear',
      slug: 'teddy-bear',
      description: 'Soft and cuddly teddy bear, 12 inches tall. A perfect gift for loved ones.',
      shortDesc: '12 inch soft teddy bear',
      categoryId: giftsCategory.id,
      basePrice: 599,
      images: ['/placeholder-product.svg'],
      tags: ['soft-toy', 'cute'],
      occasion: ['valentines', 'birthday'],
      isVeg: true,
    },
  })

  // ==================== VENDOR ====================
  console.log('Creating vendor user and vendor...')

  // Create vendor user
  const vendorUser = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      phone: '9876543210',
      name: 'Rajesh Kumar',
      role: UserRole.VENDOR,
      email: 'rajesh@sweetdelights.in',
    },
  })

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: 'Sweet Delights Bakery',
      ownerName: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'rajesh@sweetdelights.in',
      cityId: chandigarh.id,
      address: 'Shop No. 42, Sector 17-C, Chandigarh',
      lat: 30.7412,
      lng: 76.7842,
      categories: ['cakes', 'combos'],
      status: VendorStatus.APPROVED,
      commissionRate: 12,
      rating: 4.5,
      totalOrders: 150,
      isOnline: true,
      autoAccept: true,
      fssaiNumber: 'FSSAI12345678901234',
    },
  })

  // ==================== VENDOR PRODUCTS ====================
  console.log('Creating vendor products...')

  const cakeProducts = [
    { product: chocolateTruffleCake, costPrice: 390 },  // ~65% of 599
    { product: redVelvetCake, costPrice: 455 },          // ~65% of 699
    { product: blackForestCake, costPrice: 357 },        // ~65% of 549
    { product: butterscotchCake, costPrice: 325 },       // ~65% of 499
    { product: photoCake, costPrice: 585 },              // ~65% of 899
    { product: pineappleCake, costPrice: 357 },          // ~65% of 549
    { product: egglessChocolateCake, costPrice: 422 },   // ~65% of 649
    { product: cakeFlowersCombo, costPrice: 780 },       // ~65% of 1199
  ]

  for (const { product, costPrice } of cakeProducts) {
    await prisma.vendorProduct.upsert({
      where: {
        vendorId_productId: { vendorId: vendor.id, productId: product.id },
      },
      update: {},
      create: {
        vendorId: vendor.id,
        productId: product.id,
        costPrice,
        isAvailable: true,
        preparationTime: 120,
        dailyLimit: 20,
      },
    })
  }

  // ==================== VENDOR PINCODES ====================
  console.log('Creating vendor pincodes...')

  for (const pincode of corePincodes) {
    await prisma.vendorPincode.upsert({
      where: {
        vendorId_pincode: { vendorId: vendor.id, pincode },
      },
      update: {},
      create: {
        vendorId: vendor.id,
        pincode,
        deliveryCharge: 0,
        isActive: true,
      },
    })
  }

  // ==================== VENDOR WORKING HOURS ====================
  console.log('Creating vendor working hours...')

  // Days: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
  const workingHours = [
    { dayOfWeek: 0, openTime: '08:00', closeTime: '22:00', isClosed: false }, // Sunday
    { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00', isClosed: true },  // Monday (closed)
    { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00', isClosed: false }, // Tuesday
    { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00', isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00', isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00', isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: '08:00', closeTime: '22:00', isClosed: false }, // Saturday
  ]

  for (const hours of workingHours) {
    await prisma.vendorWorkingHours.upsert({
      where: {
        vendorId_dayOfWeek: { vendorId: vendor.id, dayOfWeek: hours.dayOfWeek },
      },
      update: {},
      create: {
        vendorId: vendor.id,
        ...hours,
      },
    })
  }

  // ==================== VENDOR SLOTS ====================
  console.log('Creating vendor slots...')

  for (const slot of allSlots) {
    await prisma.vendorSlot.upsert({
      where: {
        vendorId_slotId: { vendorId: vendor.id, slotId: slot.id },
      },
      update: {},
      create: {
        vendorId: vendor.id,
        slotId: slot.id,
        isEnabled: true,
      },
    })
  }

  // ==================== VENDOR CAPACITY ====================
  console.log('Creating vendor capacity...')

  // Create capacity for the next 7 days
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    // Reset time to midnight UTC for consistent date storage
    date.setHours(0, 0, 0, 0)

    for (const slot of allSlots) {
      await prisma.vendorCapacity.upsert({
        where: {
          vendorId_date_slotId: {
            vendorId: vendor.id,
            date,
            slotId: slot.id,
          },
        },
        update: {},
        create: {
          vendorId: vendor.id,
          date,
          slotId: slot.id,
          maxOrders: 10,
          bookedOrders: 0,
        },
      })
    }
  }

  // ==================== PRODUCT ADDONS ====================
  console.log('Creating product addons...')

  const addonProducts = [
    chocolateTruffleCake,
    redVelvetCake,
    blackForestCake,
    butterscotchCake,
    photoCake,
  ]

  const addons = [
    { name: 'Extra Candles (10 pcs)', price: 49 },
    { name: 'Knife & Server Set', price: 29 },
    { name: 'Happy Birthday Topper', price: 99 },
    { name: 'Greeting Card', price: 49 },
  ]

  for (const product of addonProducts) {
    for (const addon of addons) {
      await prisma.productAddon.create({
        data: {
          productId: product.id,
          name: addon.name,
          price: addon.price,
          isActive: true,
        },
      })
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
