import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import ShopsPage from "./pages/Shops";
import MenuSyncPage from "./pages/MenuSync";
import ShopDashboardPage from "./pages/ShopDashboard";
import UberOAuthCallbackPage from "./pages/UberOAuthCallback";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("posToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/auth/uber/callback" element={<UberOAuthCallbackPage />} />

        <Route
          path="/shops"
          element={
            <ProtectedRoute>
              <ShopsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/menu-sync/:uberStoreId"
          element={
            <ProtectedRoute>
              <MenuSyncPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shop-dashboard/:shopId/:uberStoreId"
          element={
            <ProtectedRoute>
              <ShopDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/shops" replace />} />
        <Route path="*" element={<Navigate to="/shops" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
