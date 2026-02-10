// admin-dashboard/src/pages/DeliveryManagement.jsx - COMPLETE UBER-STYLE VERSION
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Radio,
  X,
  Navigation,
  Phone,
  Truck,
  Package,
  Clock,
  Map as MapIcon,
  Maximize2,
} from "lucide-react";
import "../styles/delivery-management.css";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA";

const DeliveryManagement = () => {
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLiveMapModal, setShowLiveMapModal] = useState(false);
  const [liveDriverLocations, setLiveDriverLocations] = useState({});
  const [expandedDates, setExpandedDates] = useState({});
  const [trackingOrder, setTrackingOrder] = useState(null);

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const liveMapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const liveMapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const activeMarkersRef = useRef({});
  const routeLinesRef = useRef({});

  useEffect(() => {
    fetchDeliveryOrders();
    fetchDrivers();
    initializeWebSocket();
    loadMapboxScript();

    const interval = setInterval(() => {
      fetchDeliveryOrders();
      fetchDrivers();
    }, 30000);

    return () => {
      if (socketRef.current) socketRef.current.close();
      clearInterval(interval);
    };
  }, []);

  const initializeWebSocket = () => {
    socketRef.current = new WebSocket("ws://localhost:5000");

    socketRef.current.onopen = () =>
      console.log("📡 Admin connected to tracking server");

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "DRIVER_LOCATION_UPDATE") {
          console.log("📍 Driver location update:", data);

          setLiveDriverLocations((prev) => ({
            ...prev,
            [data.driverId]: {
              location: data.location,
              orderId: data.orderId,
              driverName: data.driverName,
              timestamp: data.timestamp,
            },
          }));

          if (trackingOrder && data.orderId === trackingOrder._id) {
            updateDriverMarker(data.location);
            drawRoute(trackingOrder, data.location);
          }

          if (showLiveMapModal) {
            updateLiveMapDriver(data.driverId, data.location, data.orderId);
          }
        }

        if (
          data.type === "ORDER_STATUS_UPDATE" ||
          data.type === "DELIVERY_STATUS_UPDATE"
        ) {
          fetchDeliveryOrders();
        }
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    };
  };

  const loadMapboxScript = () => {
    if (window.mapboxgl) return;

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js";
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  };

  const initializeMap = (order) => {
    if (
      !mapRef.current ||
      !window.mapboxgl ||
      !order.deliveryLat ||
      !order.deliveryLng
    )
      return;

    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (mapInstanceRef.current) mapInstanceRef.current.remove();

    mapInstanceRef.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [order.deliveryLng, order.deliveryLat],
      zoom: 13,
      pitch: 45,
      bearing: -17.6,
    });

    mapInstanceRef.current.addControl(new mapboxgl.NavigationControl());

    customerMarkerRef.current = new mapboxgl.Marker({
      color: "#ef4444",
      scale: 1.2,
    })
      .setLngLat([order.deliveryLng, order.deliveryLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 12px; background: #1a1a2e; border-radius: 8px;">
          <strong style="color: #fff; font-size: 14px;">📍 Delivery Location</strong><br/>
          <span style="color: #aaa; font-size: 12px;">${order.deliveryAddress}</span>
        </div>
      `),
      )
      .addTo(mapInstanceRef.current);

    const driverLocation = liveDriverLocations[order.driver];
    if (driverLocation?.location) {
      updateDriverMarker(driverLocation.location);
      drawRoute(order, driverLocation.location);
    }
  };

  const updateDriverMarker = (location) => {
    if (!mapInstanceRef.current || !window.mapboxgl) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([location.lng, location.lat]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = "🚗";
      el.style.fontSize = "30px";
      el.style.cursor = "pointer";

      driverMarkerRef.current = new window.mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 12px; background: #1a1a2e; border-radius: 8px;">
            <strong style="color: #10b981; font-size: 14px;">🚗 Driver</strong><br/>
            <span style="color: #aaa; font-size: 12px;">On the way!</span>
          </div>
        `),
        )
        .addTo(mapInstanceRef.current);
    }

    if (customerMarkerRef.current) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([location.lng, location.lat]);
      bounds.extend(customerMarkerRef.current.getLngLat());
      mapInstanceRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }
  };

  const drawRoute = async (order, driverLocation) => {
    if (!mapInstanceRef.current) return;

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes?.[0]) {
        const route = data.routes[0].geometry;

        if (mapInstanceRef.current.getSource("route")) {
          mapInstanceRef.current
            .getSource("route")
            .setData({ type: "Feature", geometry: route });
        } else {
          mapInstanceRef.current.addSource("route", {
            type: "geojson",
            data: { type: "Feature", geometry: route },
          });

          mapInstanceRef.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#10b981",
              "line-width": 4,
              "line-opacity": 0.8,
            },
          });
        }
      }
    } catch (error) {
      console.error("Route error:", error);
    }
  };

  const initializeLiveMap = () => {
    if (!liveMapRef.current || !window.mapboxgl) return;

    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (liveMapInstanceRef.current) liveMapInstanceRef.current.remove();

    liveMapInstanceRef.current = new mapboxgl.Map({
      container: liveMapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [36.8219, -1.2921],
      zoom: 11,
      pitch: 45,
      bearing: 0,
    });

    liveMapInstanceRef.current.addControl(new mapboxgl.NavigationControl());
    liveMapInstanceRef.current.addControl(new mapboxgl.FullscreenControl());

    liveMapInstanceRef.current.on("load", plotAllActiveDeliveries);
  };

  const plotAllActiveDeliveries = () => {
    if (!liveMapInstanceRef.current) return;

    const mapboxgl = window.mapboxgl;
    const activeDeliveries = deliveryOrders.filter((o) =>
      ["assigned", "picked-up", "on-the-way"].includes(o.deliveryStatus),
    );

    Object.values(activeMarkersRef.current).forEach((marker) =>
      marker.remove(),
    );
    activeMarkersRef.current = {};

    const bounds = new mapboxgl.LngLatBounds();

    activeDeliveries.forEach((order) => {
      if (!order.deliveryLat || !order.deliveryLng) return;

      const customerEl = document.createElement("div");
      customerEl.innerHTML = `
        <div style="background: #ef4444; color: white; padding: 8px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5); white-space: nowrap; cursor: pointer;">
          📍 ${order.orderNumber}
        </div>
      `;

      const customerMarker = new mapboxgl.Marker({
        element: customerEl,
        anchor: "bottom",
      })
        .setLngLat([order.deliveryLng, order.deliveryLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="padding: 16px; background: #1a1a2e; border-radius: 12px; min-width: 200px;">
            <div style="margin-bottom: 8px;">
              <strong style="color: #fff; font-size: 16px;">${order.orderNumber}</strong>
              <span style="background: ${getStatusColor(order.deliveryStatus)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px;">${order.deliveryStatus?.toUpperCase()}</span>
            </div>
            <div style="color: #aaa; font-size: 13px; margin-bottom: 4px;">👤 ${order.customerName}</div>
            <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">📍 ${order.deliveryAddress?.substring(0, 40)}...</div>
            <div style="color: #10b981; font-weight: 600; font-size: 14px;">${formatPrice(order.total)}</div>
          </div>
        `),
        )
        .addTo(liveMapInstanceRef.current);

      activeMarkersRef.current[`customer-${order._id}`] = customerMarker;
      bounds.extend([order.deliveryLng, order.deliveryLat]);

      const driverLocation = liveDriverLocations[order.driver];
      if (driverLocation?.location) {
        updateLiveMapDriver(order.driver, driverLocation.location, order._id);
        bounds.extend([
          driverLocation.location.lng,
          driverLocation.location.lat,
        ]);
        drawLiveRoute(order, driverLocation.location);
      }
    });

    if (!bounds.isEmpty()) {
      liveMapInstanceRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 14,
        duration: 1000,
      });
    }
  };

  const updateLiveMapDriver = (driverId, location, orderId) => {
    if (!liveMapInstanceRef.current || !window.mapboxgl) return;

    const markerId = `driver-${driverId}`;

    if (activeMarkersRef.current[markerId]) {
      activeMarkersRef.current[markerId].setLngLat([
        location.lng,
        location.lat,
      ]);
    } else {
      const driverEl = document.createElement("div");
      driverEl.innerHTML = `
        <div style="position: relative; animation: pulse 2s infinite;">
          <div style="background: #10b981; padding: 8px 12px; border-radius: 20px; font-size: 20px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5); cursor: pointer;">🚗</div>
          <div style="position: absolute; top: -8px; right: -8px; background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #1a1a2e; animation: ping 1s infinite;"></div>
        </div>
      `;

      const driverMarker = new window.mapboxgl.Marker({
        element: driverEl,
        anchor: "center",
      })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 25, closeButton: false })
            .setHTML(`
          <div style="padding: 12px; background: #1a1a2e; border-radius: 8px;">
            <strong style="color: #10b981; font-size: 14px;">🚗 Driver</strong><br/>
            <span style="color: #aaa; font-size: 12px;">Active Delivery</span>
          </div>
        `),
        )
        .addTo(liveMapInstanceRef.current);

      activeMarkersRef.current[markerId] = driverMarker;
    }

    const order = deliveryOrders.find((o) => o._id === orderId);
    if (order) drawLiveRoute(order, location);
  };

  const drawLiveRoute = async (order, driverLocation) => {
    if (!liveMapInstanceRef.current) return;

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes?.[0]) {
        const route = data.routes[0].geometry;
        const sourceId = `route-${order._id}`;
        const layerId = `route-layer-${order._id}`;

        if (liveMapInstanceRef.current.getSource(sourceId)) {
          liveMapInstanceRef.current
            .getSource(sourceId)
            .setData({ type: "Feature", geometry: route });
        } else {
          liveMapInstanceRef.current.addSource(sourceId, {
            type: "geojson",
            data: { type: "Feature", geometry: route },
          });

          liveMapInstanceRef.current.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#10b981",
              "line-width": 3,
              "line-opacity": 0.7,
              "line-dasharray": [2, 2],
            },
          });
        }

        const duration = Math.round(data.routes[0].duration / 60);
        console.log(`📍 ${order.orderNumber} - ETA: ${duration} minutes`);
      }
    } catch (error) {
      console.error("Live route error:", error);
    }
  };

  const openTracking = (order) => {
    setTrackingOrder(order);
    setTimeout(() => initializeMap(order), 100);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "SUBSCRIBE_ORDER", orderId: order._id }),
      );
    }
  };

  const closeTracking = () => {
    setTrackingOrder(null);
    if (mapInstanceRef.current) mapInstanceRef.current.remove();
    mapInstanceRef.current = null;
    driverMarkerRef.current = null;
    customerMarkerRef.current = null;
  };

  const openLiveMap = () => {
    setShowLiveMapModal(true);
    setTimeout(() => initializeLiveMap(), 100);
  };

  const closeLiveMap = () => {
    setShowLiveMapModal(false);
    if (liveMapInstanceRef.current) liveMapInstanceRef.current.remove();
    liveMapInstanceRef.current = null;
    Object.values(activeMarkersRef.current).forEach((marker) =>
      marker.remove(),
    );
    activeMarkersRef.current = {};
  };

  const fetchDeliveryOrders = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/orders?orderType=delivery",
      );
      const data = await response.json();
      if (data.success) setDeliveryOrders(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/drivers");
      const data = await response.json();
      if (data.success) setDrivers(data.data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const assignDriver = async (orderId, driverId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/assign-driver`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId, deliveryStatus: "assigned" }),
        },
      );

      if (response.ok) {
        toast.success("✅ Driver assigned!");
        fetchDeliveryOrders();
        fetchDrivers();
        setShowAssignModal(false);
        setSelectedOrder(null);
        setSelectedDriver("");
      } else {
        toast.error("Failed to assign driver");
      }
    } catch (error) {
      toast.error("Failed to assign driver");
    }
  };

  const broadcastOrder = async (orderId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/broadcast`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ broadcast: true }),
        },
      );

      if (response.ok) {
        toast.success("📢 Order broadcasted!");
        fetchDeliveryOrders();
      } else {
        toast.error("Failed to broadcast");
      }
    } catch (error) {
      toast.error("Failed to broadcast");
    }
  };

  const toggleDate = (dateKey) => {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const calculateTimeSince = (date) => {
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b",
      assigned: "#3b82f6",
      "picked-up": "#8b5cf6",
      "on-the-way": "#10b981",
      delivered: "#22c55e",
      cancelled: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const getUrgency = (orderTime) => {
    const minutes = Math.floor((new Date() - new Date(orderTime)) / 60000);
    if (minutes > 30) return { label: "URGENT", color: "#ef4444" };
    if (minutes > 15) return { label: "HIGH", color: "#f59e0b" };
    return { label: "NORMAL", color: "#10b981" };
  };

  const formatPrice = (price) => `KSh ${price?.toLocaleString() || 0}`;

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const ordersByDate = deliveryOrders.reduce((acc, order) => {
    const dateKey = new Date(order.createdAt).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(ordersByDate).sort(
    (a, b) => new Date(b) - new Date(a),
  );
  const pendingOrders = deliveryOrders.filter(
    (o) => o.deliveryStatus === "pending" || !o.deliveryStatus,
  );
  const assignedOrders = deliveryOrders.filter(
    (o) => o.deliveryStatus === "assigned",
  );
  const activeOrders = deliveryOrders.filter((o) =>
    ["picked-up", "on-the-way"].includes(o.deliveryStatus),
  );
  const completedOrders = deliveryOrders.filter(
    (o) => o.deliveryStatus === "delivered",
  );
  const availableDrivers = drivers.filter(
    (d) => d.status === "available" || d.isAvailable,
  );

  if (loading) {
    return (
      <div className="delivery-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading delivery orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-management">
      <div className="page-header">
        <div>
          <h1>🚚 Delivery Management</h1>
          <p>Manage and dispatch delivery orders with live tracking</p>
        </div>

        {activeOrders.length > 0 && (
          <button
            onClick={openLiveMap}
            style={{
              padding: "1rem 2rem",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "1.1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            <MapIcon size={24} />
            View Live Map ({activeOrders.length} Active)
            <div
              style={{
                width: "10px",
                height: "10px",
                background: "#ef4444",
                borderRadius: "50%",
                animation: "pulse 2s infinite",
              }}
            />
          </button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{pendingOrders.length}</div>
            <div className="stat-label">Pending Assignment</div>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{assignedOrders.length}</div>
            <div className="stat-label">Assigned</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <div className="stat-value">{activeOrders.length}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{completedOrders.length}</div>
            <div className="stat-label">Completed Today</div>
          </div>
        </div>
      </div>

      <div className="glass-card drivers-section">
        <h2>👥 Available Drivers ({availableDrivers.length})</h2>
        <div className="drivers-list">
          {availableDrivers.length > 0 ? (
            availableDrivers.map((driver) => (
              <div key={driver._id} className="driver-badge">
                <div className="driver-status-dot available"></div>
                <div className="driver-info">
                  <strong>
                    {driver.firstName} {driver.lastName}
                  </strong>
                  <small>
                    {driver.vehicleType} • {driver.vehicleRegistration}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#666", padding: "1rem" }}>
              No drivers currently available
            </p>
          )}
        </div>
      </div>

      {sortedDates.length > 0 ? (
        sortedDates.map((dateKey) => {
          const ordersForDate = ordersByDate[dateKey];
          const isExpanded = expandedDates[dateKey] !== false;
          const dateLabel = formatDate(dateKey);
          const datePending = ordersForDate.filter(
            (o) => o.deliveryStatus === "pending" || !o.deliveryStatus,
          ).length;
          const dateActive = ordersForDate.filter((o) =>
            ["assigned", "picked-up", "on-the-way"].includes(o.deliveryStatus),
          ).length;
          const dateCompleted = ordersForDate.filter(
            (o) => o.deliveryStatus === "delivered",
          ).length;

          return (
            <div key={dateKey} className="glass-card date-section">
              <div className="date-header" onClick={() => toggleDate(dateKey)}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <h2 style={{ margin: 0 }}>📅 {dateLabel}</h2>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {datePending > 0 && (
                      <span className="mini-badge orange">
                        {datePending} Pending
                      </span>
                    )}
                    {dateActive > 0 && (
                      <span className="mini-badge blue">
                        {dateActive} Active
                      </span>
                    )}
                    {dateCompleted > 0 && (
                      <span className="mini-badge green">
                        {dateCompleted} Completed
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={24} />
                ) : (
                  <ChevronDown size={24} />
                )}
              </div>

              {isExpanded && (
                <div className="orders-grid" style={{ marginTop: "1.5rem" }}>
                  {ordersForDate.map((order) => {
                    const urgency = getUrgency(order.createdAt);
                    const driverLiveLocation =
                      order.driver && liveDriverLocations[order.driver];
                    const isLiveTracking =
                      driverLiveLocation &&
                      ["picked-up", "on-the-way"].includes(
                        order.deliveryStatus,
                      );
                    const isPending =
                      order.deliveryStatus === "pending" ||
                      !order.deliveryStatus;

                    return (
                      <div
                        key={order._id}
                        className={`order-card ${isPending ? "urgent-order" : ""}`}
                        style={{ position: "relative" }}
                      >
                        {isLiveTracking && (
                          <div className="live-indicator">
                            <div className="pulse-dot" />
                            <Radio size={14} style={{ color: "#10b981" }} />
                            <span>Live</span>
                          </div>
                        )}

                        <div className="order-card-header">
                          <div>
                            <h3>{order.orderNumber}</h3>
                            {isPending ? (
                              <span
                                className="urgency-badge"
                                style={{ background: urgency.color }}
                              >
                                {urgency.label}
                              </span>
                            ) : (
                              <span
                                className="status-badge"
                                style={{
                                  background: getStatusColor(
                                    order.deliveryStatus,
                                  ),
                                }}
                              >
                                {order.deliveryStatus?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="order-total">
                            {formatPrice(order.total)}
                          </div>
                        </div>

                        <div className="order-card-body">
                          <div className="delivery-info-grid">
                            <div>
                              <strong>👤 Customer:</strong>
                              <p>{order.customerName}</p>
                            </div>
                            <div>
                              <strong>🚗 Driver:</strong>
                              <p>{order.driverName || "Not assigned"}</p>
                            </div>
                            <div>
                              <strong>📞 Phone:</strong>
                              <p>{order.deliveryPhone}</p>
                            </div>
                            <div>
                              <strong>⏱️ Time:</strong>
                              <p>{calculateTimeSince(order.createdAt)}</p>
                            </div>
                          </div>

                          <div className="delivery-address compact">
                            <strong>📍</strong>
                            <p>{order.deliveryAddress}</p>
                          </div>

                          {order.deliveryInstructions && (
                            <div className="instructions">
                              💬 "{order.deliveryInstructions}"
                            </div>
                          )}

                          {isLiveTracking && (
                            <div className="live-location-info">
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>
                                  📍 Driver Location:
                                </span>
                                <span>
                                  {new Date(
                                    driverLiveLocation.timestamp,
                                  ).toLocaleTimeString()}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  marginTop: "0.25rem",
                                }}
                              >
                                {driverLiveLocation.location.lat.toFixed(6)},{" "}
                                {driverLiveLocation.location.lng.toFixed(6)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="order-card-actions">
                          {isPending ? (
                            <>
                              <button
                                className="btn-assign"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowAssignModal(true);
                                }}
                              >
                                🎯 Assign Driver
                              </button>
                              <button
                                className="btn-broadcast"
                                onClick={() => broadcastOrder(order._id)}
                              >
                                📢 Broadcast
                              </button>
                            </>
                          ) : (
                            <>
                              {isLiveTracking &&
                                order.deliveryLat &&
                                order.deliveryLng && (
                                  <button
                                    className="btn-track"
                                    onClick={() => openTracking(order)}
                                  >
                                    <Navigation size={16} /> Track on Map
                                  </button>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div
          className="glass-card"
          style={{ textAlign: "center", padding: "3rem" }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📦</div>
          <h3 style={{ color: "var(--text-primary)" }}>No delivery orders</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Orders will appear here once placed
          </p>
        </div>
      )}

      {showAssignModal && selectedOrder && (
        <div
          className="modal-overlay"
          onClick={() => setShowAssignModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 Assign Driver to {selectedOrder.orderNumber}</h2>
              <button
                className="close-btn"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="order-summary">
                <p>
                  <strong>Customer:</strong> {selectedOrder.customerName}
                </p>
                <p>
                  <strong>Address:</strong> {selectedOrder.deliveryAddress}
                </p>
                <p>
                  <strong>Total:</strong> {formatPrice(selectedOrder.total)}
                </p>
              </div>
              <div className="form-group">
                <label>Select Driver:</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="driver-select"
                >
                  <option value="">-- Select a driver --</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.firstName} {driver.lastName} -{" "}
                      {driver.vehicleType} ({driver.vehicleRegistration})
                    </option>
                  ))}
                </select>
              </div>
              {availableDrivers.length === 0 && (
                <p className="warning-text">
                  ⚠️ No drivers available. Consider broadcasting.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() =>
                  selectedDriver &&
                  assignDriver(selectedOrder._id, selectedDriver)
                }
                disabled={!selectedDriver}
              >
                ✅ Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingOrder && (
        <div className="modal-overlay" onClick={closeTracking}>
          <div
            className="modal-content tracking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>🗺️ Live Tracking: {trackingOrder.orderNumber}</h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  📍 {trackingOrder.deliveryAddress}
                </p>
              </div>
              <button className="close-btn" onClick={closeTracking}>
                <X size={20} />
              </button>
            </div>
            <div
              ref={mapRef}
              style={{
                width: "100%",
                height: "500px",
                borderRadius: "12px",
                marginBottom: "1rem",
              }}
            />
            <div
              style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    window.innerWidth > 768 ? "1fr 1fr 1fr" : "1fr",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Package size={24} style={{ color: "#667eea" }} />
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Customer
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {trackingOrder.customerName}
                    </div>
                  </div>
                </div>
                {trackingOrder.driverName && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <Truck size={24} style={{ color: "#10b981" }} />
                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Driver
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {trackingOrder.driverName}
                      </div>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Clock size={24} style={{ color: "#3b82f6" }} />
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Total
                    </div>
                    <div style={{ fontWeight: 600, color: "#10b981" }}>
                      {formatPrice(trackingOrder.total)}
                    </div>
                  </div>
                </div>
              </div>
              {trackingOrder.deliveryPhone && (
                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(59, 130, 246, 0.1)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  <Phone size={20} style={{ color: "#3b82f6" }} />
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Contact Customer
                    </div>
                    <div style={{ fontWeight: 600, color: "#3b82f6" }}>
                      {trackingOrder.deliveryPhone}
                    </div>
                  </div>
                </div>
              )}
              {trackingOrder.deliveryLat && trackingOrder.deliveryLng && (
                <button
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${trackingOrder.deliveryLat},${trackingOrder.deliveryLng}`,
                      "_blank",
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "var(--gradient-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <MapPin size={18} /> Open in Google Maps
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLiveMapModal && (
        <div className="modal-overlay" onClick={closeLiveMap}>
          <div
            className="modal-content live-map-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>🗺️ Live Delivery Map</h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  Tracking {activeOrders.length} active{" "}
                  {activeOrders.length === 1 ? "delivery" : "deliveries"}
                </p>
              </div>
              <div
                style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    background: "rgba(16, 185, 129, 0.1)",
                    borderRadius: "20px",
                    border: "2px solid #10b981",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      background: "#10b981",
                      borderRadius: "50%",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <span
                    style={{
                      color: "#10b981",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    Live Updates
                  </span>
                </div>
                <button className="close-btn" onClick={closeLiveMap}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div
              ref={liveMapRef}
              style={{ width: "100%", height: "80vh", borderRadius: "12px" }}
            />
            <div
              style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "12px",
                marginTop: "1rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "8px",
                  borderLeft: "4px solid #ef4444",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#ef4444",
                    marginBottom: "0.25rem",
                  }}
                >
                  Customer Locations
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#ef4444",
                  }}
                >
                  {activeOrders.length}
                </div>
              </div>
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(16, 185, 129, 0.1)",
                  borderRadius: "8px",
                  borderLeft: "4px solid #10b981",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#10b981",
                    marginBottom: "0.25rem",
                  }}
                >
                  Active Drivers
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#10b981",
                  }}
                >
                  {Object.keys(liveDriverLocations).length}
                </div>
              </div>
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(139, 92, 246, 0.1)",
                  borderRadius: "8px",
                  borderLeft: "4px solid #8b5cf6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#8b5cf6",
                    marginBottom: "0.25rem",
                  }}
                >
                  Total Value
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#8b5cf6",
                  }}
                >
                  {formatPrice(
                    activeOrders.reduce((sum, o) => sum + o.total, 0),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .tracking-modal { max-width: 900px !important; }
        .live-map-modal { max-width: 95vw !important; width: 95vw !important; }
        .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
      `}</style>
    </div>
  );
};

export default DeliveryManagement;
