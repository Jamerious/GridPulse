import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects pages that require the user to be fully logged in.
 * If not authenticated, redirects to the login page (/) with a notification state.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          requiresAuth: true,
          attemptedPath: location.pathname,
          message: 'Access restricted: Please submit your login to view this page.',
        }}
      />
    );
  }

  return children;
};

/**
 * Protects the role-selection step (/LogInfo).
 * Requires the user to have either filled out login credentials on / or already be logged in.
 */
export const PendingAuthRoute = ({ children }) => {
  const { isAuthenticated, pendingCredentials } = useAuth();

  if (!isAuthenticated && !pendingCredentials) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          requiresCredentials: true,
          message: 'Please enter and submit your login credentials first.',
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;

