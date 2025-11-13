import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Eye, X, Download, RotateCcw, Search, Edit, Clock } from 'lucide-react';
import {
  getAllAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getTransactionsByAccount,
  getAllTransactions,
  refundTransaction,
  addTransaction,
  zeroOutAllAccountBalances,
  addMissingDioceses,
} from '../../utils/db';
import { formatCurrency, formatDateTime, exportAccountStatementToPDF, exportAccountStatementToExcel } from '../../utils/exports';

function AccountsTab({ currentUser }) {
  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [newAccount, setNewAccount] = useState({ name: '', balance: 0, type: 'diocese' });
  const [editAccount, setEditAccount] = useState({ name: '', type: '' });
  const [fundAmount, setFundAmount] = useState('');
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadAccounts();
    loadRecentTransactions();
  }, []);

  async function loadAccounts() {
    const accs = await getAllAccounts();
    setAccounts(accs);
  }

  async function loadRecentTransactions() {
    const allTxs = await getAllTransactions();
    // Get last 10 transactions, sorted by date
    const recent = allTxs
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    setRecentTransactions(recent);
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
      // Create a transaction record for the fund addition
      // The addTransaction function will automatically update the account balance
      await addTransaction({
        accountId: selectedAccount.id,
        items: [{ name: 'Funds Added', quantity: 1, price: amount }],
        total: -amount, // Negative because it's a credit to the account
        bartender: currentUser.name,
        date: new Date().toISOString(),
        fundAddition: true, // Flag to identify this as a fund addition
      });

      await loadAccounts();
      await loadRecentTransactions();
      setShowAddFundsModal(false);
      setFundAmount('');

      // Update selected account with new balance
      const updatedAccount = await getAllAccounts();
      const updated = updatedAccount.find(a => a.id === selectedAccount.id);
      setSelectedAccount(updated);

      alert('Funds added successfully!');
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

  const handleRefund = async (transactionId, fromRecent = false) => {
    if (!window.confirm('Are you sure you want to refund this transaction? This will restore the account balance and inventory.')) {
      return;
    }

    try {
      await refundTransaction(transactionId, currentUser.name);
      alert('Transaction refunded successfully');

      // Reload data
      await loadAccounts();
      await loadRecentTransactions();

      // If viewing account details, update those too
      if (selectedAccount && !fromRecent) {
        const txs = await getTransactionsByAccount(selectedAccount.id);
        setAccountTransactions(txs);

        // Update selected account
        const updatedAccounts = await getAllAccounts();
        const updated = updatedAccounts.find(a => a.id === selectedAccount.id);
        setSelectedAccount(updated);
      }
    } catch (error) {
      alert('Failed to refund transaction: ' + error.message);
      console.error(error);
    }
  };

  const handleOpenEditModal = (account) => {
    setSelectedAccount(account);
    setEditAccount({ name: account.name, type: account.type });
    setShowEditModal(true);
  };

  const handleSaveEditAccount = async (e) => {
    e.preventDefault();

    if (!editAccount.name.trim()) {
      alert('Account name cannot be empty');
      return;
    }

    try {
      await updateAccount(selectedAccount.id, {
        name: editAccount.name,
        type: editAccount.type,
      });
      await loadAccounts();
      setShowEditModal(false);
      alert('Account updated successfully!');
    } catch (error) {
      alert('Failed to update account. Account name may already exist.');
      console.error(error);
    }
  };

  const handleZeroOutAllBalances = async () => {
    const confirmation = window.prompt(
      'WARNING: This will set ALL account balances to $0.00!\n\n' +
      'This action cannot be undone.\n\n' +
      'Type "ZERO" (all caps) to confirm:'
    );

    if (confirmation !== 'ZERO') {
      return;
    }

    try {
      await zeroOutAllAccountBalances();
      await loadAccounts();
      alert('All account balances have been zeroed out.');
    } catch (error) {
      alert('Failed to zero out balances: ' + error.message);
      console.error(error);
    }
  };

  const handleAddMissingDioceses = async () => {
    try {
      const addedCount = await addMissingDioceses();
      await loadAccounts();
      if (addedCount > 0) {
        alert(`Successfully added ${addedCount} missing diocese account(s).`);
      } else {
        alert('All diocese accounts are already present.');
      }
    } catch (error) {
      alert('Failed to add dioceses: ' + error.message);
      console.error(error);
    }
  };

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        {isAdmin && (
          <>
            <button
              onClick={handleAddMissingDioceses}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              title="Add any missing diocese accounts"
            >
              <Plus className="w-5 h-5" />
              Add Dioceses
            </button>
            <button
              onClick={handleZeroOutAllBalances}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              title="Reset all account balances to $0.00"
            >
              <RotateCcw className="w-5 h-5" />
              Zero Out All
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Add Account
            </button>
          </>
        )}
      </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <div className="space-y-2">
            {recentTransactions.map(tx => {
              const account = accounts.find(a => a.id === tx.accountId);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {account?.name || (tx.eventId ? 'Event Purchase' : 'Unknown')}
                      </span>
                      {tx.refunded && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Refunded</span>
                      )}
                      {tx.refundOf && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Refund</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDateTime(tx.date)} • {tx.bartender} • {tx.items?.map(item => `${item.name} (×${item.quantity})`).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-semibold ${tx.total < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.total < 0 ? '+' : ''}{formatCurrency(Math.abs(tx.total))}
                    </span>
                    {!tx.refunded && !tx.refundOf && (
                      <button
                        onClick={() => handleRefund(tx.id, true)}
                        className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition"
                        title="Refund transaction"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchTerm && filteredAccounts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No accounts found matching "{searchTerm}"
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map(account => (
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
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleOpenEditModal(account)}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition text-sm"
                    title="Edit account"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {account.name !== 'Cash Customer' && (
                    <button
                      onClick={() => handleDeleteAccount(account.id, account.name)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition text-sm"
                    >
                      Delete
                    </button>
                  )}
                </>
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
                  <button
                    onClick={() => setShowAddFundsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    Add Funds
                  </button>
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
                          <div>
                            <div className="text-sm text-gray-600">{formatDateTime(tx.date)}</div>
                            {tx.refunded && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                Refunded
                              </span>
                            )}
                            {tx.refundOf && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                Refund
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`text-lg font-semibold ${tx.total < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.total < 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.total))}
                            </div>
                            {!tx.refunded && !tx.refundOf && (
                              <button
                                onClick={() => handleRefund(tx.id)}
                                className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition"
                                title="Refund transaction"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Account</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={editAccount.name}
                  onChange={(e) => setEditAccount({ ...editAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={editAccount.type}
                  onChange={(e) => setEditAccount({ ...editAccount, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="diocese">Diocese</option>
                  <option value="cash">Cash Customer</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Note: Changing the account type or name will not affect existing transactions or the account balance.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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

export default AccountsTab;
