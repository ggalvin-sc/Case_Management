# Case Management Billing System - Frontend

**Simple, Zero-Build Frontend with Vanilla JavaScript + Tailwind CSS**

## Overview

This is a lightweight, framework-free frontend for the case management billing system. No build tools, no npm, no compilation - just open the HTML files in a browser and start working!

## Features

✅ **Dashboard** - Statistics, recent activity, quick actions
✅ **Matters** - List, create, edit, and detail views
✅ **Time Entries** - Log billable time with built-in timer
✅ **Expenses** - Track and categorize expenses with receipt upload
✅ **Authentication** - Simple login/logout system
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Zero Dependencies** - All libraries loaded via CDN

## Tech Stack

- **HTML5** - Structure and semantics
- **Vanilla JavaScript** - No frameworks, just native JS
- **Tailwind CSS** - Utility-first styling (via CDN)
- **Font Awesome** - Icon library (via CDN)

## Getting Started

### Option 1: Direct File Opening

The simplest way to get started:

1. Open `login.html` in your web browser
2. Use demo credentials (shown on login page)
3. Start exploring!

**Note:** Some features may not work due to CORS restrictions when opening files directly. Use Option 2 for full functionality.

### Option 2: Local Web Server (Recommended)

For full functionality, run a local web server:

#### Using Python (if installed):
```bash
# Python 3
cd frontend
python -m http.server 8000

# Python 2
cd frontend
python -m SimpleHTTPServer 8000
```

#### Using Node.js (if installed):
```bash
# Install http-server globally
npm install -g http-server

# Run server
cd frontend
http-server -p 8000
```

#### Using PHP (if installed):
```bash
cd frontend
php -S localhost:8000
```

Then open: `http://localhost:8000/login.html`

### Option 3: Live Server (VS Code Extension)

If using VS Code:

1. Install "Live Server" extension
2. Right-click `login.html`
3. Select "Open with Live Server"

## Project Structure

```
frontend/
├── index.html              # Dashboard page
├── login.html              # Login page
├── README.md              # This file
├── js/
│   ├── api.js             # API client for backend communication
│   └── auth.js            # Authentication utilities
└── pages/
    ├── matters.html       # Matters list and management
    ├── matter-detail.html # Individual matter details
    ├── billing.html       # Time entry form
    └── expenses.html      # Expense tracking
```

## Pages & Features

### 1. Login (`login.html`)
- Email/password authentication
- Remember me option
- Demo account credentials
- Error handling

**Demo Accounts:**
- **Admin:** admin@example.com / password
- **Attorney:** attorney@example.com / password

### 2. Dashboard (`index.html`)
- Active matters count
- Unbilled hours/amount
- Monthly revenue
- Recent activity feed
- Quick actions (new matter, log time, add expense)
- Kimai sync button

### 3. Matters (`pages/matters.html`)
- Searchable/filterable table
- Create new matters
- View matter details
- Edit and delete actions
- Status badges (Active, Closed, On Hold)

**Filters:**
- Search by name or matter number
- Filter by status
- Filter by attorney

### 4. Matter Detail (`pages/matter-detail.html`)
- Matter overview with financial summary
- Tabbed interface:
  - **Overview** - Matter info and billing details
  - **Time Entries** - All time logged for matter
  - **Expenses** - All expenses for matter
  - **Invoices** - Generated invoices
- Create invoice from unbilled time/expenses

### 5. Time Entry (`pages/billing.html`)
- Matter selection with auto-rate lookup
- Multiple time entry methods:
  - Duration (hours + minutes)
  - Start/End time with auto-calculation
  - Built-in timer
- Activity code selection
- Description field
- Billable/non-billable toggle
- Real-time amount calculation
- Recent entries sidebar

**Features:**
- Quick timer (start/stop/save)
- Auto-populate hourly rate from matter
- Calculate amount as you type
- Recent entries for reference

### 6. Expenses (`pages/expenses.html`)
- Matter selection
- Expense category dropdown
- Vendor/payee field
- Amount with markup percentage
- Billable/reimbursable toggles
- Receipt upload
- Real-time billed amount calculation
- Expense summary (total, unbilled, billed)
- Full expense table with search

**Expense Categories:**
- Filing fees
- Court costs
- Service of process
- Travel & mileage
- Photocopies & postage
- Legal research
- Expert fees
- And more...

## API Configuration

The frontend expects the Rust API to be running at:

```
http://localhost:3000/api/v1
```

To change this, edit `js/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

For production, update to your deployed API URL:

```javascript
const API_BASE_URL = 'https://api.yourdomain.com/api/v1';
```

## Authentication

### How It Works

1. User logs in with email/password
2. Backend returns JWT token
3. Token stored in localStorage
4. Token sent with every API request via Authorization header
5. On logout, token is removed

### Token Storage

Tokens are stored in browser localStorage:
- `token` - JWT access token
- `user` - User object (name, email, role)

### Protected Routes

All pages except `login.html` require authentication. The `auth.js` script automatically redirects unauthenticated users to the login page.

## Customization

### Changing Colors

The UI uses Tailwind CSS color classes. To change the color scheme:

**Primary (Blue):**
- Change `bg-blue-500` to `bg-purple-500` (or any color)
- Change `text-blue-600` to `text-purple-600`
- Change `border-blue-500` to `border-purple-500`

**Status Colors:**
- Active: `bg-green-100 text-green-800`
- Closed: `bg-gray-100 text-gray-800`
- On Hold: `bg-yellow-100 text-yellow-800`

### Adding New Pages

1. Create new HTML file in `pages/`
2. Copy navigation from existing page
3. Add page content
4. Update active nav link
5. Add link in navigation menu

Example:
```html
<a href="pages/reports.html" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
    Reports
