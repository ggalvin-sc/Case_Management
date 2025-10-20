# Quick Test Execution Guide

## Prerequisites

1. **Server must be running:**
   ```bash
   cd backend
   node server.js
   ```
   Server should be running on `https://localhost:3000`

2. **Dependencies installed:**
   ```bash
   npm install
   npx playwright install
   ```

## Quick Commands

### Run All Tests
```bash
npx playwright test
```

### Run Specific Suite
```bash
npx playwright test tests/auth.spec.js
npx playwright test tests/clients.spec.js
npx playwright test tests/matters.spec.js
npx playwright test tests/billing.spec.js
npx playwright test tests/expenses.spec.js
npx playwright test tests/invoices.spec.js
```

### Run with UI (Visual)
```bash
npx playwright test --ui
```

### Run and Watch
```bash
npx playwright test --headed
```

### Generate Report
```bash
npx playwright test
npx playwright show-report
```

## Test Status

```
✅ Authentication (auth.spec.js) - 13 tests
✅ Client Management (clients.spec.js) - 12 tests
✅ Matter Management (matters.spec.js) - 20+ tests
✅ Billing & Time (billing.spec.js) - 15 tests
✅ Expenses (expenses.spec.js) - 12+ tests
✅ Invoices (invoices.spec.js) - 10+ tests
✅ Dashboard (dashboard.spec.js) - 8 tests
✅ Navigation (navigation.spec.js) - 6 tests
✅ Settings (settings.spec.js) - 5+ tests
```

**Total: 100+ comprehensive tests**

## Reports Generated

- **Full Report:** `FRONTEND_E2E_TEST_REPORT.md`
- **Summary:** `FRONTEND_TEST_SUMMARY.md`
- **HTML Report:** Run `npx playwright show-report`

## Issues Fixed

✅ Test configuration updated for HTTPS
✅ SSL certificate handling configured
✅ All test suites verified

## Next Steps

1. Ensure backend server is running
2. Run: `npx playwright test`
3. Review results
4. Check `FRONTEND_TEST_SUMMARY.md` for details

---

**Last Updated:** October 9, 2025
**Framework:** Playwright
**Status:** All tests ready to execute
