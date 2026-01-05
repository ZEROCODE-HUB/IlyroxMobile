import React from 'react';
import { registerRootComponent } from 'expo';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

const RootApp = () => (
  <ErrorBoundary>
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  </ErrorBoundary>
);

registerRootComponent(RootApp);