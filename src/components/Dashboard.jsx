import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Package,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

import POSTab from './tabs/POSTab';
import AccountsTab from './tabs/AccountsTab';
import InventoryTab from './tabs/InventoryTab';
import EventsTab from './tabs/EventsTab';
import ReportsTab from './tabs/ReportsTab';
import UserManagementTab from './tabs/UserManagementTab';

function Dashboard({ currentUser, onLogout }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const navigation = [
    { name: 'POS', path: '/dashboard/pos', icon: ShoppingCart, adminOnly: false },
    { name: 'Accounts', path: '/dashboard/accounts', icon: Users, adminOnly: false },
    { name: 'Inventory', path: '/dashboard/inventory', icon: Package, adminOnly: true },
    { name: 'Events', path: '/dashboard/events', icon: Calendar, adminOnly: false },
    { name: 'Reports', path: '/dashboard/reports', icon: FileText, adminOnly: false },
    { name: 'Users', path: '/dashboard/users', icon: Settings, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-xl font-bold text-gray-900">Seminary Bar POS</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                <div className="text-xs text-gray-500">
                  {currentUser.role === 'admin' ? 'Administrator' : 'Bartender'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 fixed lg:sticky top-16 left-0 z-40
          w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem)]
          transition-transform duration-300 ease-in-out
        `}>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition
                    ${isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 top-16"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/pos" replace />} />
            <Route path="/pos" element={<POSTab currentUser={currentUser} />} />
            <Route path="/accounts" element={<AccountsTab currentUser={currentUser} />} />
            {isAdmin && <Route path="/inventory" element={<InventoryTab />} />}
            <Route path="/events" element={<EventsTab currentUser={currentUser} />} />
            <Route path="/reports" element={<ReportsTab currentUser={currentUser} />} />
            {isAdmin && <Route path="/users" element={<UserManagementTab />} />}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
