import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRedirect } from "./RoleRedirect";

import LoginPage from "../pages/LoginPage";
import ProDashboard from "../pages/ProDashboard";
import UserDashboard from "../pages/UserDashboard";
import NewPatientPage from "../pages/NewPatientPage";
import NewExercisePage from "../pages/NewExercisePage";
import MyPatientsPage from "../pages/MyPatientsPage";
import PatientDetailsPage from "../pages/PatientDetailsPage";
import PrescribeExercisePage from "../pages/PrescribeExercisePage";
import PatientAssignmentsPage from "../pages/PatientAssignmentsPage";
import MySessionsPage from "../pages/MySessionsPage";
import SessionRunPage from "../pages/SessionRunPage";
import UserSessionPage from "../pages/UserSessionPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* após login, cai aqui e redireciona conforme role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pro/dashboard"
        element={
          <ProtectedRoute>
            <ProDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/new"
        element={
          <ProtectedRoute>
            <NewPatientPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/exercises/new"
        element={
          <ProtectedRoute>
            <NewExercisePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <MyPatientsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <PatientDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/:id/prescribe"
        element={
          <ProtectedRoute>
            <PrescribeExercisePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/:id/assignments"
        element={
          <ProtectedRoute>
            <PatientAssignmentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/session"
        element={
          <ProtectedRoute>
            <UserSessionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <MySessionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sessions/:id"
        element={
          <ProtectedRoute>
            <SessionRunPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}