import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import DataUpload from "./pages/data/DataUpload";
import DataUpdate from "./pages/data/DataUpdate";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route
      path="/admin/data-upload"
      element={
        <ProtectedRoute>
          <DataUpload />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/dashboard"
      element={<Navigate to="/admin/data-upload" replace />}
    />
    <Route
      path="/admin/data-update"
      element={
        <ProtectedRoute>
          <DataUpdate />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/data-add"
      element={
        <ProtectedRoute>
          <DataUpdate />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/admin/data-upload" replace />} />
  </Routes>
);

export default App;
