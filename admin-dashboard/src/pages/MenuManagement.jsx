import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader,
  UtensilsCrossed,
  Salad,
  Drumstick,
  Cake,
  Coffee,
  Check,
  X as XIcon,
  Edit,
  Trash2,
  ClipboardList,
  Sprout
} from 'lucide-react';
import { 
  getAllMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  toggleAvailability,
  seedMenuItems 
} from '../api/menuApi';
import { formatPrice } from '../data/dashboardData';
import '../styles/menu-management.css';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'mains',
    available: true
  });

  const categories = [
    { id: 'all', name: 'All Items', icon: UtensilsCrossed },
    { id: 'appetizers', name: 'Appetizers', icon: Salad },
    { id: 'mains', name: 'Main Course', icon: Drumstick },
    { id: 'desserts', name: 'Desserts', icon: Cake },
    { id: 'drinks', name: 'Drinks', icon: Coffee }
  ];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [menuItems, selectedCategory, searchQuery]);

  const fetchMenuItems = async () => {
    setLoading(true);
    const result = await getAllMenuItems();
    
    if (result.success) {
      setMenuItems(result.data);
    } else {
      toast.error('Failed to load menu');
    }
    
    setLoading(false);
  };

  const filterItems = () => {
    let filtered = menuItems;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      // Create FormData for multipart/form-data submission
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('category', formData.category);
      submitData.append('available', formData.available);
      
      // Add image file if selected
      if (imageFile) {
        submitData.append('image', imageFile);
      }
      
      let result;
      if (editingItem) {
        result = await updateMenuItem(editingItem._id, submitData);
        if (result.success) {
          toast.success('Menu item updated!');
        }
      } else {
        result = await createMenuItem(submitData);
        if (result.success) {
          toast.success('Menu item created!');
        }
      }
      
      if (result.success) {
        fetchMenuItems();
        closeModal();
      } else {
        toast.error(result.error || 'Something went wrong');
      }
    } catch (error) {
      toast.error('Failed to save menu item');
      console.error('Error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      available: item.available
    });
    setImagePreview(item.image);
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item? This will also delete its image.')) return;
    
    const result = await deleteMenuItem(itemId);
    
    if (result.success) {
      toast.success('Menu item deleted');
      fetchMenuItems();
    } else {
      toast.error('Failed to delete item');
    }
  };

  const handleToggleAvailability = async (itemId) => {
    const result = await toggleAvailability(itemId);
    
    if (result.success) {
      toast.success('Availability updated');
      fetchMenuItems();
    } else {
      toast.error('Failed to update availability');
    }
  };

  const handleSeedMenu = async () => {
    if (!confirm('This will replace all menu items with sample data. Continue?')) return;
    
    const result = await seedMenuItems();
    
    if (result.success) {
      toast.success('Sample menu loaded!');
      fetchMenuItems();
    } else {
      toast.error('Failed to seed menu');
    }
  };

  const openModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'mains',
      available: true
    });
    setImagePreview(null);
    setImageFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setImagePreview(null);
    setImageFile(null);
  };

  return (
    <div className="menu-management-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header fade-in">
          <div>
            <h1>Menu Management</h1>
            <p className="subtitle">Manage your restaurant menu items</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={openModal}>
              + Add Menu Item
            </button>
            <button className="btn btn-glass" onClick={handleSeedMenu}>
              <Sprout size={16} /> Load Sample Menu
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section fade-in-delay-1">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="category-filters">
            {categories.map(cat => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <IconComponent size={14} style={{ marginRight: '4px', display: 'inline' }} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading menu...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="menu-grid fade-in-delay-2">
            {filteredItems.map(item => {
              const CategoryIcon = categories.find(c => c.id === item.category)?.icon || UtensilsCrossed;
              return (
                <div key={item._id} className="menu-item-card">
                  <div className="item-image-container">
                    <img 
                      src={item.image || 'https://via.placeholder.com/400x300?text=No+Image'} 
                      alt={item.name}
                      className="item-image"
                    />
                    {!item.available && (
                      <div className="sold-out-overlay">SOLD OUT</div>
                    )}
                  </div>
                  
                  <div className="item-content">
                    <div className="item-header">
                      <h3>{item.name}</h3>
                      <span className="item-category">
                        <CategoryIcon size={18} />
                      </span>
                    </div>
                    
                    <p className="item-description">{item.description}</p>
                    
                    <div className="item-footer">
                      <span className="item-price">{formatPrice(item.price)}</span>
                      
                      <div className="item-actions">
                        <button
                          className={`action-btn ${item.available ? 'btn-success' : 'btn-warning'}`}
                          onClick={() => handleToggleAvailability(item._id)}
                          title="Toggle availability"
                        >
                          {item.available ? <Check size={14} /> : <XIcon size={14} />}
                        </button>
                        <button
                          className="action-btn btn-primary"
                          onClick={() => handleEdit(item)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="action-btn btn-danger"
                          onClick={() => handleDelete(item._id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><ClipboardList size={56} style={{ opacity: 0.3 }} /></div>
            <h2>No menu items found</h2>
            <p>Add your first menu item or load sample data to get started</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={openModal}>
                + Add Menu Item
              </button>
              <button className="btn btn-glass" onClick={handleSeedMenu}>
                <Sprout size={16} /> Load Sample Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Image Upload Section */}
              <div className="form-group">
                <label>Item Image *</label>
                
                {!imagePreview ? (
                  <div
                    className={`image-upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    <Upload size={48} className="upload-icon" />
                    <p className="upload-text">
                      <strong>Click to upload</strong> or drag and drop
                    </p>
                    <p className="upload-hint">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={removeImage}
                      title="Remove image"
                    >
                      <X size={20} />
                    </button>
                    <button
                      type="button"
                      className="change-image-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={16} />
                      Change Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Grilled Salmon"
                />
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Brief description of the dish"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price (KSh) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="appetizers">Appetizers</option>
                    <option value="mains">Main Course</option>
                    <option value="desserts">Desserts</option>
                    <option value="drinks">Drinks</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="available"
                    checked={formData.available}
                    onChange={handleInputChange}
                  />
                  <span>Available for ordering</span>
                </label>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-glass" 
                  onClick={closeModal}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader size={16} className="spinner-icon" />
                      {editingItem ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingItem ? 'Update Item' : 'Add Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;