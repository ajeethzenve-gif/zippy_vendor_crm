import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/StoreFront.css";
import SearchBar from "../components/SearchBar";
import { getProducts, getDesigners, createOrder } from "../services/api";
import { showToast } from "../utils/zenveToast";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =========================================================
   DELIVERY PROMISE CALCULATION (ZENVE Engine)
========================================================= */

function computeDeliveryPromise(pincode, product, availableStock) {
  const p = (pincode || "").trim();
  if (!/^\d{6}$/.test(p)) {
    return { serviceable: false, fast: false, eta: "Enter a valid 6-digit pincode" };
  }
  if (!product || availableStock < 1) {
    return { serviceable: true, fast: false, eta: "Out of stock — not sellable" };
  }

  const loc = product.location || product.fulfilment_location || "";
  const isMumbai = loc.toLowerCase().includes("mumbai");
  const isBangalore = loc.toLowerCase().includes("bangalore");

  const isLocalHub =
    (p.startsWith("400") && isMumbai) ||
    (p.startsWith("560") && isBangalore);

  const isFastEligible = Boolean(
    product.fastDelivery ?? product.fast_delivery ?? product.is_fast_delivery
  );

  if (isFastEligible && isLocalHub) {
    return { serviceable: true, fast: true, eta: "60 minutes" };
  }
  return { serviceable: true, fast: false, eta: "≤ 3 working days" };
}

