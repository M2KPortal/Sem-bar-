import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, TrendingUp, DollarSign } from 'lucide-react';
import {
  getAllAccounts,
  getTransactionsByDateRange,
} from '../../utils/db';
import {
  formatCurrency,
  formatDateTime,
  exportTransactionsToPDF,
  exportTransactionsToExcel,
} from '../../utils/exports';

function ReportsTab({ currentUser }) {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState('tonight'); // 'tonight' or 'custom'
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const accs = await getAllAccounts();
    setAccounts(accs);
    await loadTransactions();
  }

  async function loadTransactions() {
    let txs;
    if (reportType === 'tonight') {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = new Date(today + 'T00:00:00').toISOString();
      const endOfDay = new Date(today + 'T23:59:59').toISOString();
      txs = await getTransactionsByDateRange(startOfDay, endOfDay);
    } else {
      const startOfDay = new Date(dateRange.start + 'T00:00:00').toISOString();
      const endOfDay = new Date(dateRange.end + 'T23:59:59').toISOString();
      txs = await getTransactionsByDateRange(startOfDay, endOfDay);
    }

    // Filter by bartender for non-admin users
    if (!isAdmin && currentUser) {
      txs = txs.filter(tx => tx.bartender === currentUser.name);
    }

    setTransactions(txs);
  }

  useEffect(() => {
    loadTransactions();
  }, [reportType, dateRange]);

  const handleExportPDF = () => {
    const title = reportType === 'tonight'
      ? "Tonight's Report"
      : `Report from ${dateRange.start} to ${dateRange.end}`;
    const doc = exportTransactionsToPDF(transactions, accounts, title);
    doc.save(`report_${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    const filename = reportType === 'tonight'
      ? `tonight_report_${Date.now()}.xlsx`
      : `report_${dateRange.start}_to_${dateRange.end}.xlsx`;
    exportTransactionsToExcel(transactions, accounts, filename);
  };

  // Calculate statistics
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0);
  const uniqueBartenders = [...new Set(transactions.map(tx => tx.bartender))];
  const itemsSold = transactions.reduce((sum, tx) => tx.items?.reduce((s, i) => s + i.quantity, 0) || 0, 0);

  // Group transactions by account
  const transactionsByAccount = transactions.reduce((acc, tx) => {
    const accountId = tx.accountId || 'event';
    if (!acc[accountId]) {
      acc[accountId] = [];
    }
    acc[accountId].push(tx);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        {!isAdmin && (
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
            Showing your transactions only
          </div>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setReportType('tonight')}
              className={`px-4 py-2 rounded-lg transition ${
                reportType === 'tonight'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tonight's Report
            </button>
            <button
              onClick={() => setReportType('custom')}
              className={`px-4 py-2 rounded-lg transition ${
                reportType === 'custom'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Range
            </button>
          </div>

          {reportType === 'custom' && (
            <div className="flex gap-2 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Transactions</div>
              <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Items Sold</div>
              <div className="text-2xl font-bold text-gray-900">{itemsSold}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Bartenders</div>
              <div className="text-2xl font-bold text-gray-900">{uniqueBartenders.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleExportPDF}
          disabled={transactions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Export PDF
        </button>
        <button
          onClick={handleExportExcel}
          disabled={transactions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Export Excel
        </button>
      </div>

      {/* Transactions by Account */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Account</h3>
        <div className="space-y-3">
          {Object.entries(transactionsByAccount).map(([accountId, txs]) => {
            const account = accounts.find(a => a.id === parseInt(accountId));
            const accountTotal = txs.reduce((sum, tx) => sum + tx.total, 0);
            const isEvent = accountId === 'event';

            return (
              <div key={accountId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {isEvent ? 'Event Purchases' : account?.name || 'Unknown Account'}
                  </div>
                  <div className="text-sm text-gray-600">{txs.length} transactions</div>
                </div>
                <div className="text-lg font-semibold text-primary-600">
                  {formatCurrency(accountTotal)}
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(transactionsByAccount).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No transactions found for the selected period
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bartender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(tx => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.eventId ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            Event
                          </span>
                        ) : (
                          account?.name || 'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.bartender}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tx.items?.map(item => `${item.name} (×${item.quantity})`).join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(tx.total)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {transactions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No transactions found for the selected period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportsTab;
