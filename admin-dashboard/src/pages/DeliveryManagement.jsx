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
  RotateCcw,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Users,
  DollarSign,
} from "lucide-react";
import "../styles/delivery-management.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

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
  const driverTrailRef = useRef([]);       // breadcrumb coords for single-order tracking
  const liveDriverTrailsRef = useRef({}); // breadcrumb coords per driverId on live map

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
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    socketRef.current = new WebSocket(wsUrl);

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
      style: "mapbox://styles/mapbox/streets-v12",
      center: [order.deliveryLng, order.deliveryLat],
      zoom: 14,
      pitch: 50,
      bearing: -10,
    });

    mapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapInstanceRef.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    // Reset trail for this order
    driverTrailRef.current = [];

    mapInstanceRef.current.on("load", () => {
      // Pre-add trail source so we can update it later
      if (mapInstanceRef.current) {
        mapInstanceRef.current.addSource("driver-trail", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
        });
        mapInstanceRef.current.addLayer({
          id: "driver-trail-layer",
          type: "line",
          source: "driver-trail",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#f97316",
            "line-width": 4,
            "line-opacity": 0.85,
            "line-dasharray": [2, 1.5],
          },
        });
      }
    });

    // Styled customer marker
    const customerEl = document.createElement("div");
    customerEl.innerHTML = `
      <div style="
        width:44px; height:44px; background:#ef4444; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 20px rgba(239,68,68,0.5); border:3px solid #fff;
        position:relative;
      ">
        <span style="transform:rotate(45deg); font-size:20px; line-height:1;">🏠</span>
      </div>
      <div style="
        position:absolute; bottom:-22px; left:50%; transform:translateX(-50%);
        background:#ef4444; color:#fff; font-size:10px; font-weight:800; padding:2px 8px;
        border-radius:10px; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.25);
      ">CUSTOMER</div>
    `;
    customerEl.style.position = "relative";
    customerEl.style.cursor = "pointer";

    customerMarkerRef.current = new mapboxgl.Marker({ element: customerEl, anchor: "bottom" })
      .setLngLat([order.deliveryLng, order.deliveryLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 30, closeButton: false })
          .setHTML(`
          <div style="
            padding:14px 16px; background:#fff; border-radius:12px;
            font-family:system-ui,sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.12);
            min-width:200px;
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;background:#ef4444;border-radius:50%;"></div>
              <strong style="color:#111; font-size:13px;">Delivery Destination</strong>
            </div>
            <div style="color:#444; font-size:12px; line-height:1.5;">${order.deliveryAddress}</div>
            ${order.customerName ? `<div style="margin-top:8px;color:#888;font-size:11px;">👤 ${order.customerName}</div>` : ""}
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

    // Append to trail
    driverTrailRef.current.push([location.lng, location.lat]);

    // Update trail on map if source is loaded
    if (mapInstanceRef.current.getSource("driver-trail")) {
      mapInstanceRef.current.getSource("driver-trail").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: driverTrailRef.current },
      });
    }

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([location.lng, location.lat]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width:48px;height:48px;background:linear-gradient(135deg,#10b981,#059669);
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 4px rgba(16,185,129,0.3), 0 4px 20px rgba(16,185,129,0.5);
          border:3px solid #fff; font-size:22px; cursor:pointer;
          animation:driverPulse 2s ease-in-out infinite;
        ">🛵</div>
        <div style="
          position:absolute; bottom:-20px; left:50%; transform:translateX(-50%);
          background:#10b981; color:#fff; font-size:10px; font-weight:800;
          padding:2px 8px; border-radius:10px; white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
        ">DRIVER</div>
      `;
      el.style.position = "relative";
      el.style.cursor = "pointer";

      driverMarkerRef.current = new window.mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
          <div style="
            padding:14px 16px; background:#fff; border-radius:12px;
            font-family:system-ui,sans-serif; min-width:180px;
            box-shadow:0 8px 30px rgba(0,0,0,0.12);
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;background:#10b981;border-radius:50%;"></div>
              <strong style="color:#111;font-size:13px;">Driver – En Route</strong>
            </div>
            <div style="color:#888;font-size:11px;">Lat: ${location.lat.toFixed(5)}</div>
            <div style="color:#888;font-size:11px;">Lng: ${location.lng.toFixed(5)}</div>
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
              "line-color": "#3b82f6",
              "line-width": 6,
              "line-opacity": 0.9,
              "line-gradient": [
                "interpolate",
                ["linear"],
                ["line-progress"],
                0, "#10b981",
                0.5, "#3b82f6",
                1, "#8b5cf6",
              ],
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

    const activeOrdersWithLocation = activeOrders.filter(
      (o) => o.deliveryLat && o.deliveryLng,
    );

    if (activeOrdersWithLocation.length === 0) {
      liveMapInstanceRef.current = new mapboxgl.Map({
        container: liveMapRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [36.8219, -1.2921],
        zoom: 12,
        pitch: 45,
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    activeOrdersWithLocation.forEach((order) => {
      bounds.extend([order.deliveryLng, order.deliveryLat]);
    });

    liveMapInstanceRef.current = new mapboxgl.Map({
      container: liveMapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      bounds: bounds,
      fitBoundsOptions: { padding: 100 },
      pitch: 50,
    });

    liveMapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    liveMapInstanceRef.current.addControl(new mapboxgl.FullscreenControl(), "top-right");
    liveMapInstanceRef.current.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");

    liveMapInstanceRef.current.on("load", () => {
      // Initialize per-driver trail sources on map load
      Object.keys(liveDriverTrailsRef.current).forEach((driverId) => {
        const trailId = `trail-${driverId}`;
        if (!liveMapInstanceRef.current.getSource(trailId)) {
          liveMapInstanceRef.current.addSource(trailId, {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
          });
          liveMapInstanceRef.current.addLayer({
            id: `${trailId}-layer`,
            type: "line",
            source: trailId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#f97316", "line-width": 3, "line-opacity": 0.8, "line-dasharray": [2, 1.5] },
          });
        }
      });
    });

    // Numbered customer markers
    activeOrdersWithLocation.forEach((order, index) => {
      const num = index + 1;
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          position:relative; display:flex; flex-direction:column; align-items:center;
        ">
          <div style="
            width:36px;height:36px;background:#ef4444;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 16px rgba(239,68,68,0.45);border:2px solid #fff;
          ">
            <span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:14px;">${num}</span>
          </div>
          <div style="
            margin-top:4px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;
            padding:2px 6px;border-radius:8px;white-space:nowrap;max-width:80px;
            overflow:hidden;text-overflow:ellipsis;
            box-shadow:0 2px 8px rgba(0,0,0,0.2);
          ">${order.orderNumber}</div>
        </div>
      `;
      el.style.cursor = "pointer";

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([order.deliveryLng, order.deliveryLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
          <div style="
            padding:14px 16px;background:#fff;border-radius:12px;
            font-family:system-ui,sans-serif;min-width:210px;
            box-shadow:0 8px 30px rgba(0,0,0,0.12);
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="
                width:24px;height:24px;background:#ef4444;border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                color:#fff;font-weight:900;font-size:12px;
              ">${num}</div>
              <strong style="color:#111;font-size:14px;">${order.orderNumber}</strong>
            </div>
            <div style="color:#555;font-size:12px;margin-bottom:4px;">👤 ${order.customerName}</div>
            <div style="color:#888;font-size:11px;margin-bottom:4px;">📍 ${order.deliveryAddress}</div>
            <div style="
              margin-top:10px;padding:6px 10px;
              background:${getStatusColor(order.deliveryStatus)}18;
              border-left:3px solid ${getStatusColor(order.deliveryStatus)};
              border-radius:4px;color:${getStatusColor(order.deliveryStatus)};
              font-weight:700;font-size:11px;
            ">${order.deliveryStatus?.toUpperCase() || "PENDING"}</div>
          </div>
        `),
        )
        .addTo(liveMapInstanceRef.current);

      activeMarkersRef.current[order._id] = marker;
    });

    Object.entries(liveDriverLocations).forEach(([driverId, data]) => {
      updateLiveMapDriver(driverId, data.location, data.orderId);
    });
  };

  const updateLiveMapDriver = (driverId, location, orderId) => {
    if (!liveMapInstanceRef.current || !window.mapboxgl) return;

    const markerId = `driver-${driverId}`;

    // Update trail
    if (!liveDriverTrailsRef.current[driverId]) {
      liveDriverTrailsRef.current[driverId] = [];
    }
    liveDriverTrailsRef.current[driverId].push([location.lng, location.lat]);

    const trailId = `trail-${driverId}`;
    if (liveMapInstanceRef.current.getSource(trailId)) {
      liveMapInstanceRef.current.getSource(trailId).setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: liveDriverTrailsRef.current[driverId] },
      });
    } else if (liveMapInstanceRef.current.isStyleLoaded()) {
      liveMapInstanceRef.current.addSource(trailId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: liveDriverTrailsRef.current[driverId] },
        },
      });
      liveMapInstanceRef.current.addLayer({
        id: `${trailId}-layer`,
        type: "line",
        source: trailId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#f97316", "line-width": 3, "line-opacity": 0.85, "line-dasharray": [2, 1.5] },
      });
    }

    if (activeMarkersRef.current[markerId]) {
      activeMarkersRef.current[markerId].setLngLat([location.lng, location.lat]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="
            width:44px;height:44px;
            background:linear-gradient(135deg,#10b981,#059669);
            border-radius:50%;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 0 5px rgba(16,185,129,0.25), 0 4px 20px rgba(16,185,129,0.5);
            border:2px solid #fff;font-size:20px;cursor:pointer;
          ">🛵</div>
          <div style="
            margin-top:3px;background:#10b981;color:#fff;font-size:9px;font-weight:800;
            padding:2px 6px;border-radius:8px;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.2);
          ">DRIVER</div>
        </div>
      `;
      el.style.cursor = "pointer";

      const marker = new window.mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
          <div style="
            padding:14px 16px;background:#fff;border-radius:12px;
            font-family:system-ui,sans-serif;min-width:180px;
            box-shadow:0 8px 30px rgba(0,0,0,0.12);
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;background:#10b981;border-radius:50%;
                box-shadow:0 0 0 3px rgba(16,185,129,0.25);"></div>
              <strong style="color:#111;font-size:13px;">Driver – Live</strong>
            </div>
            <div style="color:#888;font-size:11px;">ID: ${driverId.slice(0, 8)}...</div>
            <div style="color:#888;font-size:11px;">Lat: ${location.lat.toFixed(5)}</div>
            <div style="color:#888;font-size:11px;">Lng: ${location.lng.toFixed(5)}</div>
          </div>
        `),
        )
        .addTo(liveMapInstanceRef.current);

      activeMarkersRef.current[markerId] = marker;
    }

    const order = activeOrders.find((o) => o._id === orderId);
    if (order && order.deliveryLat && order.deliveryLng) {
      drawLiveRoute(location, { lat: order.deliveryLat, lng: order.deliveryLng }, orderId);
    }
  };

  const drawLiveRoute = async (driverLocation, customerLocation, orderId) => {
    if (!liveMapInstanceRef.current) return;

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${customerLocation.lng},${customerLocation.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes?.[0]) {
        const route = data.routes[0].geometry;
        const routeId = `route-${orderId}`;

        if (liveMapInstanceRef.current.getSource(routeId)) {
          liveMapInstanceRef.current
            .getSource(routeId)
            .setData({ type: "Feature", geometry: route });
        } else {
          liveMapInstanceRef.current.addSource(routeId, {
            type: "geojson",
            data: { type: "Feature", geometry: route },
          });

          liveMapInstanceRef.current.addLayer({
            id: routeId,
            type: "line",
            source: routeId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#3b82f6",
              "line-width": 5,
              "line-opacity": 0.75,
            },
          });
        }

        routeLinesRef.current[orderId] = routeId;
      }
    } catch (error) {
      console.error("Live route error:", error);
    }
  };

  const fetchDeliveryOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders?orderType=delivery`);
      const data = await response.json();

      if (data.success) {
        setDeliveryOrders(data.data || []);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching delivery orders:", error);
      toast.error("Failed to fetch delivery orders");
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_URL}/drivers`);
      const data = await response.json();

      if (data.success) {
        setDrivers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const assignDriver = async (orderId, driverId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/assign-driver`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, deliveryStatus: "assigned" }),
      });

      if (response.ok) {
        toast.success("Driver assigned successfully!");
        fetchDeliveryOrders();
        fetchDrivers();
        setShowAssignModal(false);
        setSelectedOrder(null);
        setSelectedDriver("");
      } else {
        toast.error("Failed to assign driver");
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("Failed to assign driver");
    }
  };

  const broadcastOrder = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcast: true }),
      });

      if (response.ok) {
        toast.success("Order broadcasted to all available drivers!");
        fetchDeliveryOrders();
      } else {
        toast.error("Failed to broadcast order");
      }
    } catch (error) {
      console.error("Error broadcasting order:", error);
      toast.error("Failed to broadcast order");
    }
  };

  const openTrackingModal = (order) => {
    setTrackingOrder(order);
    setTimeout(() => initializeMap(order), 100);
  };

  const closeTrackingModal = () => {
    setTrackingOrder(null);
    driverTrailRef.current = [];
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if (driverMarkerRef.current) driverMarkerRef.current = null;
    if (customerMarkerRef.current) customerMarkerRef.current = null;
  };

  const openLiveMap = () => {
    setShowLiveMapModal(true);
    setTimeout(() => initializeLiveMap(), 100);
  };

  const closeLiveMap = () => {
    setShowLiveMapModal(false);
    if (liveMapInstanceRef.current) {
      liveMapInstanceRef.current.remove();
      liveMapInstanceRef.current = null;
    }
    activeMarkersRef.current = {};
    routeLinesRef.current = {};
    liveDriverTrailsRef.current = {};
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

  const formatPrice = (price) => {
    return `KSh ${price?.toLocaleString() || 0}`;
  };

  const toggleDateExpansion = (date) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const groupOrdersByDate = (orders) => {
    const groups = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(order);
    });
    return groups;
  };

  const pendingOrders = deliveryOrders.filter(
    (o) => o.deliveryStatus === "pending" || !o.deliveryStatus,
  );
  const assignedOrders = deliveryOrders.filter((o) => o.deliveryStatus === "assigned");
  const activeOrders = deliveryOrders.filter((o) =>
    ["picked-up", "on-the-way"].includes(o.deliveryStatus),
  );
  const completedOrders = deliveryOrders.filter((o) => o.deliveryStatus === "delivered");

  const availableDrivers = drivers.filter((d) => d.status === "available" || d.isAvailable);

  const groupedCompleted = groupOrdersByDate(completedOrders);

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
          <h1>
            <Truck size={36} style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }} />
            Delivery Management
          </h1>
          <p>Manage and dispatch delivery orders to drivers with live tracking</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={fetchDeliveryOrders}
            style={{
              padding: "0.75rem 1.5rem",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "10px",
              color: "#6366f1",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <RotateCcw size={18} /> Refresh
          </button>
          {activeOrders.length > 0 && (
            <button
              onClick={openLiveMap}
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--gradient-primary)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <MapIcon size={18} /> Live Map
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card orange">
          <div className="stat-icon">
            <Clock size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{pendingOrders.length}</div>
            <div className="stat-label">Pending Assignment</div>
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">
            <Package size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{assignedOrders.length}</div>
            <div className="stat-label">Assigned</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <TrendingUp size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeOrders.length}</div>
            <div className="stat-label">Active Deliveries</div>
          </div>
        </div>

        <div className="stat-card gray">
          <div className="stat-icon">
            <CheckCircle2 size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{completedOrders.length}</div>
            <div className="stat-label">Completed Today</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">
            <Users size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{availableDrivers.length}</div>
            <div className="stat-label">Available Drivers</div>
          </div>
        </div>

        <div className="stat-card indigo">
          <div className="stat-icon">
            <DollarSign size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatPrice(deliveryOrders.reduce((sum, o) => sum + o.total, 0))}
            </div>
            <div className="stat-label">Total Value</div>
          </div>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div className="glass-card orders-section">
          <div className="section-header">
            <h2>
              <AlertCircle size={24} style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Pending Orders ({pendingOrders.length})
            </h2>
          </div>

          <div className="orders-grid">
            {pendingOrders.map((order) => {
              const urgency = getUrgency(order.createdAt);

              return (
                <div key={order._id} className="order-card">
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      padding: "0.5rem 1rem",
                      background: urgency.color + "22",
                      border: `2px solid ${urgency.color}`,
                      borderRadius: "20px",
                      color: urgency.color,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      zIndex: 10,
                    }}
                  >
                    {urgency.label}
                  </div>

                  <div className="order-card-header">
                    <div>
                      <h3>{order.orderNumber}</h3>
                      <span
                        className="status-badge"
                        style={{ background: getStatusColor(order.deliveryStatus) }}
                      >
                        {order.deliveryStatus?.toUpperCase() || "PENDING"}
                      </span>
                    </div>
                    <div className="order-total">{formatPrice(order.total)}</div>
                  </div>

                  <div className="order-card-body">
                    <div className="delivery-info-grid">
                      <div>
                        <strong>
                          <Users size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Customer:
                        </strong>
                        <p>{order.customerName}</p>
                      </div>
                      <div>
                        <strong>
                          <Phone size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Phone:
                        </strong>
                        <p>{order.deliveryPhone}</p>
                      </div>
                      <div>
                        <strong>
                          <Clock size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Time:
                        </strong>
                        <p>{calculateTimeSince(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="delivery-address">
                      <strong>
                        <MapPin size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                        Delivery Address:
                      </strong>
                      <p>{order.deliveryAddress}</p>
                    </div>

                    {order.deliveryNote && (
                      <div className="delivery-note">
                        <strong>Note:</strong>
                        <p>{order.deliveryNote}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-card-actions">
                    <button
                      className="btn-assign"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowAssignModal(true);
                      }}
                    >
                      <Users size={18} style={{ marginRight: "0.5rem" }} />
                      Assign Driver
                    </button>
                    <button
                      className="btn-broadcast"
                      onClick={() => broadcastOrder(order._id)}
                    >
                      <Radio size={18} style={{ marginRight: "0.5rem" }} />
                      Broadcast to All
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {[...assignedOrders, ...activeOrders].length > 0 && (
        <div className="glass-card orders-section">
          <div className="section-header">
            <h2>
              <Truck size={24} style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Active Deliveries ({[...assignedOrders, ...activeOrders].length})
            </h2>
          </div>

          <div className="orders-grid">
            {[...assignedOrders, ...activeOrders].map((order) => {
              const driverLiveLocation = order.driver && liveDriverLocations[order.driver];
              const isLiveTracking =
                driverLiveLocation && ["picked-up", "on-the-way"].includes(order.deliveryStatus);

              return (
                <div key={order._id} className="order-card" style={{ position: "relative" }}>
                  {isLiveTracking && (
                    <div
                      style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        background: "rgba(16, 185, 129, 0.1)",
                        borderRadius: "50px",
                        border: "2px solid #10b981",
                        zIndex: 10,
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
                      <span style={{ color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
                        <MapPin size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                        Live
                      </span>
                    </div>
                  )}

                  <div className="order-card-header">
                    <div>
                      <h3>{order.orderNumber}</h3>
                      <span
                        className="status-badge"
                        style={{ background: getStatusColor(order.deliveryStatus) }}
                      >
                        {order.deliveryStatus?.toUpperCase() || "ASSIGNED"}
                      </span>
                    </div>
                    <div className="order-total">{formatPrice(order.total)}</div>
                  </div>

                  <div className="order-card-body">
                    <div className="delivery-info-grid">
                      <div>
                        <strong>
                          <Users size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Customer:
                        </strong>
                        <p>{order.customerName}</p>
                      </div>
                      <div>
                        <strong>
                          <Truck size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Driver:
                        </strong>
                        <p>{order.driverName || "Assigning..."}</p>
                      </div>
                      <div>
                        <strong>
                          <Phone size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Phone:
                        </strong>
                        <p>{order.deliveryPhone}</p>
                      </div>
                      <div>
                        <strong>
                          <Clock size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                          Time:
                        </strong>
                        <p>{calculateTimeSince(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="delivery-address compact">
                      <strong>
                        <MapPin size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                      </strong>
                      <p>{order.deliveryAddress}</p>
                    </div>

                    {isLiveTracking && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "0.75rem",
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "#059669",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            <MapPin size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                            Driver Location:
                          </span>
                          <span>
                            {new Date(driverLiveLocation.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#10b981",
                            marginTop: "0.25rem",
                          }}
                        >
                          Lat: {driverLiveLocation.location.lat.toFixed(6)}, Lng:{" "}
                          {driverLiveLocation.location.lng.toFixed(6)}
                        </div>
                      </div>
                    )}
                  </div>

                  {(order.deliveryLat || order.deliveryLng) && (
                    <div className="order-card-actions">
                      <button className="btn-track" onClick={() => openTrackingModal(order)}>
                        <Navigation size={18} style={{ marginRight: "0.5rem" }} />
                        Track Delivery
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(groupedCompleted).length > 0 && (
        <div className="glass-card orders-section completed-section">
          <div className="section-header">
            <h2>
              <CheckCircle2 size={24} style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Completed Deliveries ({completedOrders.length})
            </h2>
          </div>

          {Object.entries(groupedCompleted)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, orders]) => (
              <div key={date} className="date-group">
                <div className="date-header" onClick={() => toggleDateExpansion(date)}>
                  <h3>{date}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span className="order-count">{orders.length} orders</span>
                    {expandedDates[date] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {expandedDates[date] && (
                  <div className="completed-list">
                    {orders.map((order) => (
                      <div key={order._id} className="completed-item">
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <span> • {order.customerName}</span>
                        </div>
                        <div className="completed-meta">
                          <span className="completed-driver">
                            <Truck size={14} style={{ marginRight: "0.25rem" }} />
                            {order.driverName}
                          </span>
                          <span className="completed-price">{formatPrice(order.total)}</span>
                          <span className="completed-time">
                            {calculateTimeSince(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {showAssignModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Users size={24} style={{ display: "inline", marginRight: "0.5rem" }} />
                Assign Driver to {selectedOrder.orderNumber}
              </h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
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
                      {driver.firstName} {driver.lastName} - {driver.vehicleType} (
                      {driver.vehicleRegistration})
                    </option>
                  ))}
                </select>
              </div>

              {availableDrivers.length === 0 && (
                <p className="warning-text">
                  <AlertCircle size={16} style={{ marginRight: "0.5rem" }} />
                  No drivers currently available. Consider broadcasting this order.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() =>
                  selectedDriver && assignDriver(selectedOrder._id, selectedDriver)
                }
                disabled={!selectedDriver}
              >
                <CheckCircle2 size={18} style={{ marginRight: "0.5rem" }} />
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingOrder && (
        <div className="modal-overlay" onClick={closeTrackingModal}>
          <div
            className="modal-content tracking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  <Navigation size={24} style={{ display: "inline", marginRight: "0.5rem" }} />
                  Live Tracking - {trackingOrder.orderNumber}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  {trackingOrder.customerName} • {trackingOrder.deliveryAddress}
                </p>
              </div>
              <button className="close-btn" onClick={closeTrackingModal}>
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "1.5rem",
                padding: "1.5rem",
              }}
            >
              <div
                ref={mapRef}
                style={{ width: "100%", height: "500px", borderRadius: "12px" }}
              />
              <div>
                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Status
                    </div>
                    <div
                      style={{
                        padding: "0.5rem 1rem",
                        background: getStatusColor(trackingOrder.deliveryStatus) + "22",
                        border: `2px solid ${getStatusColor(trackingOrder.deliveryStatus)}`,
                        borderRadius: "8px",
                        color: getStatusColor(trackingOrder.deliveryStatus),
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    >
                      {trackingOrder.deliveryStatus?.toUpperCase() || "ASSIGNED"}
                    </div>
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Driver
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {trackingOrder.driverName || "Assigning..."}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Order Total
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#10b981",
                      }}
                    >
                      {formatPrice(trackingOrder.total)}
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
                <h2>
                  <MapIcon size={24} style={{ display: "inline", marginRight: "0.5rem" }} />
                  Live Delivery Map
                </h2>
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
        @keyframes driverPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(16,185,129,0.3), 0 4px 20px rgba(16,185,129,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,0.15), 0 4px 30px rgba(16,185,129,0.7); }
        }
        .tracking-modal { max-width: 900px !important; }
        .live-map-modal { max-width: 95vw !important; width: 95vw !important; }
        .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }

        /* Mapbox popup overrides – clean white cards */
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
          overflow: hidden;
        }
        .mapboxgl-popup-tip { display: none !important; }
        .mapboxgl-ctrl-logo { display: none !important; }
      `}</style>
    </div>
  );
};

export default DeliveryManagement;