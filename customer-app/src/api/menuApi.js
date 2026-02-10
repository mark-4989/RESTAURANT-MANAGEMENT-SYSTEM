import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get all menu items
export const getAllMenuItems = async (category = 'all', search = '') => {
  try {
    const params = {};
    if (category !== 'all') params.category = category;
    if (search) params.search = search;

    const response = await axios.get(`${API_URL}/menu`, { params });
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

// Seed menu items
export const seedMenuItems = async () => {
  try {
    const response = await axios.post(`${API_URL}/menu/seed`);
    return {
      success: true,
      data: response.data.data,
      count: response.data.count,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};