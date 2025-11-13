import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initDB, initializeSampleData } from './utils/db';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function initialize() {
      try {
        await initDB();
        await initializeSampleData();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    }
    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="text-white text-xl">Initializing Seminary Bar POS...</div>
      </div>
    );
  }

  return (
    <Router basename="/Sem-bar-">
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={setCurrentUser} />
            )
          }
        />
        <Route
          path="/dashboard/*"
          element={
            currentUser ? (
              <Dashboard currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
