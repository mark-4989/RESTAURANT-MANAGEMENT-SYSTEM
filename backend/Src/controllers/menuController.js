// server/controllers/menuController.js
const MenuItem = require('../models/MenuItem');

// Try to load Cloudinary helpers, with fallback
let deleteImage;
try {
  const cloudinaryHelpers = require('../config/cloudinary');
  deleteImage = cloudinaryHelpers.deleteImage;
  console.log('✅ Cloudinary helpers loaded in controller');
} catch (error) {
  console.error('⚠️ Warning: Cloudinary helpers not available');
  console.error('Error:', error.message);
  // Create a dummy function
  deleteImage = async () => ({ success: false, message: 'Cloudinary not configured' });
}

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
  try {
    const { category, search, available } = req.query;
    
    let query = {};
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by availability
    if (available !== undefined) {
      query.available = available === 'true';
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    console.error('❌ Error in getAllMenuItems:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: error.message
    });
  }
};

// Get single menu item
exports.getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('❌ Error in getMenuItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu item',
      error: error.message
    });
  }
};

// Create new menu item (with image upload)
exports.createMenuItem = async (req, res) => {
  try {
    console.log('📝 Creating menu item...');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    // Validate required fields
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    if (!req.body.description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }

    if (!req.body.price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required'
      });
    }

    const itemData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category || 'mains',
      available: req.body.available === 'true',
      // Use uploaded image URL from Cloudinary
      image: req.file ? req.file.path : req.body.image || 'https://via.placeholder.com/400x300?text=No+Image'
    };

    console.log('📦 Item data to save:', itemData);

    const menuItem = await MenuItem.create(itemData);
    
    console.log('✅ Menu item created successfully:', menuItem._id);

    res.status(201).json({
      success: true,
      data: menuItem,
      message: 'Menu item created successfully'
    });
  } catch (error) {
    console.error('❌ Error in createMenuItem:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    // If there was an error and an image was uploaded, try to delete it
    if (req.file && req.file.path) {
      console.log('🗑️ Attempting to delete uploaded image due to error...');
      try {
        await deleteImage(req.file.path);
      } catch (deleteError) {
        console.error('Failed to delete image:', deleteError.message);
      }
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating menu item',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        body: req.body,
        file: req.file ? 'File uploaded' : 'No file'
      } : undefined
    });
  }
};

// Update menu item (with image upload)
exports.updateMenuItem = async (req, res) => {
  try {
    console.log('📝 Updating menu item:', req.params.id);
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const existingItem = await MenuItem.findById(req.params.id);
    
    if (!existingItem) {
      // If item not found and image was uploaded, delete the new image
      if (req.file && req.file.path) {
        await deleteImage(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      available: req.body.available === 'true'
    };

    // If new image was uploaded, update image URL and delete old image
    if (req.file && req.file.path) {
      console.log('🖼️ New image uploaded, replacing old one...');
      // Delete old image from Cloudinary (if it exists and is a Cloudinary URL)
      if (existingItem.image && existingItem.image.includes('cloudinary.com')) {
        console.log('🗑️ Deleting old image from Cloudinary...');
        await deleteImage(existingItem.image);
      }
      updateData.image = req.file.path;
    }
    
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Menu item updated successfully');

    res.status(200).json({
      success: true,
      data: menuItem,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error('❌ Error in updateMenuItem:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    // If there was an error and a new image was uploaded, delete it
    if (req.file && req.file.path) {
      try {
        await deleteImage(req.file.path);
      } catch (deleteError) {
        console.error('Failed to delete image:', deleteError.message);
      }
    }
    
    res.status(400).json({
      success: false,
      message: 'Error updating menu item',
      error: error.message
    });
  }
};

// Delete menu item (and its image)
exports.deleteMenuItem = async (req, res) => {
  try {
    console.log('🗑️ Deleting menu item:', req.params.id);

    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Delete image from Cloudinary before deleting the item
    if (menuItem.image && menuItem.image.includes('cloudinary.com')) {
      console.log('🗑️ Deleting image from Cloudinary...');
      await deleteImage(menuItem.image);
    }

    await MenuItem.findByIdAndDelete(req.params.id);
    
    console.log('✅ Menu item deleted successfully');

    res.status(200).json({
      success: true,
      data: {},
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteMenuItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting menu item',
      error: error.message
    });
  }
};

// Toggle menu item availability
exports.toggleAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    menuItem.available = !menuItem.available;
    await menuItem.save();
    
    res.status(200).json({
      success: true,
      data: menuItem,
      message: `Menu item marked as ${menuItem.available ? 'available' : 'unavailable'}`
    });
  } catch (error) {
    console.error('❌ Error in toggleAvailability:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling availability',
      error: error.message
    });
  }
};

// Seed sample menu items (for development)
exports.seedMenuItems = async (req, res) => {
  try {
    console.log('🌱 Seeding menu items...');

    const sampleItems = [
      {
        name: 'Grilled Ribeye Steak',
        description: 'Premium ribeye steak grilled to perfection with herbs',
        price: 2800,
        category: 'mains',
        image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
        available: true
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with parmesan cheese and croutons',
        price: 850,
        category: 'appetizers',
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
        available: true
      },
      {
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with fresh mozzarella and basil',
        price: 1400,
        category: 'mains',
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
        available: true
      },
      {
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center and vanilla ice cream',
        price: 750,
        category: 'desserts',
        image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800',
        available: true
      },
      {
        name: 'Fresh Mango Juice',
        description: 'Freshly squeezed mango juice served chilled',
        price: 350,
        category: 'drinks',
        image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800',
        available: true
      },
      {
        name: 'Buffalo Wings',
        description: 'Crispy chicken wings tossed in spicy buffalo sauce',
        price: 1200,
        category: 'appetizers',
        image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800',
        available: true
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee-soaked ladyfingers',
        price: 680,
        category: 'desserts',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
        available: true
      },
      {
        name: 'Iced Coffee',
        description: 'Cold brew coffee served over ice with milk',
        price: 320,
        category: 'drinks',
        image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
        available: true
      }
    ];
    
    await MenuItem.deleteMany({}); // Clear existing
    const items = await MenuItem.insertMany(sampleItems);
    
    console.log('✅ Menu seeded successfully with', items.length, 'items');

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Menu items seeded successfully'
    });
  } catch (error) {
    console.error('❌ Error in seedMenuItems:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding menu items',
      error: error.message
    });
  }
};