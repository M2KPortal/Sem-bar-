import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initDB, initializeSampleData, getSetting, importAllData } from './utils/db';
import { loadFromGitHub, parseGitHubUrl } from './utils/githubSync';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [initMessage, setInitMessage] = useState('Initializing Seminary Bar POS...');

  useEffect(() => {
    async function initialize() {
      try {
        setInitMessage('Initializing database...');
        await initDB();
        await initializeSampleData();

        // Check if auto-sync is enabled
        setInitMessage('Checking for cloud sync...');
        const autoSync = await getSetting('autoSync');

        if (autoSync && autoSync.value === true) {
          try {
            const token = await getSetting('githubToken');
            const repo = await getSetting('githubRepo');
            const path = await getSetting('githubPath');

            if (token && repo) {
              setInitMessage('Loading data from GitHub...');
              const parsed = parseGitHubUrl(repo.value);

              if (parsed) {
                const data = await loadFromGitHub(
                  token.value,
                  parsed.owner,
                  parsed.repo,
                  path?.value || 'pos-data.json'
                );

                await importAllData(data);
                console.log('Data synchronized from GitHub');
                setInitMessage('Data synchronized from GitHub!');
              }
            }
          } catch (error) {
            console.warn('Auto-sync failed:', error);
            // Continue anyway, use local data
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setInitMessage('Failed to initialize. Please refresh the page.');
      }
    }
    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="text-center">
          <div className="text-white text-xl mb-2">{initMessage}</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
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
