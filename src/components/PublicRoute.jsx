import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";
const PublicRoute = ({ children }) => (isLoggedIn() ? <Navigate to="/admin/dashboard" replace /> : children);
export default PublicRoute;
