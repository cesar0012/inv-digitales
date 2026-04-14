import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Dashboard } from './components/Dashboard';
import { EditorView } from './components/EditorView';
import { SSOConsume } from './components/SSOConsume';
import { TestLogin } from './components/TestLogin';
import { AdminLogin } from './components/AdminLogin';
import { AdminView } from './components/AdminView';
import { CatalogoView } from './components/CatalogoView';

const AdminRoute: React.FC = () => {
  const { admin, loading } = useAdminAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }
  
  if (!admin) {
    return <Navigate to="/admin-login" replace />;
  }
  
  return <AdminView />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/sso/consume" element={<SSOConsume />} />
            <Route path="/test" element={<TestLogin />} />
            <Route path="/catalogo" element={<CatalogoView />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/editor" element={
              <PrivateRoute>
                <EditorView />
              </PrivateRoute>
            } />
            
            <Route path="/editor/:filename" element={
              <PrivateRoute>
                <EditorView />
              </PrivateRoute>
            } />
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;