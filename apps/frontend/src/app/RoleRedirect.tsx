import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function RoleRedirect() {
  const { loading, isPro, isAuthenticated } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isPro ? <Navigate to="/dashboard" replace /> : <Navigate to="/dashboard-x" replace />;
}