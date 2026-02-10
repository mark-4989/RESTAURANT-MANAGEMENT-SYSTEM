import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { DollarSign, ShoppingCart, TrendingUp, CheckCircle, Lightbulb, Flame, Star, BarChart3, UtensilsCrossed, Salad, Coffee, Cake, Soup } from 'lucide-react';
import { getAllOrders } from '../api/orderApi';
import { getAllMenuItems } from '../api/menuApi';
import { formatPrice } from '../data/dashboardData';
import '../styles/analytics.css';

const Analytics = () => {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // today, week, month, year, all
  const [chartType, setChartType] = useState('revenue'); // revenue, orders, items

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ordersResult, menuResult] = await Promise.all([
      getAllOrders(),
      getAllMenuItems()
    ]);

    if (ordersResult.success) setOrders(ordersResult.data);
    if (menuResult.success) setMenuItems(menuResult.data);
    
    setLoading(false);
  };

  // Filter orders by time range
  const getFilteredOrders = () => {
    const now = new Date();
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      
      switch(timeRange) {
        case 'today':
          return orderDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return orderDate >= yearAgo;
        default:
          return true;
      }
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate key metrics
  const calculateMetrics = () => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      completedOrders,
      cancelledOrders,
      completionRate
    };
  };

  // Get top selling items
  const getTopSellingItems = () => {
    const itemCounts = {};
    
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        itemCounts[item.name].quantity += item.quantity;
        itemCounts[item.name].revenue += item.price * item.quantity;
      });
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  };

  // Get revenue by day
  const getRevenueByDay = () => {
    const revenueByDay = {};
    
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      if (!revenueByDay[date]) {
        revenueByDay[date] = 0;
      }
      revenueByDay[date] += order.total || 0;
    });

    return Object.entries(revenueByDay)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-14); // Last 14 days
  };

  // Get orders by hour
  const getOrdersByHour = () => {
    const ordersByHour = Array(24).fill(0);
    
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      ordersByHour[hour]++;
    });

    return ordersByHour;
  };

  // Get category breakdown
  const getCategoryBreakdown = () => {
    const categoryRevenue = {};
    
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const menuItem = menuItems.find(m => m.name === item.name);
        const category = menuItem?.category || 'other';
        
        if (!categoryRevenue[category]) {
          categoryRevenue[category] = 0;
        }
        categoryRevenue[category] += item.price * item.quantity;
      });
    });

    return Object.entries(categoryRevenue)
      .sort((a, b) => b[1] - a[1]);
  };

  const metrics = calculateMetrics();
  const topItems = getTopSellingItems();
  const revenueByDay = getRevenueByDay();
  const ordersByHour = getOrdersByHour();
  const categoryBreakdown = getCategoryBreakdown();

  const peakHour = ordersByHour.indexOf(Math.max(...ordersByHour));
  const peakHourOrders = Math.max(...ordersByHour);

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      appetizers: <Salad size={32} />,
      mains: <UtensilsCrossed size={32} />,
      desserts: <Cake size={32} />,
      drinks: <Coffee size={32} />,
      other: <Soup size={32} />
    };
    return icons[category] || <UtensilsCrossed size={32} />;
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="container">
        {/* Header */}
        <div className="page-header fade-in">
          <div>
            <h1><BarChart3 size={40} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> Analytics Dashboard</h1>
            <p className="subtitle">Track your restaurant's performance</p>
          </div>
          <div className="header-actions">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-select"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
            <button className="btn btn-glass" onClick={fetchData}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid fade-in-delay-1">
          <div className="glass-card metric-card">
            <div className="metric-icon revenue">
              <DollarSign size={32} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Revenue</div>
              <div className="metric-value">{formatPrice(metrics.totalRevenue)}</div>
              <div className="metric-change positive">
                {metrics.completedOrders} completed orders
              </div>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-icon orders">
              <ShoppingCart size={32} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Orders</div>
              <div className="metric-value">{metrics.totalOrders}</div>
              <div className="metric-change neutral">
                {metrics.cancelledOrders} cancelled
              </div>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-icon avg">
              <TrendingUp size={32} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Avg Order Value</div>
              <div className="metric-value">{formatPrice(metrics.avgOrderValue)}</div>
              <div className="metric-change positive">
                Per order average
              </div>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-icon rate">
              <CheckCircle size={32} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Completion Rate</div>
              <div className="metric-value">{metrics.completionRate.toFixed(1)}%</div>
              <div className="metric-change positive">
                Success rate
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-grid fade-in-delay-2">
          {/* Revenue Chart */}
          <div className="glass-card chart-card">
            <h3 className="chart-title"><DollarSign size={24} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} /> Revenue Trend (Last 14 Days)</h3>
            <div className="bar-chart">
              {revenueByDay.map(([date, revenue], idx) => {
                const maxRevenue = Math.max(...revenueByDay.map(d => d[1]));
                const height = (revenue / maxRevenue) * 100;
                
                return (
                  <div key={idx} className="bar-container">
                    <div 
                      className="bar"
                      style={{ height: `${height}%` }}
                      title={`${date}: ${formatPrice(revenue)}`}
                    >
                      <span className="bar-label">{formatPrice(revenue)}</span>
                    </div>
                    <span className="bar-date">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="glass-card chart-card">
            <h3 className="chart-title">⏰ Orders by Hour</h3>
            <div className="hour-chart">
              {ordersByHour.map((count, hour) => {
                const maxCount = Math.max(...ordersByHour);
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const isPeak = hour === peakHour;
                
                return (
                  <div key={hour} className="hour-bar-container">
                    <div 
                      className={`hour-bar ${isPeak ? 'peak' : ''}`}
                      style={{ height: `${height}%` }}
                      title={`${hour}:00 - ${count} orders`}
                    >
                      {count > 0 && <span className="hour-count">{count}</span>}
                    </div>
                    <span className="hour-label">{hour}</span>
                  </div>
                );
              })}
            </div>
            <div className="peak-info">
              <span className="peak-icon"><Flame size={20} /></span>
              Peak hour: {peakHour}:00 with {peakHourOrders} orders
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="bottom-grid fade-in-delay-3">
          {/* Top Selling Items */}
          <div className="glass-card table-card">
            <h3 className="chart-title"><Star size={24} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} /> Top Selling Items</h3>
            <div className="items-list">
              {topItems.length > 0 ? topItems.map((item, idx) => (
                <div key={idx} className="item-row">
                  <div className="item-rank">#{idx + 1}</div>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-stats">
                      <span className="item-quantity">{item.quantity} sold</span>
                      <span className="item-revenue">{formatPrice(item.revenue)}</span>
                    </div>
                  </div>
                  <div className="item-bar-bg">
                    <div 
                      className="item-bar"
                      style={{ 
                        width: `${(item.quantity / topItems[0].quantity) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )) : (
                <div className="empty-state-small">
                  <p>No sales data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="glass-card table-card">
            <h3 className="chart-title"><UtensilsCrossed size={24} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} /> Revenue by Category</h3>
            <div className="category-list">
              {categoryBreakdown.length > 0 ? categoryBreakdown.map(([category, revenue], idx) => {
                const total = categoryBreakdown.reduce((sum, [, r]) => sum + r, 0);
                const percentage = total > 0 ? (revenue / total) * 100 : 0;

                return (
                  <div key={idx} className="category-row">
                    <div className="category-icon">{getCategoryIcon(category)}</div>
                    <div className="category-info">
                      <div className="category-name">{category}</div>
                      <div className="category-revenue">{formatPrice(revenue)}</div>
                    </div>
                    <div className="category-percentage">{percentage.toFixed(1)}%</div>
                    <div className="category-bar-bg">
                      <div 
                        className="category-bar"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-state-small">
                  <p>No category data yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="glass-card insights-card fade-in-delay-4">
          <h3 className="chart-title"><Lightbulb size={24} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} /> Key Insights</h3>
          <div className="insights-grid">
            <div className="insight-item">
              <div className="insight-icon">
                <Flame size={40} />
              </div>
              <div className="insight-content">
                <div className="insight-title">Peak Performance</div>
                <div className="insight-text">
                  Your busiest hour is {peakHour}:00 with {peakHourOrders} orders. 
                  Consider staffing accordingly.
                </div>
              </div>
            </div>

            {topItems[0] && (
              <div className="insight-item">
                <div className="insight-icon">
                  <Star size={40} />
                </div>
                <div className="insight-content">
                  <div className="insight-title">Best Seller</div>
                  <div className="insight-text">
                    "{topItems[0].name}" is your top item with {topItems[0].quantity} units sold, 
                    generating {formatPrice(topItems[0].revenue)}.
                  </div>
                </div>
              </div>
            )}

            <div className="insight-item">
              <div className="insight-icon">
                <TrendingUp size={40} />
              </div>
              <div className="insight-content">
                <div className="insight-title">Order Success</div>
                <div className="insight-text">
                  {metrics.completionRate.toFixed(1)}% of orders are completed successfully. 
                  {metrics.cancelledOrders > 0 && ` ${metrics.cancelledOrders} orders were cancelled.`}
                </div>
              </div>
            </div>

            {categoryBreakdown[0] && (
              <div className="insight-item">
                <div className="insight-icon">
                  <UtensilsCrossed size={40} />
                </div>
                <div className="insight-content">
                  <div className="insight-title">Popular Category</div>
                  <div className="insight-text">
                    {categoryBreakdown[0][0]} generates the most revenue at {formatPrice(categoryBreakdown[0][1])}.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;