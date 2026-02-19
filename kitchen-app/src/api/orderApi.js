import axios from 'axios';

// Strip trailing /api if env var includes it — prevents /api/api/ double-prefix
const API_URL = (import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com').replace(/\/api\/?$/, '') + '/api';

// Get all orders
export const getAllOrders = async (status = 'all', date = '') => {
  try {
    const params = {};
    if (status !== 'all') params.status = status;
    if (date) params.date = date;

    const response = await axios.get(`${API_URL}/orders`, { params });
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

// Get single order
export const getOrder = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/orders/${id}`);
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

// Create new order
export const createOrder = async (orderData) => {
  try {
    const response = await axios.post(`${API_URL}/orders`, orderData);
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

// Update order status
export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await axios.patch(`${API_URL}/orders/${orderId}/status`, { status });
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

// Get order statistics
export const getOrderStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/orders/stats`);
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