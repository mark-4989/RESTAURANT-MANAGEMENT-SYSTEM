import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get all orders
export const getAllOrders = async (status = 'all', date = '') => {
  try {
    const params = {};
    if (status !== 'all') params.status = status;
    if (date) params.date = date;

    const response = await axios.get(`${API_URL}/orders`, { params });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Get orders error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Get single order
export const getOrder = async (orderId) => {
  try {
    const response = await axios.get(`${API_URL}/orders/${orderId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Get order error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Create new order
export const createOrder = async (orderData) => {
  try {
    const response = await axios.post(`${API_URL}/orders`, orderData);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Create order error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Update order status
export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await axios.patch(`${API_URL}/orders/${orderId}/status`, { status });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Update status error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Update entire order
export const updateOrder = async (orderId, orderData) => {
  try {
    const response = await axios.put(`${API_URL}/orders/${orderId}`, orderData);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Update order error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Delete order
export const deleteOrder = async (orderId) => {
  try {
    const response = await axios.delete(`${API_URL}/orders/${orderId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Delete order error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Get order statistics
export const getOrderStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/orders/stats`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Get stats error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};