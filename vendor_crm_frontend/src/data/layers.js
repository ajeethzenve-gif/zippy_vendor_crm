export const layers = [
  {
    n: "01",
    group: "Supply",
    name: "Vendor CRM",
    blurb: "Lead, qualification, approval, KYC, contract, status",
    path: "/vendor-crm",
  },

  {
    n: "02",
    group: "Supply",
    name: "Vendor Portal",
    blurb: "Profile, SKU upload, inventory, orders, settlement view",
    path: "/vendor-portal",
  },

  {
    n: "03",
    group: "Catalogue",
    name: "Product / SKU",
    blurb: "Variants, attributes, media, pricing, policy",
    path: "/catalogue",
  },

  {
    n: "04",
    group: "QA",
    name: "Catalogue QA",
    blurb: "Validation, approval, audit trail",
    path: "/catalogueqa",
  },

  {
    n: "05",
    group: "Inventory",
    name: "Inventory Engine",
    blurb:
      "Physical, reserved, available, damaged, returned, in-transit",
    path: "/inventory",
  },

  {
    n: "06",
    group: "Commerce",
    name: "Storefront",
    blurb: "Search, filters, product page, cart, checkout",
    path: "/storefront",
  },

  {
    n: "07",
    group: "Orders",
    name: "OMS",
    blurb: "Order lifecycle, split orders, cancellation",
    path: "/orders",
  },

  {
    n: "08",
    group: "Logistics",
    name: "Delivery Engine",
    blurb: "Pincode, ETA, 60-min eligibility, 3-day target",
    path: "/delivery",
  },

  {
    n: "09",
    group: "Returns",
    name: "Returns Engine",
    blurb: "Request, pickup, inspection, refund / exchange",
    path: "/returns",
  },

  {
    n: "10",
    group: "Finance",
    name: "Settlement",
    blurb: "Take rate, payout, refunds, reconciliation",
    path: "/settlement",
  },

  {
    n: "11",
    group: "Analytics",
    name: "BI Dashboards",
    blurb: "Vendor, SKU, inventory, customer, marketing KPIs",
    path: "/analytics",
  },

  {
    n: "12",
    group: "Admin",
    name: "Command Centre",
    blurb: "Approvals, controls, exceptions",
    path: "/command-centre",


  },
  { n: "13", group: "Media", name: "Media Studio", blurb: "Vendor originals, Figma creatives, image delivery and review", path: "/media" },
];

/**
 * Find a layer using its route path.
 *
 * Example:
 * getLayerByPath("/vendor-crm")
 */
export const getLayerByPath = (path) => {
  return layers.find((layer) => layer.path === path);
};
