// Menu Categories
export const menuCategories = [
  { id: 'all', name: 'All Items', icon: '🍽️' },
  { id: 'appetizers', name: 'Appetizers', icon: '🥗' },
  { id: 'mains', name: 'Main Course', icon: '🍖' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
];

// Format currency
export const formatPrice = (price) => {
  return `KSh ${price.toLocaleString()}`;
};