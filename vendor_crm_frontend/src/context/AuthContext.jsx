import React, { createContext, useContext, useState, useEffect } from "react";

import { API_BASE_URL } from "../services/api";

export const ROLES = [
  {
    id: "admin",
    name: "Executive Admin",
    shortRole: "Admin",
    user: "Priya Raghavan",
    email: "priya.raghavan@zenve.in",
    department: "Executive & Governance",
    landingPath: "/command-centre",
    description: "Full clearance across all 13 operational layers, approvals, and system controls.",
    badgeClass: "admin",
    clearance: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"],
  },
  {
    id: "designer",
    name: "Brand Vendor",
    shortRole: "Vendor",
    user: "Aarav Mehta",
    brand: "Aarav Pet Atelier",
    email: "aarav@petatelier.in",
    department: "External Supply Partner",
    landingPath: "/vendor-portal",
    description: "Supply layer partner portal, SKU uploads, live inventory, and settlements.",
    badgeClass: "designer",
    clearance: ["02", "03", "06"],
  },
  {
    id: "merchandiser",
    name: "Merchandising & CRM",
    shortRole: "Merchandiser",
    user: "Ananya Roy",
    email: "ananya.roy@zenve.in",
    department: "Supply & Brand Acquisition",
    landingPath: "/vendor-crm",
    description: "Brand lead pipeline, vendor onboarding, KYC review, and contracts.",
    badgeClass: "merchandiser",
    clearance: ["01", "03", "10"],
  },
  {
    id: "qa",
    name: "Catalogue QA Lead",
    shortRole: "Catalogue QA",
    user: "Rohan Varma",
    email: "rohan.varma@zenve.in",
    department: "Quality & Media Standards",
    landingPath: "/catalogueqa",
    description: "SKU specification validation, media quality checks, and approval audit trail.",
    badgeClass: "qa",
    clearance: ["03", "04"],
  },
  {
    id: "inventory",
    name: "Inventory & Logistics",
    shortRole: "Inventory Ops",
    user: "Vikram Singh",
    email: "vikram.singh@zenve.in",
    department: "Warehouse & Fulfillment",
    landingPath: "/inventory",
    description: "Stock receipts, physical vs reserved counts, damage quarantine, and returns.",
    badgeClass: "inventory",
    clearance: ["05", "07", "08", "09"],
  },
  {
    id: "finance",
    name: "Finance Controller",
    shortRole: "Finance",
    user: "Neha Kapoor",
    email: "neha.kapoor@zenve.in",
    department: "Settlement & Accounting",
    landingPath: "/settlement",
    description: "Take-rate calculation, vendor payout reconciliation, and escrow management.",
    badgeClass: "finance",
    clearance: ["07", "10", "11"],
  },
  { id: "media", name: "Media Team", shortRole: "Media", user: "Media Team", email: "media@zenve.in", department: "Creative Operations", landingPath: "/media", description: "Product originals, Figma creative work, and vendor image delivery.", badgeClass: "qa", clearance: ["13"] },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("zenve_auth_user");
      if (saved) {
        const user = JSON.parse(saved);
        const role = ROLES.find(r => r.id === user?.id);
        return role && sessionStorage.getItem("zippy_access_token") ? { ...user, clearance: role.clearance } : null;
      }
    } catch {
      // Fallback
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem("zenve_auth_user", JSON.stringify(currentUser));
    } catch (e) {
      console.error("Could not persist auth state", e);
    }
  }, [currentUser]);


  const loginCustom = async (email, password, { staffOnly = false, vendorOnly = false } = {}) => {
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password, ...(vendorOnly ? { audience: "vendor" } : staffOnly ? { audience: "staff" } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Sign in failed.");
    const roleMap = { Admin: "admin", Vendor: "designer", Merchandiser: "merchandiser", "Catalogue QA": "qa", Operations: "inventory", Finance: "finance", Media: "media" };
    const roleId = data.is_superuser ? "admin" : (roleMap[data.role] || (data.is_staff ? "admin" : null));
    const role = ROLES.find(r => r.id === roleId);
    if (!role) throw new Error("This account does not have CRM access.");
    if (staffOnly && role.id === "designer") {
      throw new Error("This login is for CRM staff. Please use the separate vendor login for your vendor account.");
    }
    if (vendorOnly && (role.id !== "designer" || !data.vendor_id)) {
      throw new Error("This login is for vendor accounts only. Staff should use the CRM login.");
    }
    sessionStorage.setItem("zippy_access_token", data.access);
    const updated = { ...role, email: data.email, user: [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username, vendorId: data.vendor_id };
    setCurrentUser(updated);
    return updated;
  };

  const logout = () => {
    sessionStorage.removeItem("zippy_access_token");
    setCurrentUser(null);
    try {
      localStorage.removeItem("zenve_auth_user");
    } catch {
      // Ignore
    }
  };

  const hasAccess = (layerNum) => {
    if (!currentUser) return false;
    const numStr = String(layerNum).padStart(2, "0");
    return currentUser.clearance?.includes(numStr) ?? false;
  };

  const canAccessPath = (path) => {
    if (!currentUser) return false;
    if (path === "/employees") return currentUser.id === "admin";
    const layerPathMap = {
      "/vendor-crm": "01",
      "/vendor-portal": "02",
      "/catalogue": "03",
      "/catalogueqa": "04",
      "/inventory": "05",
      "/storefront": "06",
      "/orders": "07",
      "/delivery": "08",
      "/returns": "09",
      "/settlement": "10",
      "/analytics": "11",
      "/command-centre": "12",
      "/media": "13",
    };
    const layerNum = layerPathMap[path];
    if (!layerNum) return true; // public / unspecified
    return hasAccess(layerNum);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        ROLES,
        loginCustom,
        logout,
        hasAccess,
        canAccessPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