function normalizeHub(raw) {
  if (!raw) return "Mumbai FC";
  const str = String(raw).trim();
  const lower = str.toLowerCase();
  if (lower.includes("bengaluru") || lower.includes("bangalore")) return "Bengaluru FC";
  if (lower.includes("kochi") || lower.includes("cochin")) return "Kochi FC";
  if (lower.includes("chennai") || lower.includes("madras")) return "Chennai FC";
  if (lower.includes("mumbai")) return "Mumbai FC";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/* =========================================================
   STOREFRONT COMPONENT (06)
========================================================= */

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delivery pincode (defaults to 400001 per blueprint)
  const [pincode, setPincode] = useState("400001");

  // Catalogue search query
  const [searchQuery, setSearchQuery] = useState("");

  // Customer name for checkout
  const [customerName, setCustomerName] = useState("");

  // Bag / cart state: array of { skuId, qty, product }
  const [cart, setCart] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Alert notification banner
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH LIVE DATA (PRODUCTS & DESIGNERS)
  ------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodsData, desData] = await Promise.all([
        getProducts().catch(() => []),
        getDesigners().catch(() => []),
      ]);

      setProducts(prodsData || []);
      setDesigners(desData || []);
    } catch (err) {
      console.error("Failed to load storefront data:", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------
     NORMALIZED PRODUCT RECORDS
  ------------------------------------------------------- */
  const normalizedProducts = useMemo(() => {
    return products.map((p) => {
      const physical = Number(p.physical_quantity ?? p.inventory_quantity ?? 0);
      const reserved = Number(p.reserved_quantity ?? 0);
      const damaged = Number(p.damaged_quantity ?? 0);
      const quarantined = Number(p.quarantined_quantity ?? 0);
      const available = Number(
        p.available_quantity ?? Math.max(0, physical - (reserved + damaged + quarantined))
      );
      const location = normalizeHub(p.fulfilment_location || p.location);
      const brand =
        p.designer_brand ||
        (p.designer && typeof p.designer === "object" ? p.designer.brand_name : null) ||
        (designers.find((d) => d.id === p.designer)?.brand_name) ||
        "Independent Studio";

      const isLive = Boolean(
        p.live ?? p.is_live ?? (p.status === "APPROVED" || p.status === "LIVE")
      );
      const returnable = Boolean(
        p.returnable ?? (p.return_policy !== "FINAL_SALE")
      );
      const fastDelivery = Boolean(
        p.fastDelivery ?? p.fast_delivery ?? p.is_fast_delivery
      );

      return {
        ...p,
        id: p.id,
        name: p.product_name || p.name || "Untitled SKU",
        sku: p.sku || `SKU-${p.id}`,
        brand,
        colour: p.colour || "Standard",
        size: p.size || "Free",
        price: Number(p.selling_price || p.price || 0),
        mrp: Number(p.mrp || 0),
        available,
        location,
        isLive,
        returnable,
        fastDelivery,
      };
    });
  }, [products, designers]);

  /* -------------------------------------------------------
     FILTERED LIVE SKUS FOR SHOP
  ------------------------------------------------------- */
  const liveSkus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return normalizedProducts.filter((p) => {
      // Must be live / QA-approved
      if (!p.isLive) return false;

      // Filter by search query across name, category, colour, size, brand
      if (q) {
        const textToSearch = [
          p.name,
          p.category,
          p.colour,
          p.size,
          p.brand,
          p.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return textToSearch.includes(q);
      }
      return true;
    });
  }, [normalizedProducts, searchQuery]);

  /* -------------------------------------------------------
     TOP 3 KPI TOTALS
  ------------------------------------------------------- */
  const cartTotalAmount = useMemo(() => {
    return cart.reduce((total, item) => {
      const prod = normalizedProducts.find((p) => p.id === item.skuId) || item.product;
      return total + (prod?.price || 0) * item.qty;
    }, 0);
  }, [cart, normalizedProducts]);

  const totalBagItemsCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.qty, 0);
  }, [cart]);

  const isFastPincode = useMemo(() => {
    return /^(400|560)/.test(pincode.trim());
  }, [pincode]);

  /* -------------------------------------------------------
     BAG / CART ACTIONS
  ------------------------------------------------------- */
  const addToBag = (productId) => {
    const prod = normalizedProducts.find((p) => p.id === productId);
    if (!prod || !prod.isLive) {
      setAlert({ type: "error", text: "SKU is not live" });
      return;
    }

    const existing = cart.find((item) => item.skuId === productId);
    const currentQty = existing ? existing.qty : 0;

    if (prod.available < currentQty + 1) {
      setAlert({ type: "error", text: "Not enough available inventory" });
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.skuId === productId ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart((prev) => [...prev, { skuId: productId, qty: 1, product: prod }]);
    }

    setAlert({ type: "success", text: `${prod.name} added to bag` });
  };

  const removeFromBag = (productId) => {
    setCart((prev) => prev.filter((item) => item.skuId !== productId));
  };

  const clearBag = () => {
    setCart([]);
    setAlert({ type: "success", text: "Bag cleared" });
  };

  /* -------------------------------------------------------
     CHECKOUT & ORDER CREATION
  ------------------------------------------------------- */
  const handleCheckout = async () => {
    if (!cart.length) {
      setAlert({ type: "error", text: "Bag is empty" });
      return;
    }

    const cleanPincode = pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      setAlert({ type: "error", text: "Enter a valid 6-digit pincode" });
      return;
    }

    const cleanCustomer = customerName.trim();
    if (!cleanCustomer) {
      setAlert({ type: "error", text: "Customer name is required" });
      return;
    }

    // Verify stock availability
    for (const item of cart) {
      const prod = normalizedProducts.find((p) => p.id === item.skuId);
      if (!prod || prod.available < item.qty) {
        setAlert({
          type: "error",
          text: `Insufficient stock for ${prod?.name || item.skuId}`,
        });
        return;
      }
    }

    try {
      setIsCheckingOut(true);

      const isOrderFast = cart.every((item) => {
        const prod = normalizedProducts.find((p) => p.id === item.skuId) || item.product;
        return computeDeliveryPromise(cleanPincode, prod, prod.available).fast;
      });

      const orderPayload = {
        shipping_full_name: cleanCustomer,
        customer_name: cleanCustomer,
        shipping_postal_code: cleanPincode,
        delivery_pincode: cleanPincode,
        shipping_address_line1: `Standard Delivery Address (${cleanPincode})`,
        shipping_city: "Mumbai",
        shipping_state: "Maharashtra",
        shipping_country: "India",
        payment_method: "Cash on Delivery",
        payment_status: "Pending",
        order_status: "Pending",
        estimated_delivery: isOrderFast ? "Express 60 Minutes" : "3-5 Business Days",
        is_fast_delivery: isOrderFast,
        items: cart.map((item) => {
          const prod = normalizedProducts.find((p) => p.id === item.skuId) || item.product;
          return {
            product_id: String(prod.id),
            product_name: prod.name,
            product_image: prod.image || "",
            sku: prod.sku,
            brand_name: prod.brand,
            color: prod.colour || "Standard",
            colour: prod.colour || "Standard",
            size: prod.size || "M",
            quantity: item.qty,
            price: prod.price,
            unit_price: prod.price,
          };
        }),
      };

      const createdOrder = await createOrder(orderPayload);
      const orderRef = createdOrder.order_number || `ZO-${createdOrder.id || Date.now()}`;

      // Reset cart and customer name
      setCart([]);
      setCustomerName("");

      setAlert({
        type: "success",
        text: `Order ${orderRef} placed — inventory reserved and routed to OMS`,
      });

      // Reload products to reflect freshly reserved inventory
      await loadData();
    } catch (err) {
      console.error("Checkout failed:", err);
      setAlert({ type: "error", text: `Checkout failed: ${err.message}` });
    } finally {
      setIsCheckingOut(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="ZENVE-storefront-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-sf-header">
        <div className="ZENVE-header-left">
          <div className="ZENVE-header-title-block">
            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">06</span>
              <span>Storefront</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Commerce layer · Search, filters, product page, cart, checkout
            </p>
          </div>
        </div>

        {/* HEADER ASIDE / RIGHT CONTROLS */}
        <div className="ZENVE-header-right">
          <div className="ZENVE-pincode-aside">
            <label className="ZENVE-pincode-label" htmlFor="sf-pincode">
              Delivery pincode
            </label>
            <input
              id="sf-pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="ZENVE-pincode-input"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit pincode"
            />
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN BODY
      ===================================================== */}
      <main className="ZENVE-sf-main">
        {/* ALERT NOTIFICATION */}
        {alert && alert.type !== "success" && (
          <div className={`ZENVE-sf-alert ${alert.type}`}>
            <span>{alert.text}</span>
            <button
              type="button"
              className="ZENVE-alert-close"
              onClick={() => setAlert(null)}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 3 SUMMARY KPI CARDS
        =================================================== */}
        <section className="ZENVE-sf-kpi-grid">
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Live SKUs</span>
            <strong className="ZENVE-kpi-value">{liveSkus.length}</strong>
            <span className="ZENVE-kpi-hint">Only QA-approved, in-stock listings sell</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">In bag</span>
            <strong className="ZENVE-kpi-value">{totalBagItemsCount}</strong>
            <span className="ZENVE-kpi-hint">{formatInr(cartTotalAmount)}</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Fast pincode</span>
            <strong className="ZENVE-kpi-value">{isFastPincode ? "Yes" : "No"}</strong>
            <span className="ZENVE-kpi-hint">Mumbai 400xxx · Bangalore 560xxx</span>
          </div>
        </section>

        {/* ===================================================
            SHOP SECTION
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-block">
              <h2 className="ZENVE-panel-title">Shop</h2>
              <p className="ZENVE-panel-desc">
                Delivery promise is computed live from pincode, stocking location, fast flag and availability.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search the catalogue…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ZENVE-cat-search-box"
            />
          </div>

          {loading ? (
            <div className="ZENVE-empty-state">
              <strong>Loading catalogue...</strong>
              <p>Connecting to live Zippy Vendor CRM database...</p>
            </div>
          ) : error ? (
            <div className="ZENVE-empty-state">
              <strong style={{ color: "#9f1239" }}>{error}</strong>
              <p>
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-outline"
                  style={{ marginTop: "12px" }}
                  onClick={loadData}
                >
                  Retry Connection
                </button>
              </p>
            </div>
          ) : liveSkus.length === 0 ? (
            <div className="ZENVE-empty-state">
              Nothing live yet — approve a SKU in Catalogue QA and receive stock.
            </div>
          ) : (
            <div className="ZENVE-product-grid">
              {liveSkus.map((sku) => {
                const deliveryPromise = computeDeliveryPromise(pincode, sku, sku.available);

                return (
                  <div key={sku.id} className="ZENVE-product-card">
                    {/* TITLE ROW */}
                    <div className="ZENVE-prod-top-row">
                      <h3 className="ZENVE-prod-title">{sku.name}</h3>
                      {deliveryPromise.fast && (
                        <span className="ZENVE-tone-badge good">60 min</span>
                      )}
                    </div>

                    {/* BRAND & VARIANT */}
                    <p className="ZENVE-prod-meta">
                      {sku.brand} · {sku.colour} / {sku.size}
                    </p>

                    {/* PRICE */}
                    <p className="ZENVE-prod-price-row">
                      <span>{formatInr(sku.price)}</span>
                      {sku.mrp > sku.price && (
                        <span className="ZENVE-prod-mrp">{formatInr(sku.mrp)}</span>
                      )}
                    </p>

                    {/* DELIVERY PROMISE */}
                    <p className="ZENVE-prod-delivery">
                      <span className="ZENVE-delivery-label">Delivery: </span>
                      <strong>{deliveryPromise.eta}</strong>
                    </p>

                    {/* STOCK & HUB */}
                    <p className="ZENVE-prod-stock">
                      {sku.available > 0
                        ? `${sku.available} in stock · ${sku.location}`
                        : "Out of stock"}
                    </p>

                    {/* RETURN POLICY */}
                    <p className="ZENVE-prod-policy">
                      {sku.returnable
                        ? "7-day return eligible"
                        : "Final sale — no returns"}
                    </p>

                    {/* ADD TO BAG */}
                    <button
                      type="button"
                      className="ZENVE-add-bag-btn"
                      disabled={sku.available < 1 || isCheckingOut}
                      onClick={() => addToBag(sku.id)}
                    >
                      {sku.available < 1 ? "Sold out" : "Add to bag"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            BAG & CHECKOUT SECTION
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-block">
              <h2 className="ZENVE-panel-title">Bag & checkout</h2>
              <p className="ZENVE-panel-desc">
                Checkout reserves inventory instantly and creates a live order in the OMS.
              </p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="ZENVE-empty-state">
              Your bag is empty.
            </div>
          ) : (
            <div className="ZENVE-bag-stack">
              {cart.map((item) => {
                const prod =
                  normalizedProducts.find((p) => p.id === item.skuId) || item.product;

                return (
                  <div key={item.skuId} className="ZENVE-bag-item-row">
                    <span className="ZENVE-bag-item-name">{prod.name}</span>
                    <span className="ZENVE-bag-item-qty">Qty {item.qty}</span>
                    <span className="ZENVE-bag-item-price">
                      {formatInr((prod.price || 0) * item.qty)}
                    </span>
                    <button
                      type="button"
                      className="ZENVE-btn-ghost"
                      onClick={() => removeFromBag(item.skuId)}
                      disabled={isCheckingOut}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}

              {/* ORDER TOTAL */}
              <div className="ZENVE-bag-total-row">
                <span>Order total</span>
                <span>{formatInr(cartTotalAmount)}</span>
              </div>

              {/* CHECKOUT CONTROLS */}
              <div className="ZENVE-checkout-controls-row">
                <div className="ZENVE-checkout-input-group">
                  <label htmlFor="customer-name">Customer name</label>
                  <input
                    id="customer-name"
                    type="text"
                    className="ZENVE-customer-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    disabled={isCheckingOut}
                  />
                </div>

                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-primary"
                  onClick={handleCheckout}
                  disabled={isCheckingOut || !cart.length}
                >
                  {isCheckingOut ? "Placing order..." : "Place order"}
                </button>

                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-outline"
                  onClick={clearBag}
                  disabled={isCheckingOut || !cart.length}
                >
                  Clear bag
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}