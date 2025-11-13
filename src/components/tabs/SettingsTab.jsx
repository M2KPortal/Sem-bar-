import React, { useState, useEffect } from 'react';
import { Save, Upload, Download, Cloud, CheckCircle, XCircle, AlertTriangle, Play, Square, Calendar } from 'lucide-react';
import {
  getSetting,
  setSetting,
  exportAllData,
  importAllData,
  getAllEvents,
  getActiveEvent,
  addEvent,
  updateEvent,
} from '../../utils/db';
import { downloadJSON, readJSONFile } from '../../utils/exports';
import { saveToGitHub, loadFromGitHub, verifyGitHubAccess, parseGitHubUrl } from '../../utils/githubSync';

function SettingsTab({ currentUser }) {
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubPath, setGithubPath] = useState('pos-data.json');
  const [autoSync, setAutoSync] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(20);
  const [syncStatus, setSyncStatus] = useState(null); // 'success', 'error', 'verifying'
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [newEventName, setNewEventName] = useState('');

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadEvents() {
    const allEvents = await getAllEvents();
    const active = await getActiveEvent();
    setEvents(allEvents);
    setActiveEvent(active);
  }

  async function loadSettings() {
    const token = await getSetting('githubToken');
    const repo = await getSetting('githubRepo');
    const path = await getSetting('githubPath');
    const autoSyncSetting = await getSetting('autoSync');
    const threshold = await getSetting('lowBalanceThreshold');

    if (token) setGithubToken(token.value);
    if (repo) setGithubRepo(repo.value);
    if (path) setGithubPath(path.value);
    if (autoSyncSetting) setAutoSync(autoSyncSetting.value);
    if (threshold) setLowBalanceThreshold(threshold.value);
  }

  const handleSaveSettings = async () => {
    try {
      await setSetting('githubToken', githubToken);
      await setSetting('githubRepo', githubRepo);
      await setSetting('githubPath', githubPath);
      await setSetting('autoSync', autoSync);
      await setSetting('lowBalanceThreshold', lowBalanceThreshold);

      setSyncStatus('success');
      setSyncMessage('Settings saved successfully!');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Failed to save settings');
      console.error(error);
    }
  };

  const handleVerifyGitHub = async () => {
    if (!githubToken || !githubRepo) {
      setSyncStatus('error');
      setSyncMessage('Please enter both GitHub token and repository');
      return;
    }

    setSyncStatus('verifying');
    setSyncMessage('Verifying GitHub credentials...');

    try {
      const parsed = parseGitHubUrl(githubRepo);
      if (!parsed) {
        setSyncStatus('error');
        setSyncMessage('Invalid GitHub repository format. Use: owner/repo');
        return;
      }

      const isValid = await verifyGitHubAccess(githubToken, parsed.owner, parsed.repo);

      if (isValid) {
        setSyncStatus('success');
        setSyncMessage('GitHub credentials verified successfully!');
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        setSyncStatus('error');
        setSyncMessage('Failed to verify GitHub access. Check your token and repository.');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Verification error: ' + error.message);
    }
  };

  const handleSaveToGitHub = async () => {
    if (!githubToken || !githubRepo) {
      alert('Please configure GitHub settings first');
      return;
    }

    setLoading(true);
    setSyncStatus('verifying');
    setSyncMessage('Saving to GitHub...');

    try {
      const parsed = parseGitHubUrl(githubRepo);
      if (!parsed) {
        throw new Error('Invalid GitHub repository format');
      }

      const data = await exportAllData();
      const commitMessage = `POS data backup - ${new Date().toLocaleString()} by ${currentUser.name}`;

      await saveToGitHub(
        githubToken,
        parsed.owner,
        parsed.repo,
        githubPath,
        data,
        commitMessage
      );

      setSyncStatus('success');
      setSyncMessage('Data saved to GitHub successfully!');
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Failed to save to GitHub: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromGitHub = async () => {
    if (!githubToken || !githubRepo) {
      alert('Please configure GitHub settings first');
      return;
    }

    if (!window.confirm('This will replace all current data with data from GitHub. Are you sure?')) {
      return;
    }

    setLoading(true);
    setSyncStatus('verifying');
    setSyncMessage('Loading from GitHub...');

    try {
      const parsed = parseGitHubUrl(githubRepo);
      if (!parsed) {
        throw new Error('Invalid GitHub repository format');
      }

      const data = await loadFromGitHub(githubToken, parsed.owner, parsed.repo, githubPath);
      await importAllData(data);

      setSyncStatus('success');
      setSyncMessage('Data loaded from GitHub successfully! Reloading page...');

      // Reload page to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Failed to load from GitHub: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportAllData();
      const filename = `seminary-bar-backup-${Date.now()}.json`;
      downloadJSON(data, filename);
    } catch (error) {
      alert('Failed to export data');
      console.error(error);
    }
  };

  const handleImportJSON = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('This will replace all current data. Are you sure?')) {
      event.target.value = '';
      return;
    }

    try {
      const data = await readJSONFile(file);
      await importAllData(data);
      alert('Data imported successfully! Reloading page...');
      window.location.reload();
    } catch (error) {
      alert('Failed to import data: ' + error.message);
      console.error(error);
    }

    event.target.value = '';
  };

  const handleStartEvent = async () => {
    if (!newEventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    try {
      // End any active event first
      if (activeEvent) {
        await updateEvent(activeEvent.id, { status: 'completed' });
      }

      // Create new event
      await addEvent({
        name: newEventName,
        date: new Date().toISOString().split('T')[0],
        description: '',
      });

      setNewEventName('');
      await loadEvents();
      alert(`Event "${newEventName}" started successfully!`);
    } catch (error) {
      alert('Failed to start event: ' + error.message);
      console.error(error);
    }
  };

  const handleEndEvent = async () => {
    if (!activeEvent) {
      alert('No active event to end');
      return;
    }

    if (!window.confirm(`End event "${activeEvent.name}"?`)) {
      return;
    }

    try {
      await updateEvent(activeEvent.id, { status: 'completed' });
      await loadEvents();
      alert('Event ended successfully!');
    } catch (error) {
      alert('Failed to end event: ' + error.message);
      console.error(error);
    }
  };

  const handleActivateEvent = async (eventId, eventName) => {
    if (!window.confirm(`Activate event "${eventName}"? This will end any currently active event.`)) {
      return;
    }

    try {
      // End any active event first
      if (activeEvent) {
        await updateEvent(activeEvent.id, { status: 'completed' });
      }

      // Activate selected event
      await updateEvent(eventId, { status: 'active' });
      await loadEvents();
      alert(`Event "${eventName}" activated successfully!`);
    } catch (error) {
      alert('Failed to activate event: ' + error.message);
      console.error(error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      {/* Quick Event Management */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-primary-600" />
          <h3 className="text-xl font-semibold text-gray-900">Event Management</h3>
        </div>

        {activeEvent ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Play className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Active Event: {activeEvent.name}</span>
                </div>
                <div className="text-sm text-green-700">All POS purchases are being charged to this event</div>
              </div>
              <button
                onClick={handleEndEvent}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
              >
                <Square className="w-4 h-4" />
                End Event
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 text-center text-gray-600">
            No active event. Start a new event or activate an existing one below.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start New Event</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Event name (e.g., Alumni Gathering)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && handleStartEvent()}
              />
              <button
                onClick={handleStartEvent}
                disabled={!newEventName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Start Event
              </button>
            </div>
          </div>

          {events.filter(e => e.status === 'completed').length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Or Reactivate Previous Event</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events
                  .filter(e => e.status === 'completed')
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{event.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleActivateEvent(event.id, event.name)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm transition"
                      >
                        Activate
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Cloud Sync */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-6 h-6 text-primary-600" />
          <h3 className="text-xl font-semibold text-gray-900">GitHub Cloud Sync</h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            Sync your POS data to GitHub for backup and access across devices. You'll need:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 mt-2 ml-2">
            <li>A GitHub Personal Access Token with <code className="bg-blue-100 px-1 rounded">repo</code> permissions</li>
            <li>A GitHub repository where you have write access</li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">
            <a
              href="https://github.com/settings/tokens/new?description=Seminary%20Bar%20POS&scopes=repo"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-800"
            >
              Click here to create a new token
            </a>
          </p>
        </div>

        {syncStatus && (
          <div className={`rounded-lg p-4 mb-4 flex items-center gap-2 ${
            syncStatus === 'success' ? 'bg-green-50 border border-green-200' :
            syncStatus === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            {syncStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {syncStatus === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
            {syncStatus === 'verifying' && <AlertTriangle className="w-5 h-5 text-yellow-600 animate-pulse" />}
            <span className={`text-sm ${
              syncStatus === 'success' ? 'text-green-800' :
              syncStatus === 'error' ? 'text-red-800' :
              'text-yellow-800'
            }`}>
              {syncMessage}
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Repository
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="owner/repo or https://github.com/owner/repo"
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: M2KPortal/seminary-bar-data
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Path (in repository)
            </label>
            <input
              type="text"
              value={githubPath}
              onChange={(e) => setGithubPath(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="pos-data.json"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoSync"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
            />
            <label htmlFor="autoSync" className="text-sm font-medium text-gray-700">
              Auto-load data from GitHub on startup
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleVerifyGitHub}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
            >
              Verify Connection
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6">
          <h4 className="font-semibold text-gray-900 mb-3">Cloud Actions</h4>
          <div className="flex gap-3">
            <button
              onClick={handleSaveToGitHub}
              disabled={loading || !githubToken || !githubRepo}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save to GitHub'}
            </button>
            {isAdmin && (
              <button
                onClick={handleLoadFromGitHub}
                disabled={loading || !githubToken || !githubRepo}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                {loading ? 'Loading...' : 'Load from GitHub'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Local Backup/Restore */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Local Backup</h3>
        <p className="text-sm text-gray-600 mb-4">
          Export or import data as JSON files for local backup.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <Download className="w-5 h-5" />
            Export JSON
          </button>
          {isAdmin && (
            <label className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition cursor-pointer">
              <Upload className="w-5 h-5" />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Balance Threshold ($)
            </label>
            <input
              type="number"
              step="1"
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThreshold(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Show warning when account balance falls below this amount
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
