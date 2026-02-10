// admin-dashboard/src/api/menuApi.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get all menu items
export const getAllMenuItems = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.category && filters.category !== 'all') {
      params.append('category', filters.category);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.available !== undefined) {
      params.append('available', filters.available);
    }

    const response = await axios.get(`${API_URL}/menu?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch menu items'
    };
  }
};

// Get single menu item
export const getMenuItem = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/menu/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch menu item'
    };
  }
};

// Create new menu item (with image upload support)
export const createMenuItem = async (formData) => {
  try {
    // FormData is already prepared in the component
    // No need to set Content-Type header - axios will set it automatically for FormData
    const response = await axios.post(`${API_URL}/menu`, formData);
    return response.data;
  } catch (error) {
    console.error('Error creating menu item:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to create menu item'
    };
  }
};

// Update menu item (with image upload support)
export const updateMenuItem = async (id, formData) => {
  try {
    // FormData is already prepared in the component
    const response = await axios.put(`${API_URL}/menu/${id}`, formData);
    return response.data;
  } catch (error) {
    console.error('Error updating menu item:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to update menu item'
    };
  }
};

// Delete menu item
export const deleteMenuItem = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/menu/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to delete menu item'
    };
  }
};

// Toggle menu item availability
export const toggleAvailability = async (id) => {
  try {
    const response = await axios.patch(`${API_URL}/menu/${id}/toggle-availability`);
    return response.data;
  } catch (error) {
    console.error('Error toggling availability:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to toggle availability'
    };
  }
};

// Seed sample menu items
export const seedMenuItems = async () => {
  try {
    const response = await axios.post(`${API_URL}/menu/seed`);
    return response.data;
  } catch (error) {
    console.error('Error seeding menu:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to seed menu'
    };
  }
};