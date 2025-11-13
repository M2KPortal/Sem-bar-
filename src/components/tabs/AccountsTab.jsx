import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Eye, X, Download } from 'lucide-react';
import {
  getAllAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getTransactionsByAccount,
} from '../../utils/db';
import { formatCurrency, formatDateTime, exportAccountStatementToPDF, exportAccountStatementToExcel } from '../../utils/exports';

function AccountsTab({ currentUser }) {
  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [newAccount, setNewAccount] = useState({ name: '', balance: 0, type: 'diocese' });
  const [fundAmount, setFundAmount] = useState('');
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const accs = await getAllAccounts();
    setAccounts(accs);
  }

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await addAccount({
        ...newAccount,
        balance: parseFloat(newAccount.balance) || 0,
      });
      await loadAccounts();
      setShowAddModal(false);
      setNewAccount({ name: '', balance: 0, type: 'diocese' });
    } catch (error) {
      alert('Failed to add account. Account name may already exist.');
      console.error(error);
    }
  };

  const handleViewDetails = async (account) => {
    setSelectedAccount(account);
    const txs = await getTransactionsByAccount(account.id);
    setAccountTransactions(txs);
    setShowDetailsModal(true);
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await updateAccount(selectedAccount.id, {
        balance: selectedAccount.balance + amount,
      });
      await loadAccounts();
      setShowAddFundsModal(false);
      setFundAmount('');

      // Update selected account with new balance
      const updatedAccount = await getAllAccounts();
      const updated = updatedAccount.find(a => a.id === selectedAccount.id);
      setSelectedAccount(updated);
    } catch (error) {
      alert('Failed to add funds');
      console.error(error);
    }
  };

  const handleDeleteAccount = async (accountId, accountName) => {
    if (!window.confirm(`Are you sure you want to delete "${accountName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteAccount(accountId);
      await loadAccounts();
    } catch (error) {
      alert('Failed to delete account');
      console.error(error);
    }
  };

  const handleExportPDF = () => {
    const doc = exportAccountStatementToPDF(selectedAccount, accountTransactions);
    doc.save(`${selectedAccount.name}_statement.pdf`);
  };

  const handleExportExcel = () => {
    exportAccountStatementToExcel(
      selectedAccount,
      accountTransactions,
      `${selectedAccount.name}_statement.xlsx`
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Add Account
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => (
          <div key={account.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  {account.type === 'diocese' ? 'Diocese Account' : 'Cash Customer'}
                </div>
              </div>
              {account.type === 'diocese' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Diocese
                </span>
              )}
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Current Balance</div>
              <div className={`text-2xl font-bold ${account.balance < 20 ? 'text-yellow-600' : 'text-green-600'}`}>
                {formatCurrency(account.balance)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleViewDetails(account)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              {isAdmin && account.name !== 'Cash Customer' && (
                <button
                  onClick={() => handleDeleteAccount(account.id, account.name)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="diocese">Diocese</option>
                  <option value="cash">Cash Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showDetailsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedAccount.name}</h3>
                  <div className="text-gray-600 mt-1">Account Details</div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <div className="text-sm text-gray-600">Current Balance</div>
                  <div className={`text-3xl font-bold ${selectedAccount.balance < 20 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedAccount.balance)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddFundsModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm"
                    >
                      <DollarSign className="w-4 h-4" />
                      Add Funds
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Transaction History ({accountTransactions.length})
              </h4>

              {accountTransactions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {accountTransactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(tx => (
                      <div key={tx.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm text-gray-600">{formatDateTime(tx.date)}</div>
                          <div className="text-lg font-semibold text-red-600">
                            -{formatCurrency(tx.total)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">
                          <div className="font-medium">Bartender: {tx.bartender}</div>
                          <div className="mt-1">
                            Items: {tx.items?.map(item => `${item.name} (×${item.quantity})`).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      {showAddFundsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Funds</h3>
              <button onClick={() => setShowAddFundsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Account</div>
              <div className="text-lg font-semibold text-gray-900">{selectedAccount.name}</div>
              <div className="text-sm text-gray-600 mt-2">Current Balance</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedAccount.balance)}</div>
            </div>

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Add
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>

              {fundAmount && !isNaN(parseFloat(fundAmount)) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600">New Balance</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedAccount.balance + parseFloat(fundAmount))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFundsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsTab;
