import { openDB } from 'idb';

const DB_NAME = 'SeminaryBarPOS';
const DB_VERSION = 1;

// Initialize the database
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Accounts store
      if (!db.objectStoreNames.contains('accounts')) {
        const accountStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
        accountStore.createIndex('name', 'name', { unique: true });
        accountStore.createIndex('type', 'type');
      }

      // Transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        txStore.createIndex('accountId', 'accountId');
        txStore.createIndex('eventId', 'eventId');
        txStore.createIndex('date', 'date');
        txStore.createIndex('bartender', 'bartender');
      }

      // Inventory store
      if (!db.objectStoreNames.contains('inventory')) {
        const invStore = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
        invStore.createIndex('name', 'name', { unique: true });
        invStore.createIndex('category', 'category');
      }

      // Events store
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        eventStore.createIndex('name', 'name');
        eventStore.createIndex('date', 'date');
        eventStore.createIndex('status', 'status');
      }

      // Users store (bartenders and admins)
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        userStore.createIndex('code', 'code', { unique: true });
        userStore.createIndex('role', 'role');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return db;
}

// Get the database instance
async function getDB() {
  return await initDB();
}

// ============ ACCOUNTS ============
export async function getAllAccounts() {
  const db = await getDB();
  return await db.getAll('accounts');
}

export async function getAccount(id) {
  const db = await getDB();
  return await db.get('accounts', id);
}

export async function addAccount(account) {
  const db = await getDB();
  const newAccount = {
    ...account,
    balance: account.balance || 0,
    createdAt: new Date().toISOString(),
  };
  return await db.add('accounts', newAccount);
}

export async function updateAccount(id, updates) {
  const db = await getDB();
  const account = await db.get('accounts', id);
  const updated = { ...account, ...updates };
  await db.put('accounts', updated);
  return updated;
}

export async function deleteAccount(id) {
  const db = await getDB();
  await db.delete('accounts', id);
}

// ============ TRANSACTIONS ============
export async function getAllTransactions() {
  const db = await getDB();
  return await db.getAll('transactions');
}

export async function getTransactionsByAccount(accountId) {
  const db = await getDB();
  const index = db.transaction('transactions').store.index('accountId');
  return await index.getAll(accountId);
}

export async function getTransactionsByEvent(eventId) {
  const db = await getDB();
  const index = db.transaction('transactions').store.index('eventId');
  return await index.getAll(eventId);
}

export async function getTransactionsByDateRange(startDate, endDate) {
  const db = await getDB();
  const allTransactions = await db.getAll('transactions');
  return allTransactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= new Date(startDate) && txDate <= new Date(endDate);
  });
}

export async function addTransaction(transaction) {
  const db = await getDB();
  const tx = db.transaction(['transactions', 'accounts', 'inventory'], 'readwrite');

  // Add transaction
  const newTransaction = {
    ...transaction,
    date: transaction.date || new Date().toISOString(),
  };
  const txId = await tx.objectStore('transactions').add(newTransaction);

  // Update account balance
  if (transaction.accountId) {
    const accountStore = tx.objectStore('accounts');
    const account = await accountStore.get(transaction.accountId);
    if (account) {
      account.balance -= transaction.total;
      await accountStore.put(account);
    }
  }

  // Update inventory quantities
  if (transaction.items && Array.isArray(transaction.items)) {
    const inventoryStore = tx.objectStore('inventory');
    for (const item of transaction.items) {
      if (item.inventoryId) {
        const invItem = await inventoryStore.get(item.inventoryId);
        if (invItem && invItem.trackInventory && invItem.quantity !== null) {
          invItem.quantity -= item.quantity;
          await inventoryStore.put(invItem);
        }
      }
    }
  }

  await tx.done;
  return txId;
}

export async function refundTransaction(transactionId, refundedBy) {
  const db = await getDB();
  const transaction = await db.get('transactions', transactionId);

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const tx = db.transaction(['transactions', 'accounts', 'inventory'], 'readwrite');

  // Mark original transaction as refunded
  const transactionStore = tx.objectStore('transactions');
  transaction.refunded = true;
  transaction.refundedBy = refundedBy;
  transaction.refundedAt = new Date().toISOString();
  await transactionStore.put(transaction);

  // Create refund transaction (negative amounts)
  const { id, refunded: wasRefunded, refundedBy: originalRefundedBy, refundedAt, ...transactionData } = transaction;
  const refundTransaction = {
    ...transactionData,
    total: -transaction.total,
    refundOf: transactionId,
    bartender: refundedBy,
    date: new Date().toISOString(),
    refunded: false,
  };
  await transactionStore.add(refundTransaction);

  // Restore account balance
  if (transaction.accountId) {
    const accountStore = tx.objectStore('accounts');
    const account = await accountStore.get(transaction.accountId);
    if (account) {
      account.balance += transaction.total;
      await accountStore.put(account);
    }
  }

  // Restore inventory quantities
  if (transaction.items && Array.isArray(transaction.items)) {
    const inventoryStore = tx.objectStore('inventory');
    for (const item of transaction.items) {
      if (item.inventoryId) {
        const invItem = await inventoryStore.get(item.inventoryId);
        if (invItem && invItem.trackInventory && invItem.quantity !== null) {
          invItem.quantity += item.quantity;
          await inventoryStore.put(invItem);
        }
      }
    }
  }

  await tx.done;
}