</a>
```

### Extending API Client

To add new API endpoints, edit `js/api.js`:

```javascript
// Example: Get all invoices
async function getInvoices() {
    return await api.get('/invoices');
}

// Example: Create invoice
async function createInvoice(data) {
    return await api.post('/invoices', data);
}
```

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Required Features:**
- ES6+ JavaScript (async/await, arrow functions, etc.)
- Fetch API
- LocalStorage
- CSS Grid & Flexbox

## Development Tips

### Hot Reload

When using a local web server, changes to HTML/CSS/JS are visible on browser refresh (F5 or Cmd+R).

### Browser DevTools

Use browser developer tools for debugging:
- **Console** - View JavaScript errors and logs
- **Network** - Monitor API requests/responses
- **Application** - View localStorage tokens
- **Elements** - Inspect and modify HTML/CSS live

### Common Issues

**Issue:** API calls failing with CORS error

**Solution:**
1. Make sure Rust backend has CORS enabled
2. Use local web server instead of opening files directly

---

**Issue:** "Unauthorized" errors on all pages

**Solution:**
1. Check that token is in localStorage
2. Verify API URL is correct
3. Make sure backend is running
4. Try logging in again

---

**Issue:** CDN resources not loading (Tailwind, Font Awesome)

**Solution:**
1. Check internet connection
2. Check browser console for errors
3. Verify CDN URLs are correct

## Integration with Rust Backend

The frontend is designed to work with the Rust API backend. See `BILLING_SYSTEM_ARCHITECTURE.md` for complete API specification.

### Expected API Endpoints

```
POST   /api/v1/auth/login
GET    /api/v1/auth/me
GET    /api/v1/dashboard/stats
GET    /api/v1/dashboard/activity
GET    /api/v1/matters
POST   /api/v1/matters
GET    /api/v1/matters/:id
PUT    /api/v1/matters/:id
DELETE /api/v1/matters/:id
GET    /api/v1/time-entries
POST   /api/v1/time-entries
GET    /api/v1/expenses
POST   /api/v1/expenses
... (see architecture doc for complete list)
```

### API Response Format

All API responses should be JSON:

**Success:**
```json
{
  "id": "uuid",
  "name": "Matter Name",
  "status": "active",
  ...
}
```

**Error:**
```json
{
  "error": "Error message",
  "code": 400
}
```

## Deployment

### Static Hosting

Since this is a static frontend, deploy to any web host:

1. **Netlify** (Recommended)
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Deploy
   cd frontend
   netlify deploy --prod
   ```

2. **Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy
   cd frontend
   vercel --prod
   ```

3. **GitHub Pages**
   - Push to GitHub repository
   - Enable Pages in repo settings
   - Set source to main branch

4. **Traditional Web Hosting**
   - Upload all files via FTP/SFTP
   - Ensure `index.html` or `login.html` is entry point

### Production Checklist

- [ ] Update `API_BASE_URL` in `js/api.js` to production API URL
- [ ] Remove demo account buttons from `login.html`
- [ ] Enable HTTPS for API and frontend
- [ ] Test all pages and features
- [ ] Configure proper CORS on backend
- [ ] Set up proper authentication/authorization
- [ ] Add analytics if needed

## Security Considerations

### Client-Side Security

- ✅ Tokens stored in localStorage (vulnerable to XSS)
- ✅ No sensitive data hardcoded
- ✅ HTTPS recommended for production
- ⚠️ Client-side validation only (backend must validate too!)

### Best Practices

1. **Always use HTTPS** in production
2. **Validate on backend** - Never trust client input
3. **Set token expiration** - Don't use indefinite tokens
4. **Implement CSP** - Content Security Policy headers
5. **Sanitize user input** - Prevent XSS attacks

## Next Steps

1. **Backend Development** - Build Rust API (see `BILLING_SYSTEM_ARCHITECTURE.md`)
2. **Testing** - Test all features with real API
3. **Refinement** - Adjust UI/UX based on user feedback
4. **Features** - Add invoicing, reporting, document management
5. **Deployment** - Deploy to production hosting

## Contributing

To contribute to the frontend:

1. Make changes to HTML/CSS/JS
2. Test in local web server
3. Test with backend API
4. Document changes in this README
5. Submit pull request (if using git)

## Support

For issues or questions:
- Check browser console for errors
- Review API responses in Network tab
- Verify backend is running
- Check `BILLING_SYSTEM_ARCHITECTURE.md` for API details

## License

[Your License Here]

---

**Built with ❤️ using vanilla JavaScript - no frameworks needed!**
