import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date/time
export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ============ PDF EXPORTS ============
export function exportTransactionsToPDF(transactions, accounts, title = 'Transaction Report') {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Date
  doc.setFontSize(11);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, 14, 32);

  // Prepare table data
  const tableData = transactions.map(tx => {
    const account = accounts.find(a => a.id === tx.accountId);
    return [
      formatDateTime(tx.date),
      account?.name || 'N/A',
      tx.bartender || 'N/A',
      tx.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '',
      formatCurrency(tx.total),
    ];
  });

  // Calculate totals
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);

  doc.autoTable({
    startY: 40,
    head: [['Date/Time', 'Account', 'Bartender', 'Items', 'Total']],
    body: tableData,
    foot: [['', '', '', 'Grand Total:', formatCurrency(totalAmount)]],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 165, 233] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
  });

  return doc;
}

export function exportEventReportToPDF(event, transactions, title = 'Event Report') {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Event details
  doc.setFontSize(12);
  doc.text(`Event: ${event.name}`, 14, 32);
  doc.setFontSize(10);
  doc.text(`Date: ${formatDate(event.date)}`, 14, 40);
  doc.text(`Status: ${event.status}`, 14, 46);
  if (event.description) {
    doc.text(`Description: ${event.description}`, 14, 52);
  }

  // Transactions table
  const tableData = transactions.map(tx => [
    formatDateTime(tx.date),
    tx.bartender || 'N/A',
    tx.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '',
    formatCurrency(tx.total),
  ]);

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);

  doc.autoTable({
    startY: event.description ? 60 : 54,
    head: [['Date/Time', 'Bartender', 'Items', 'Total']],
    body: tableData,
    foot: [['', '', 'Event Total:', formatCurrency(totalAmount)]],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 165, 233] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
  });

  return doc;
}

export function exportAccountStatementToPDF(account, transactions, title = 'Account Statement') {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Account details
  doc.setFontSize(12);
  doc.text(`Account: ${account.name}`, 14, 32);
  doc.setFontSize(10);
  doc.text(`Current Balance: ${formatCurrency(account.balance)}`, 14, 40);

  // Transactions table
  const tableData = transactions.map(tx => [
    formatDateTime(tx.date),
    tx.bartender || 'N/A',
    tx.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '',
    formatCurrency(tx.total),
  ]);

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.total, 0);

  doc.autoTable({
    startY: 48,
    head: [['Date/Time', 'Bartender', 'Items', 'Amount']],
    body: tableData,
    foot: [['', '', 'Total Spent:', formatCurrency(totalSpent)]],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 165, 233] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
  });

  return doc;
}

// ============ EXCEL EXPORTS ============
export function exportTransactionsToExcel(transactions, accounts, filename = 'transactions.xlsx') {
  const data = transactions.map(tx => {
    const account = accounts.find(a => a.id === tx.accountId);
    return {
      'Date/Time': formatDateTime(tx.date),
      'Account': account?.name || 'N/A',
      'Bartender': tx.bartender || 'N/A',
      'Items': tx.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '',
      'Total': tx.total,
    };
  });

  // Add totals row
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);
  data.push({
    'Date/Time': '',
    'Account': '',
    'Bartender': '',
    'Items': 'Grand Total:',
    'Total': totalAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  XLSX.writeFile(workbook, filename);
}

export function exportEventReportToExcel(event, transactions, filename = 'event_report.xlsx') {
  const data = transactions.map(tx => ({
    'Date/Time': formatDateTime(tx.date),
    'Bartender': tx.bartender || 'N/A',
    'Items': tx.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '',
    'Total': tx.total,
  }));

  // Add totals row
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);
  data.push({
    'Date/Time': '',
    'Bartender': '',
    'Items': 'Event Total:',
    'Total': totalAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add event info at top
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['Event Report'],
    ['Event Name:', event.name],
    ['Date:', formatDate(event.date)],
    ['Status:', event.status],
    event.description ? ['Description:', event.description] : [],
    [],
  ], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Event Report');

  XLSX.writeFile(workbook, filename);
}

export function exportAccountStatementToExcel(account, transactions, filename = 'account_statement.xlsx') {
  const data = transactions.map(tx => ({
    'Date/Time': formatDateTime(tx.date),
    'Bartender': tx.bartender || 'N/A',
    'Items': tx.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '',
    'Amount': tx.total,
  }));

  // Add totals row
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.total, 0);
  data.push({
    'Date/Time': '',
    'Bartender': '',
    'Items': 'Total Spent:',
    'Amount': totalSpent,
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add account info at top
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['Account Statement'],
    ['Account:', account.name],
    ['Current Balance:', account.balance],
    [],
  ], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');

  XLSX.writeFile(workbook, filename);
}

// ============ JSON EXPORTS ============
export function downloadJSON(data, filename = 'backup.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
