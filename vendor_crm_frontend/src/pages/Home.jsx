import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";
import SearchBar from "../components/SearchBar";

import {
  getDesigners,
  getOrders,
  getProducts,
} from "../services/api";

/* =========================================================
   HOME PAGE
   ========================================================= */

function Home() {
  const { currentUser, hasAccess } = useAuth();

  /* =========================================================
     DASHBOARD DATA
     ========================================================= */

  const [dashboardData, setDashboardData] = useState({
    designers: 0,
    liveSkus: 0,
    physicalStock: 0,
    orders: 0,
    totalGmv: 0,
    brands: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     API RESPONSE HELPER

     Supports:

     1. Normal array

        [
          {...},
          {...}
        ]

     2. Django REST Framework pagination

        {
          count: 10,
          results: [...]
        }

     3. Axios response

        {
          data: [...]
        }
     ========================================================= */

  const getCollection = (response) => {
    if (!response) {
      return [];
    }

    const data = response?.data ?? response;

    // DRF paginated response
    if (Array.isArray(data?.results)) {
      return data.results;
    }

    // Normal array response
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  };

  /* =========================================================
     NUMBER HELPER
     ========================================================= */

  const getNumber = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }

    // Remove commas and currency symbols if returned as string
    if (typeof value === "string") {
      const cleanedValue = value
        .replace(/₹/g, "")
        .replace(/,/g, "")
        .trim();

      const number = Number(cleanedValue);

      return Number.isFinite(number) ? number : 0;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  };

  /* =========================================================
     GET PRODUCT STOCK
     ========================================================= */

  const getProductStock = (product) => {
    return getNumber(
      product?.stock ??
      product?.quantity ??
      product?.stock_quantity ??
      product?.physical_stock ??
      product?.inventory ??
      product?.available_quantity ??
      0
    );
  };

  /* =========================================================
     GET PRODUCT ACTIVE STATUS
     ========================================================= */

  const isLiveProduct = (product) => {
    /* -------------------------------------------------------
       is_active
       ------------------------------------------------------- */

    if (typeof product?.is_active === "boolean") {
      return product.is_active;
    }

    /* -------------------------------------------------------
       active
       ------------------------------------------------------- */

    if (typeof product?.active === "boolean") {
      return product.active;
    }

    /* -------------------------------------------------------
       status
       ------------------------------------------------------- */

    if (product?.status) {
      const status = String(product.status).toLowerCase();

      if (
        status === "inactive" ||
        status === "disabled" ||
        status === "draft" ||
        status === "archived"
      ) {
        return false;
      }
    }

    return true;
  };

  /* =========================================================
     GET BRAND
     ========================================================= */

  const getBrand = (product) => {
    const brand =
      product?.brand ??
      product?.brand_name ??
      product?.brandName ??
      product?.designer?.brand ??
      product?.designer?.brand_name;

    if (!brand) {
      return null;
    }

    /* -------------------------------------------------------
       Brand returned as object
       ------------------------------------------------------- */

    if (typeof brand === "object") {
      return (
        brand?.name ??
        brand?.brand_name ??
        brand?.title ??
        brand?.id ??
        null
      );
    }

    return String(brand).trim();
  };

  /* =========================================================
     GET ORDER GMV

     Supports common backend field names.
     ========================================================= */

  const getOrderGmv = (order) => {
    return getNumber(
      order?.total_amount ??
      order?.grand_total ??
      order?.order_total ??
      order?.total ??
      order?.amount ??
      order?.gmv ??
      order?.total_price ??
      order?.final_amount ??
      order?.order_value ??
      0
    );
  };

  /* =========================================================
     LOAD DASHBOARD DATA
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        /* ---------------------------------------------------
           GET DATA FROM DJANGO BACKEND
           --------------------------------------------------- */

        const [
          designersResponse,
          productsResponse,
          ordersResponse,
        ] = await Promise.all([
          getDesigners(),
          getProducts(),
          getOrders(),
        ]);

        if (!mounted) {
          return;
        }

        /* ---------------------------------------------------
           DESIGNERS
           --------------------------------------------------- */

        const designers =
          getCollection(designersResponse);

        /* ---------------------------------------------------
           PRODUCTS
           --------------------------------------------------- */

        const products =
          getCollection(productsResponse);

        /* ---------------------------------------------------
           ORDERS
           --------------------------------------------------- */

        const orders =
          getCollection(ordersResponse);

        /* ===================================================
           LIVE SKUS
           =================================================== */

        const liveProducts = products.filter(
          (product) => isLiveProduct(product)
        );

        const liveSkus =
          liveProducts.length;

        /* ===================================================
           PHYSICAL STOCK
           =================================================== */

        const physicalStock =
          products.reduce(
            (total, product) => {
              return (
                total +
                getProductStock(product)
              );
            },
            0
          );

        /* ===================================================
           BRANDS
           =================================================== */

        const brandSet = new Set();

        products.forEach((product) => {
          const brand = getBrand(product);

          if (
            brand !== null &&
            brand !== ""
          ) {
            brandSet.add(
              String(brand).toLowerCase()
            );
          }
        });

        const brands =
          brandSet.size;

        /* ===================================================
           TOTAL GMV

           Add the GMV / order amount of every order.
           =================================================== */

        const totalGmv =
          orders.reduce(
            (total, order) => {
              return (
                total +
                getOrderGmv(order)
              );
            },
            0
          );

        /* ===================================================
           UPDATE DASHBOARD
           =================================================== */

        setDashboardData({
          designers: designers.length,
          liveSkus: liveSkus,
          physicalStock: physicalStock,
          orders: orders.length,
          totalGmv: totalGmv,
          brands: brands,
        });

      } catch (err) {
        console.error(
          "Failed to load dashboard data:",
          err
        );

        if (mounted) {
          setError(
            "Unable to load dashboard data from the backend."
          );

          setDashboardData({
            designers: 0,
            liveSkus: 0,
            physicalStock: 0,
            orders: 0,
            totalGmv: 0,
            brands: 0,
          });
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     UNIQUE LAYERS
     ========================================================= */

  const uniqueLayers = useMemo(() => {
    return Array.from(
      new Map(
        layers.map((layer) => [
          layer.n,
          layer,
        ])
      ).values()
    ).sort(
      (a, b) =>
        Number(a.n) - Number(b.n)
    );
  }, []);

  /* =========================================================
     ACCESSIBLE LAYERS
     ========================================================= */

  const accessibleLayers =
    uniqueLayers.filter((layer) =>
      hasAccess(layer.n)
    );

  /* =========================================================
     DISPLAY VALUES
     ========================================================= */

  const designerCount = loading
    ? "..."
    : dashboardData.designers;

  const liveSkuCount = loading
    ? "..."
    : dashboardData.liveSkus;

  const physicalStockCount = loading
    ? "..."
    : dashboardData.physicalStock;

  const orderCount = loading
    ? "..."
    : dashboardData.orders;

  const brandCount = loading
    ? "..."
    : dashboardData.brands;

  const totalGmv = loading
    ? "..."
    : dashboardData.totalGmv;

  /* =========================================================
     FORMAT GMV
     ========================================================= */

  const formattedGmv =
    loading
      ? "..."
      : `₹${Number(
        totalGmv
      ).toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }
      )}`;

  /* =========================================================
     RETURN
     ========================================================= */

  return (
    <main className="home-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="header-content">

        {/* ===================================================
            ERROR MESSAGE
            =================================================== */}

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {/* ===================================================
            KPI SECTION
            =================================================== */}

        <section className="overview-welcome" aria-label="Workspace overview">
          <div><span className="overview-eyebrow">Your business at a glance</span><h2>Workspace overview</h2><p>Keep your vendors, products and operations moving forward.</p></div>
          <time className="overview-date" dateTime={new Date().toISOString().slice(0,10)}>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</time>
        </section>
        <section className="kpi-section">

  {/* VENDORS */}
  <div className="kpi-card">
    <div className="kpi-label">
      VENDORS
    </div>

    <div className="kpi-value">
      {designerCount}
    </div>

    <div className="kpi-subtitle">
      Lead to active
    </div>
  </div>

  {/* LIVE SKUS */}
  <div className="kpi-card">
    <div className="kpi-label">
      LIVE SKUS
    </div>

    <div className="kpi-value">
      {liveSkuCount}
    </div>

    <div className="kpi-subtitle">
      Across {brandCount}{" "}
      {Number(brandCount) === 1 ? "brand" : "brands"}
    </div>
  </div>

  {/* BRANDS */}
  <div className="kpi-card">
    <div className="kpi-label">
      BRANDS
    </div>

    <div className="kpi-value">
      {brandCount}
    </div>

    <div className="kpi-subtitle">
      Active product brands
    </div>
  </div>

  {/* PHYSICAL STOCK */}
  <div className="kpi-card">
    <div className="kpi-label">
      SELLABLE UNITS
    </div>

    <div className="kpi-value">
      {physicalStockCount}
    </div>

    <div className="kpi-subtitle">
      Available inventory
    </div>
  </div>

  {/* GMV BOOKED */}
  <div className="kpi-card">
    <div className="kpi-label">
      GMV BOOKED
    </div>

    <div className="kpi-value">
      {formattedGmv}
    </div>

    <div className="kpi-subtitle">
      {orderCount} Total placed
    </div>
  </div>

</section>

      </div>

      {/* =====================================================
          LAYERS SECTION
          ===================================================== */}

      <section className="layers-section">

        {/* ===================================================
            SECTION HEADER
            =================================================== */}

        <div className="layers-header">

          <div className="layers-title-wrapper">

            <h2>
              Your layers
            </h2>

            <span className="layers-count">
              {accessibleLayers.length}{" "}
              layers ·{" "}
              {currentUser?.shortRole ||
                "Guest"}{" "}
              access
            </span>

          </div>

          <div className="exception-badge">
            Operations hub
          </div>

        </div>

        {/* ===================================================
            LAYER GRID
            =================================================== */}

        {!currentUser && <div className="workspace-empty"><Link to="/login">Sign in to your workspace →</Link><br />Your assigned role determines the layers available here.</div>}
        <div className="layers-grid">

          {accessibleLayers.map(
            (layer) => (

              <Link
                key={layer.n}
                to={layer.path}
                className="layer-card"
              >

                {/* TOP ROW */}

                <div className="layer-top">

                  <span className="layer-group">
                    {layer.group}
                  </span>

                  <span className="layer-number">
                    {layer.n}
                  </span>

                </div>

                {/* TITLE */}

                <h3 className="layer-name">
                  {layer.name}
                </h3>

                {/* DESCRIPTION */}

                <p className="layer-blurb">
                  {layer.blurb}
                </p>
                <span className="layer-open">Open workspace <span aria-hidden="true">↗</span></span>

              </Link>

            )
          )}

        </div>

      </section>

    </main>
  );
}

export default Home;