// ============ INVENTORY ============
export async function getAllInventory() {
  const db = await getDB();
  return await db.getAll('inventory');
}

export async function getInventoryItem(id) {
  const db = await getDB();
  return await db.get('inventory', id);
}

export async function addInventoryItem(item) {
  const db = await getDB();
  const newItem = {
    ...item,
    createdAt: new Date().toISOString(),
  };
  return await db.add('inventory', newItem);
}

export async function updateInventoryItem(id, updates) {
  const db = await getDB();
  const item = await db.get('inventory', id);
  const updated = { ...item, ...updates };
  await db.put('inventory', updated);
  return updated;
}

export async function deleteInventoryItem(id) {
  const db = await getDB();
  await db.delete('inventory', id);
}

// ============ EVENTS ============
export async function getAllEvents() {
  const db = await getDB();
  return await db.getAll('events');
}

export async function getEvent(id) {
  const db = await getDB();
  return await db.get('events', id);
}

export async function getActiveEvent() {
  const db = await getDB();
  const allEvents = await db.getAll('events');
  return allEvents.find(event => event.status === 'active');
}

export async function addEvent(event) {
  const db = await getDB();
  const newEvent = {
    ...event,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  return await db.add('events', newEvent);
}

export async function updateEvent(id, updates) {
  const db = await getDB();
  const event = await db.get('events', id);
  const updated = { ...event, ...updates };
  await db.put('events', updated);
  return updated;
}

export async function deleteEvent(id) {
  const db = await getDB();
  await db.delete('events', id);
}

// ============ USERS ============
export async function getAllUsers() {
  const db = await getDB();
  return await db.getAll('users');
}

export async function getUserByCode(code) {
  const db = await getDB();
  const index = db.transaction('users').store.index('code');
  return await index.get(code);
}

export async function addUser(user) {
  const db = await getDB();
  const newUser = {
    ...user,
    createdAt: new Date().toISOString(),
  };
  return await db.add('users', newUser);
}

export async function updateUser(id, updates) {
  const db = await getDB();
  const user = await db.get('users', id);
  const updated = { ...user, ...updates };
  await db.put('users', updated);
  return updated;
}

export async function deleteUser(id) {
  const db = await getDB();
  await db.delete('users', id);
}

// ============ SETTINGS ============
export async function getSetting(key) {
  const db = await getDB();
  return await db.get('settings', key);
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

// ============ DATA MANAGEMENT ============
export async function exportAllData() {
  const db = await getDB();
  const data = {
    accounts: await db.getAll('accounts'),
    transactions: await db.getAll('transactions'),
    inventory: await db.getAll('inventory'),
    events: await db.getAll('events'),
    users: await db.getAll('users'),
    settings: await db.getAll('settings'),
    exportDate: new Date().toISOString(),
  };
  return data;
}

export async function importAllData(data) {
  const db = await getDB();
  const tx = db.transaction(['accounts', 'transactions', 'inventory', 'events', 'users', 'settings'], 'readwrite');

  // Clear existing data
  await tx.objectStore('accounts').clear();
  await tx.objectStore('transactions').clear();
  await tx.objectStore('inventory').clear();
  await tx.objectStore('events').clear();
  await tx.objectStore('users').clear();
  await tx.objectStore('settings').clear();

  // Import new data
  if (data.accounts) {
    for (const item of data.accounts) {
      await tx.objectStore('accounts').add(item);
    }
  }
  if (data.transactions) {
    for (const item of data.transactions) {
      await tx.objectStore('transactions').add(item);
    }
  }
  if (data.inventory) {
    for (const item of data.inventory) {
      await tx.objectStore('inventory').add(item);
    }
  }
  if (data.events) {
    for (const item of data.events) {
      await tx.objectStore('events').add(item);
    }
  }
  if (data.users) {
    for (const item of data.users) {
      await tx.objectStore('users').add(item);
    }
  }
  if (data.settings) {
    for (const item of data.settings) {
      await tx.objectStore('settings').add(item);
    }
  }

  await tx.done;
}

// ============ INITIALIZATION WITH SAMPLE DATA ============
export async function initializeSampleData() {
  const db = await getDB();

  // Check if data already exists
  const existingAccounts = await db.getAll('accounts');
  if (existingAccounts.length > 0) {
    return; // Data already initialized
  }

  // Add sample diocese accounts
  const dioceses = [
    { name: 'Diocese of Arlington', type: 'diocese', balance: 0 },
    { name: 'Archdiocese of Baltimore', type: 'diocese', balance: 0 },
    { name: 'Diocese of Burlington', type: 'diocese', balance: 0 },
    { name: 'Diocese of Colorado Springs', type: 'diocese', balance: 0 },
    { name: 'Diocese of Fargo', type: 'diocese', balance: 0 },
    { name: 'Diocese of Ft.Wayne-South Bend', type: 'diocese', balance: 0 },
    { name: 'Diocese of Harrisburg', type: 'diocese', balance: 0 },
    { name: 'Diocese of Lafayette', type: 'diocese', balance: 0 },
    { name: 'Diocese of Lincoln', type: 'diocese', balance: 0 },
    { name: 'Diocese of Norwich', type: 'diocese', balance: 0 },
    { name: 'Diocese of Ogdensburg', type: 'diocese', balance: 0 },
    { name: 'Diocese of Paterson', type: 'diocese', balance: 0 },
    { name: 'Diocese of Peoria', type: 'diocese', balance: 0 },
    { name: 'Diocese of Portland', type: 'diocese', balance: 0 },
    { name: 'Diocese of Richmond', type: 'diocese', balance: 0 },
    { name: 'Diocese of Savannah', type: 'diocese', balance: 0 },
    { name: 'Diocese of Syracuse', type: 'diocese', balance: 0 },
    { name: 'Diocese of Trenton', type: 'diocese', balance: 0 },
    { name: 'Archdiocese of Washington', type: 'diocese', balance: 0 },
    { name: 'Diocese of Wheeling-Charleston', type: 'diocese', balance: 0 },
    { name: 'Diocese of Worcester', type: 'diocese', balance: 0 },
    { name: 'Archdiocese for Military Services', type: 'diocese', balance: 0 },
    { name: 'Pittsburgh Oratory of St. Philip Neri', type: 'diocese', balance: 0 },
    { name: 'Youth Apostles Institute', type: 'diocese', balance: 0 },
  ];

  for (const diocese of dioceses) {
    await addAccount(diocese);
  }

  // Add Cash Customer account
  await addAccount({ name: 'Cash Customer', type: 'cash', balance: 0 });

  // Add sample inventory items
  const inventoryItems = [
    { name: 'Beer (Keg)', category: 'Beer', price: 3.00, trackInventory: false, quantity: null },
    { name: 'Wine (Red)', category: 'Wine', price: 5.00, trackInventory: true, quantity: 20 },
    { name: 'Wine (White)', category: 'Wine', price: 5.00, trackInventory: true, quantity: 20 },
    { name: 'Soda', category: 'Soft Drinks', price: 1.50, trackInventory: true, quantity: 50 },
    { name: 'Water', category: 'Soft Drinks', price: 1.00, trackInventory: true, quantity: 100 },
    { name: 'Whiskey Shot', category: 'Spirits', price: 6.00, trackInventory: true, quantity: 30 },
    { name: 'Vodka Shot', category: 'Spirits', price: 6.00, trackInventory: true, quantity: 30 },
    { name: 'Rum Shot', category: 'Spirits', price: 6.00, trackInventory: true, quantity: 30 },
    { name: 'Chips', category: 'Snacks', price: 2.00, trackInventory: true, quantity: 40 },
    { name: 'Pretzels', category: 'Snacks', price: 2.00, trackInventory: true, quantity: 40 },
  ];

  for (const item of inventoryItems) {
    await addInventoryItem(item);
  }

  // Add default admin user
  await addUser({
    name: 'Admin',
    code: 'admin123',
    role: 'admin',
  });

  // Add sample bartender users
  await addUser({
    name: 'John',
    code: 'bar001',
    role: 'bartender',
  });

  await addUser({
    name: 'Mary',
    code: 'bar002',
    role: 'bartender',
  });

  // Add default settings
  await setSetting('lowBalanceThreshold', 20);
  await setSetting('currency', 'USD');
}

// Clear all data and reinitialize
export async function clearAllData() {
  const db = await getDB();

  // Clear all object stores
  const storeNames = ['accounts', 'transactions', 'inventory', 'events', 'users', 'settings'];

  for (const storeName of storeNames) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
  }

  // Reinitialize with sample data
  await initializeSampleData();
}

// Zero out all account balances (keeps accounts, just sets balance to 0)
export async function zeroOutAllAccountBalances() {
  const db = await getDB();
  const tx = db.transaction('accounts', 'readwrite');
  const store = tx.objectStore('accounts');

  const accounts = await store.getAll();

  for (const account of accounts) {
    account.balance = 0;
    await store.put(account);
  }

  await tx.done;
}

// Zero out all inventory quantities (keeps items, just sets quantities to 0)
export async function zeroOutAllInventory() {
  const db = await getDB();
  const tx = db.transaction('inventory', 'readwrite');
  const store = tx.objectStore('inventory');

  const items = await store.getAll();

  for (const item of items) {
    if (item.trackInventory && item.quantity !== null) {
      item.quantity = 0;
      await store.put(item);
    }
  }

  await tx.done;
}
