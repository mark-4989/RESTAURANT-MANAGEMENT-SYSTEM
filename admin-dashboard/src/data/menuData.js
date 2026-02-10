// Sample Menu Data for DineSmart
export const menuCategories = [
  { id: 'all', name: 'All Items', icon: '🍽️' },
  { id: 'appetizers', name: 'Appetizers', icon: '🥗' },
  { id: 'mains', name: 'Main Course', icon: '🍖' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
];

export const menuItems = [
  // Appetizers
  {
    id: 1,
    name: 'Caesar Salad',
    category: 'appetizers',
    price: 850,
    description: 'Fresh romaine lettuce with parmesan cheese, croutons, and Caesar dressing',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
    popular: true,
    dietary: ['vegetarian'],
  },
  {
    id: 2,
    name: 'Buffalo Wings',
    category: 'appetizers',
    price: 1200,
    description: 'Crispy chicken wings tossed in spicy buffalo sauce, served with ranch',
    image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400&h=300&fit=crop',
    spicy: true,
  },
  {
    id: 3,
    name: 'Spring Rolls',
    category: 'appetizers',
    price: 650,
    description: 'Crispy vegetable spring rolls with sweet chili dipping sauce',
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=300&fit=crop',
    dietary: ['vegan'],
  },

  // Main Course
  {
    id: 4,
    name: 'Grilled Ribeye Steak',
    category: 'mains',
    price: 2800,
    description: 'Premium ribeye steak grilled to perfection, served with mashed potatoes and vegetables',
    image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
    popular: true,
  },
  {
    id: 5,
    name: 'Margherita Pizza',
    category: 'mains',
    price: 1400,
    description: 'Classic Italian pizza with fresh mozzarella, tomatoes, and basil',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
    dietary: ['vegetarian'],
    popular: true,
  },
  {
    id: 6,
    name: 'Chicken Tikka Masala',
    category: 'mains',
    price: 1600,
    description: 'Tender chicken in creamy tomato curry sauce, served with basmati rice',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    spicy: true,
  },
  {
    id: 7,
    name: 'Salmon Fillet',
    category: 'mains',
    price: 2200,
    description: 'Pan-seared salmon with lemon butter sauce, asparagus, and quinoa',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
  },
  {
    id: 8,
    name: 'Vegan Buddha Bowl',
    category: 'mains',
    price: 1300,
    description: 'Quinoa bowl with roasted vegetables, chickpeas, avocado, and tahini dressing',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    dietary: ['vegan'],
    popular: true,
  },

  // Desserts
  {
    id: 9,
    name: 'Chocolate Lava Cake',
    category: 'desserts',
    price: 750,
    description: 'Warm chocolate cake with a molten center, served with vanilla ice cream',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop',
    popular: true,
  },
  {
    id: 10,
    name: 'Tiramisu',
    category: 'desserts',
    price: 650,
    description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
  },
  {
    id: 11,
    name: 'Cheesecake',
    category: 'desserts',
    price: 700,
    description: 'Creamy New York-style cheesecake with berry compote',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
  },

  // Drinks
  {
    id: 12,
    name: 'Fresh Mango Juice',
    category: 'drinks',
    price: 350,
    description: 'Freshly squeezed mango juice',
    image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop',
  },
  {
    id: 13,
    name: 'Iced Coffee',
    category: 'drinks',
    price: 300,
    description: 'Cold brew coffee served over ice',
    image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=300&fit=crop',
  },
  {
    id: 14,
    name: 'Passion Fruit Mocktail',
    category: 'drinks',
    price: 450,
    description: 'Refreshing passion fruit mocktail with mint and soda',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    popular: true,
  },
];

// Helper function to format currency (KES)
export const formatPrice = (price) => {
  return `KSh ${price.toLocaleString()}`;
};