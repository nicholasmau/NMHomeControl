import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './lib/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

function App() {
  const { isLoading, isAuthenticated, user, checkAuth, isDemoMode } = useAuthStore();

  useEffect(() => {
    console.log('[App] useEffect running - calling checkAuth');
    checkAuth();
  }, []);

  console.log('[App] Component rendering - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        
        <Route 
          path="/change-password" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <ChangePasswordPage />
            )
          } 
        />
        
        <Route 
          path="/admin/*" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (user?.role !== 'admin' && !isDemoMode) ? (
              <Navigate to="/" replace />
            ) : user.firstLogin ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AdminPage />
            )
          } 
        />
        
        <Route 
          path="/analytics" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : user?.firstLogin ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AnalyticsPage />
            )
          } 
        />
        
        <Route 
          path="/" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : user?.firstLogin ? (
              <Navigate to="/change-password" replace />
            ) : (
              <DashboardPage />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
