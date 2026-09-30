import { lazy, Suspense } from "react";
const VendorRegistration = lazy(() => import("./pages/VendorRegistration.jsx"));
import "./styles/Zippy.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";

const Employees = lazy(() => import("./pages/Employees.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const MediaStudio = lazy(() => import("./pages/MediaStudio.jsx"));
const LayerPage = lazy(() => import("./pages/LayerPage.jsx"));
const DesignerCRM = lazy(() => import("./pages/VendorCrm.jsx"));
const DesignerPortal = lazy(() => import("./pages/VendorPortal.jsx"));
const Catalogue = lazy(() => import("./pages/Catalogue.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const CatalogueQA = lazy(() => import("./pages/CatalogueQa.jsx"));
const Inventory = lazy(() => import("./pages/Inventory.jsx"));
const Storefront = lazy(() => import("./pages/Storefront.jsx"));
const DeliveryEngine = lazy(() => import("./pages/Delivery.jsx"));
const Returns = lazy(() => import("./pages/Returns.jsx"));
const Settlement = lazy(() => import("./pages/Settlement.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const CommandCentre = lazy(() => import("./pages/CommandCentre.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const VendorLogin = lazy(() => import("./pages/VendorLogin.jsx"));
import WorkspaceShell from "./components/WorkspaceShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceShell>
      <Suspense fallback={<p role="status">Loading…</p>}>
      <Routes>
        <Route path="/designer-crm" element={<Navigate to="/vendor-crm" replace />} />
        <Route path="/designer-portal" element={<Navigate to="/vendor-portal" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        {/* Home Page */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        {/* Role-Based Login */}
        <Route path="/register" element={<VendorRegistration />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vendor-login" element={<VendorLogin />} />
        <Route path="/media" element={<ProtectedRoute layer="13"><MediaStudio /></ProtectedRoute>} />

        {/* Operational Layers (Role Clearance Protected) */}
        <Route path="/vendor-crm" element={<ProtectedRoute layer="01"><DesignerCRM /></ProtectedRoute>} />
        <Route path="/vendor-portal" element={<ProtectedRoute layer="02" loginPath="/vendor-login"><DesignerPortal /></ProtectedRoute>} />
        <Route path="/catalogue" element={<ProtectedRoute layer="03"><Catalogue /></ProtectedRoute>} />
        <Route path="/catalogueqa" element={<ProtectedRoute layer="04"><CatalogueQA /></ProtectedRoute>} />
        <Route path="/catalogue-qa" element={<ProtectedRoute layer="04"><CatalogueQA /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute layer="05"><Inventory /></ProtectedRoute>} />
        <Route path="/storefront" element={<ProtectedRoute layer="06"><Storefront /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute layer="07"><Orders /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute layer="08"><DeliveryEngine /></ProtectedRoute>} />
        <Route path="/returns" element={<ProtectedRoute layer="09"><Returns /></ProtectedRoute>} />
        <Route path="/settlement" element={<ProtectedRoute layer="10"><Settlement /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute layer="11"><Analytics /></ProtectedRoute>} />
        <Route path="/command-centre" element={<ProtectedRoute layer="12"><CommandCentre /></ProtectedRoute>} />
      </Routes>
      </Suspense>
      </WorkspaceShell>
    </AuthProvider>
  );
}
