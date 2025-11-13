import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  getAllInventory,
  getAllAccounts,
  getActiveEvent,
  addTransaction,
  getSetting,
} from '../../utils/db';
import { formatCurrency } from '../../utils/exports';

function POSTab({ currentUser }) {
  const [inventory, setInventory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(20);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const inv = await getAllInventory();
    const accs = await getAllAccounts();
    const event = await getActiveEvent();
    const threshold = await getSetting('lowBalanceThreshold');

    setInventory(inv);
    setAccounts(accs);
    setActiveEvent(event);
    if (threshold) setLowBalanceThreshold(threshold.value);

    // Extract unique categories
    const cats = ['All', ...new Set(inv.map(item => item.category).filter(Boolean))];
    setCategories(cats);
  }

  const filteredInventory = selectedCategory === 'All'
    ? inventory
    : inventory.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c =>
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1, inventoryId: item.id }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedAccount(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (!activeEvent && !selectedAccount) {
      alert('Please select an account or start an event first.');
      return;
    }

    setShowCheckoutModal(true);
  };

  const confirmCheckout = async () => {
    setLoading(true);

    try {
      // Check inventory availability
      for (const cartItem of cart) {
        const invItem = inventory.find(i => i.id === cartItem.id);
        if (invItem.trackInventory && invItem.quantity !== null) {
          if (invItem.quantity < cartItem.quantity) {
            alert(`Insufficient quantity for ${invItem.name}. Available: ${invItem.quantity}`);
            setLoading(false);
            return;
          }
        }
      }

      const transaction = {
        accountId: activeEvent ? null : selectedAccount.id,
        eventId: activeEvent ? activeEvent.id : null,
        bartender: currentUser.name,
        items: cart.map(item => ({
          inventoryId: item.inventoryId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: cartTotal,
        date: new Date().toISOString(),
      };

      await addTransaction(transaction);

      // Reload data
      await loadData();

      // Clear cart
      clearCart();
      setShowCheckoutModal(false);

      alert('Transaction completed successfully!');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to complete transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedAccountBalance = selectedAccount?.balance || 0;
  const isLowBalance = !activeEvent && selectedAccount && (selectedAccountBalance - cartTotal) < lowBalanceThreshold;

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Point of Sale</h2>

      {activeEvent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-green-900">Active Event: {activeEvent.name}</div>
              <div className="text-sm text-green-700">All purchases will be charged to this event</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg transition ${
                      selectedCategory === cat
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredInventory.map(item => {
                const isOutOfStock = item.trackInventory && item.quantity !== null && item.quantity === 0;
                const isLowStock = item.trackInventory && item.quantity !== null && item.quantity > 0 && item.quantity <= 5;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    disabled={isOutOfStock}
                    className={`
                      p-4 rounded-lg border-2 text-left transition
                      ${isOutOfStock
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : isLowStock
                        ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
                        : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'
                      }
                    `}
                  >
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-primary-600 font-semibold mt-1">
                      {formatCurrency(item.price)}
                    </div>
                    {item.trackInventory && item.quantity !== null && (
                      <div className={`text-xs mt-1 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-700' : 'text-gray-500'}`}>
                        {isOutOfStock ? 'Out of Stock' : `Stock: ${item.quantity}`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Cart</h3>
            </div>

            {!activeEvent && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account
                </label>
                <select
                  value={selectedAccount?.id || ''}
                  onChange={(e) => {
                    const acc = accounts.find(a => a.id === parseInt(e.target.value));
                    setSelectedAccount(acc);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Cart is empty
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary-600">{formatCurrency(cartTotal)}</span>
              </div>
              {!activeEvent && selectedAccount && (
                <div className="mt-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Current Balance:</span>
                    <span>{formatCurrency(selectedAccountBalance)}</span>
                  </div>
                  <div className={`flex justify-between font-medium ${isLowBalance ? 'text-yellow-700' : 'text-gray-900'}`}>
                    <span>New Balance:</span>
                    <span>{formatCurrency(selectedAccountBalance - cartTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {isLowBalance && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    Low balance warning! Account will be below ${lowBalanceThreshold} after this transaction.
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || (!activeEvent && !selectedAccount)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Checkout
              </button>
              <button
                onClick={clearCart}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Confirmation Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Purchase</h3>

            <div className="space-y-3 mb-6">
              {activeEvent ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-sm font-medium text-green-900">Event: {activeEvent.name}</div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-sm font-medium text-blue-900">
                    Account: {selectedAccount?.name}
                  </div>
                  <div className="text-sm text-blue-700">
                    Balance: {formatCurrency(selectedAccountBalance)} → {formatCurrency(selectedAccountBalance - cartTotal)}
                  </div>
                </div>
              )}

              <div className="border-t border-b py-3">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary-600">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckoutModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmCheckout}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POSTab;
