import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Users, Shield, Download, Upload } from 'lucide-react';
import {
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  getSetting,
  setSetting,
  exportAllData,
  importAllData,
} from '../../utils/db';
import { downloadJSON, readJSONFile } from '../../utils/exports';

function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(20);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    role: 'bartender',
  });
  const [thresholdInput, setThresholdInput] = useState('20');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const usrs = await getAllUsers();
    setUsers(usrs);

    const threshold = await getSetting('lowBalanceThreshold');
    if (threshold) {
      setLowBalanceThreshold(threshold.value);
      setThresholdInput(threshold.value.toString());
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      role: 'bartender',
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addUser(formData);
      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      alert('Failed to add user. Code may already exist.');
      console.error(error);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(editingUser.id, formData);
      await loadData();
      setShowEditModal(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      alert('Failed to update user.');
      console.error(error);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }

    try {
      await deleteUser(id);
      await loadData();
    } catch (error) {
      alert('Failed to delete user');
      console.error(error);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      code: user.code,
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleUpdateThreshold = async (e) => {
    e.preventDefault();
    const value = parseFloat(thresholdInput);
    if (isNaN(value) || value < 0) {
      alert('Please enter a valid threshold amount');
      return;
    }

    try {
      await setSetting('lowBalanceThreshold', value);
      setLowBalanceThreshold(value);
      alert('Low balance threshold updated successfully!');
    } catch (error) {
      alert('Failed to update threshold');
      console.error(error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      downloadJSON(data, `seminary_bar_backup_${Date.now()}.json`);
    } catch (error) {
      alert('Failed to export data');
      console.error(error);
    }
  };

  const handleImportData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readJSONFile(file);
      if (!window.confirm('This will replace all existing data with the imported data. Are you sure?')) {
        return;
      }

      await importAllData(data);
      await loadData();
      alert('Data imported successfully! Please refresh the page to see all changes.');
    } catch (error) {
      alert('Failed to import data. Please ensure the file is a valid backup file.');
      console.error(error);
    }

    // Reset file input
    e.target.value = '';
  };

  const bartenders = users.filter(u => u.role === 'bartender');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management & Settings</h2>

      {/* Backup & Restore Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Data Backup & Restore
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Export all data as a JSON backup file for safekeeping, or import data from a previous backup.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Download className="w-5 h-5" />
            Export Backup
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition cursor-pointer">
            <Upload className="w-5 h-5" />
            Import Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
        <form onSubmit={handleUpdateThreshold} className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Low Balance Warning Threshold
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Customers will be warned when their balance falls below this amount
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              Update
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Current threshold: ${lowBalanceThreshold}
          </div>
        </form>
      </div>

      {/* User Management Section */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Admins */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-red-600" />
          <h4 className="text-md font-semibold text-gray-900">Administrators ({admins.length})</h4>
        </div>
        <div className="space-y-2">
          {admins.map(user => (
            <div key={user.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-600">Code: {user.code}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(user)}
                  className="p-2 text-primary-600 hover:bg-primary-100 rounded transition"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(user.id, user.name)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="text-center text-gray-500 py-4">No administrators</div>
          )}
        </div>
      </div>

      {/* Bartenders */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h4 className="text-md font-semibold text-gray-900">Bartenders ({bartenders.length})</h4>
        </div>
        <div className="space-y-2">
          {bartenders.map(user => (
            <div key={user.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-600">Code: {user.code}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(user)}
                  className="p-2 text-primary-600 hover:bg-primary-100 rounded transition"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(user.id, user.name)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {bartenders.length === 0 && (
            <div className="text-center text-gray-500 py-4">No bartenders</div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New User</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="bartender">Bartender</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
              <button onClick={() => { setShowEditModal(false); setEditingUser(null); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="bartender">Bartender</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingUser(null); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementTab;
