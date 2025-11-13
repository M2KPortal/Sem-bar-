# Seminary Bar POS System

A comprehensive Point of Sale system designed for the Seminary Bar at Mount Saint Mary's. This system enables diocese account-based payments, event tracking, inventory management, and detailed reporting.

## Features

### 🔐 User Authentication
- Secure login with access codes
- Role-based access (Bartender and Administrator)
- Session tracking with date/time logging

### 💰 Point of Sale (POS)
- Intuitive product selection with category filtering
- Real-time cart management
- Account or Event-based checkout
- Low balance warnings (configurable threshold)
- Inventory availability checking
- Checkout confirmation modal

### 👥 Account Management
- Diocese and Cash Customer accounts
- View account balances and transaction history
- Add funds to accounts
- Export account statements to PDF/Excel
- Create and manage accounts (Admin only)
- Low balance indicators

### 📦 Inventory Management (Admin Only)
- Add, edit, and delete inventory items
- Category organization
- Price management
- Tracked or unlimited inventory options
- Low stock and out-of-stock warnings
- Real-time inventory updates

### 🎉 Event Management (Admin Only)
- Create and manage events/sessions
- Active event indicator
- All purchases during active event are charged to the event
- Event reports with transaction details
- Export event invoices to PDF/Excel

### 📊 Reports (Admin Only)
- "Tonight's Report" for quick daily summaries
- Custom date range reports
- Revenue analytics by account
- Transaction history with detailed views
- Export to PDF and Excel formats
- Revenue statistics and item counts

### ⚙️ User & Settings Management (Admin Only)
- Add/edit/remove bartenders and admins
- Configure access codes
- Adjust low balance warning threshold
- Data backup and restore (JSON export/import)

## Technology Stack

- **Frontend**: React 18
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Database**: IndexedDB (via idb library)
- **Icons**: Lucide React
- **PDF Export**: jsPDF with jsPDF-AutoTable
- **Excel Export**: SheetJS (xlsx)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Sem-bar-
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

For testing purposes, the system includes default users:

- **Admin**:
  - Code: `admin123`
  - Full access to all features

- **Bartenders**:
  - Code: `bar001` (User: John)
  - Code: `bar002` (User: Mary)
  - Limited to POS and Accounts tabs

## Default Data

The system includes sample data for testing:

### Diocese Accounts:
1. Archdiocese of Baltimore - $500
2. Diocese of Washington DC - $450
3. Diocese of Hartford - $300
4. Archdiocese of Oklahoma City - $250
5. Diocese of Fall River - $400
6. Cash Customer - $0

### Sample Inventory:
- Beer (Keg) - $3.00 (Unlimited)
- Wine (Red) - $5.00
- Wine (White) - $5.00
- Soda - $1.50
- Water - $1.00
- Whiskey Shot - $6.00
- Vodka Shot - $6.00
- Rum Shot - $6.00
- Chips - $2.00
- Pretzels - $2.00

## Usage Guide

### For Bartenders:

1. **Login**: Enter your bartender code and the current date
2. **Making Sales**:
   - Navigate to the POS tab
   - Select items by clicking on product buttons
   - Choose the customer's account from the dropdown
   - Review cart and click "Checkout"
   - Confirm the purchase
3. **Viewing Accounts**: Check account balances and transaction history in the Accounts tab

### For Administrators:

All bartender features, plus:

1. **Managing Inventory**:
   - Add new products with prices
   - Set inventory tracking (tracked or unlimited)
   - Update stock quantities
   - Remove discontinued items

2. **Creating Events**:
   - Create an event session
   - All purchases are automatically charged to the active event
   - End the event when finished
   - Generate and export event reports

3. **Running Reports**:
   - View tonight's summary or custom date ranges
   - Export detailed reports to PDF or Excel
   - Analyze revenue by account
   - Track bartender activity

4. **Managing Users**:
   - Add/edit/remove bartenders and admins
   - Set custom access codes
   - Adjust system settings

5. **Data Backup**:
   - Export all data as JSON for backup
   - Import data from previous backups

## Offline Functionality

The app works completely offline using IndexedDB for data storage. All data is stored locally in the browser. For backup:

1. Go to User Management tab (Admin)
2. Click "Export Backup" to download a JSON file
3. Store the backup file safely
4. Import the backup when needed using "Import Backup"

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Deployment

### GitHub Pages

1. Update `package.json` homepage field if needed
2. Build the project: `npm run build`
3. Deploy the `build` folder to GitHub Pages

### Other Hosting

Upload the contents of the `build` folder to any static hosting service (Netlify, Vercel, etc.)

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with IndexedDB support

## Data Persistence

All data is stored locally in the browser's IndexedDB. Data persists between sessions but is tied to the specific browser/device. Regular backups are recommended.

## Support

For issues or questions, please contact the system administrator or create an issue in the repository.

## License

This project is proprietary software created for Mount Saint Mary's Seminary Bar.
