// Invoice Template System
// Provides multiple professional invoice templates for law firms

const InvoiceTemplates = {
    // Classic Legal Invoice Template - Traditional format
    classic: function(invoice) {
        const firm = invoice.firm || {};
        const firmAddress = [
            firm.address,
            firm.address_line2,
            [firm.city, firm.state, firm.zip_code].filter(Boolean).join(', ')
        ].filter(Boolean).join('\n');

        return `
            <div class="invoice-template-classic">
                <!-- Firm Header -->
                <div class="border-b-2 border-gray-900 pb-6 mb-6">
                    <div class="flex justify-between items-start">
                        <div>
                            ${firm.logo_url ? `<img src="${firm.logo_url}" alt="${firm.firm_name}" class="h-16 mb-3">` : ''}
                            <h1 class="text-3xl font-bold text-gray-900">${firm.firm_name || 'Law Firm Name'}</h1>
                            <div class="text-sm text-gray-600 mt-2 whitespace-pre-line">${firmAddress}</div>
                            ${firm.phone ? `<div class="text-sm text-gray-600">Tel: ${firm.phone}</div>` : ''}
                            ${firm.email ? `<div class="text-sm text-gray-600">Email: ${firm.email}</div>` : ''}
                            ${firm.website ? `<div class="text-sm text-gray-600">${firm.website}</div>` : ''}
                        </div>
                        <div class="text-right">
                            <h2 class="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
                            <div class="text-lg font-semibold text-gray-700">${invoice.invoice_number || `Draft #${invoice.id}`}</div>
                        </div>
                    </div>
                </div>

                <!-- Invoice Info and Client Info -->
                <div class="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">Bill To</h3>
                        <div class="text-base font-semibold text-gray-900">${invoice.client_name}</div>
                        ${invoice.client_email ? `<div class="text-sm text-gray-600">${invoice.client_email}</div>` : ''}
                        ${invoice.client_address_full ? `<div class="text-sm text-gray-600 whitespace-pre-line mt-1">${invoice.client_address_full}</div>` : ''}
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">Invoice Details</h3>
                        <div class="space-y-1 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Issue Date:</span>
                                <span class="font-medium text-gray-900">${this.formatDate(invoice.issue_date)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Due Date:</span>
                                <span class="font-medium text-gray-900">${this.formatDate(invoice.due_date)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Matter:</span>
                                <span class="font-medium text-gray-900">${invoice.matter_number}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Attorney:</span>
                                <span class="font-medium text-gray-900">${invoice.attorney_name || 'Not assigned'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Matter Description -->
                <div class="bg-gray-50 border-l-4 border-gray-900 px-4 py-3 mb-6">
                    <div class="text-sm font-medium text-gray-700">RE: ${invoice.matter_name}</div>
                </div>

                <!-- Line Items -->
                <table class="w-full mb-6">
                    <thead>
                        <tr class="border-b-2 border-gray-900">
                            <th class="text-left py-3 text-sm font-bold text-gray-700 uppercase">Description</th>
                            <th class="text-right py-3 text-sm font-bold text-gray-700 uppercase w-24">Qty/Hours</th>
                            <th class="text-right py-3 text-sm font-bold text-gray-700 uppercase w-32">Rate</th>
                            <th class="text-right py-3 text-sm font-bold text-gray-700 uppercase w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${invoice.line_items.map(item => `
                            <tr>
                                <td class="py-3 text-sm text-gray-900">
                                    ${item.description}
                                    <span class="text-xs text-gray-500 italic ml-2">${item.item_type === 'time' ? 'Legal Services' : 'Expense'}</span>
                                </td>
                                <td class="py-3 text-sm text-gray-900 text-right">${item.quantity.toFixed(2)}</td>
                                <td class="py-3 text-sm text-gray-900 text-right">${this.formatCurrency(item.rate)}</td>
                                <td class="py-3 text-sm text-gray-900 text-right font-medium">${this.formatCurrency(item.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Totals -->
                <div class="flex justify-end mb-8">
                    <div class="w-80">
                        <div class="space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Subtotal:</span>
                                <span class="font-medium text-gray-900">${this.formatCurrency(invoice.subtotal)}</span>
                            </div>
                            ${invoice.tax_rate > 0 ? `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Tax (${(invoice.tax_rate * 100).toFixed(2)}%):</span>
                                    <span class="font-medium text-gray-900">${this.formatCurrency(invoice.tax_amount)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between text-lg font-bold border-t-2 border-gray-900 pt-2">
                                <span>Total Due:</span>
                                <span>${this.formatCurrency(invoice.total_amount)}</span>
                            </div>
                            ${invoice.paid_amount > 0 ? `
                                <div class="border-t pt-2 mt-2">
                                    <div class="flex justify-between text-sm text-green-600">
                                        <span>Paid:</span>
                                        <span class="font-medium">${this.formatCurrency(invoice.paid_amount)}</span>
                                    </div>
                                    <div class="flex justify-between text-base font-bold text-gray-900 mt-1">
                                        <span>Balance Due:</span>
                                        <span>${this.formatCurrency(invoice.total_amount - invoice.paid_amount)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Payment Terms -->
                ${invoice.payment_terms || firm.default_payment_terms ? `
                    <div class="border-t border-gray-300 pt-4 mb-4">
                        <h4 class="text-sm font-bold text-gray-700 uppercase mb-2">Payment Terms</h4>
                        <p class="text-sm text-gray-600">${invoice.payment_terms || firm.default_payment_terms}</p>
                    </div>
                ` : ''}

                <!-- Notes -->
                ${invoice.notes ? `
                    <div class="border-t border-gray-300 pt-4 mb-4">
                        <h4 class="text-sm font-bold text-gray-700 uppercase mb-2">Notes</h4>
                        <p class="text-sm text-gray-600">${invoice.notes}</p>
                    </div>
                ` : ''}

                <!-- Footer -->
                ${firm.invoice_footer ? `
                    <div class="border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
                        ${firm.invoice_footer}
                    </div>
                ` : ''}
                ${firm.tax_id ? `
                    <div class="text-center text-xs text-gray-400 mt-2">
                        Tax ID: ${firm.tax_id}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Modern Legal Invoice Template - Clean contemporary design
    modern: function(invoice) {
        const firm = invoice.firm || {};
        const firmAddress = [
            firm.address,
            firm.address_line2,
            [firm.city, firm.state, firm.zip_code].filter(Boolean).join(', ')
        ].filter(Boolean).join('\n');

        return `
            <div class="invoice-template-modern">
                <!-- Header with colored accent -->
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-t-lg mb-6">
                    <div class="flex justify-between items-start">
                        <div>
                            ${firm.logo_url ? `<img src="${firm.logo_url}" alt="${firm.firm_name}" class="h-12 mb-3 brightness-0 invert">` : ''}
                            <h1 class="text-3xl font-bold">${firm.firm_name || 'Law Firm Name'}</h1>
                            <div class="text-sm text-blue-100 mt-2 whitespace-pre-line">${firmAddress}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-blue-100 uppercase tracking-wide mb-1">Invoice</div>
                            <div class="text-2xl font-bold">${invoice.invoice_number || `Draft #${invoice.id}`}</div>
                        </div>
                    </div>
                </div>

                <!-- Info Cards -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <!-- Client Card -->
                    <div class="bg-gray-50 rounded-lg p-4 col-span-1">
                        <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client</div>
                        <div class="font-semibold text-gray-900">${invoice.client_name}</div>
                        ${invoice.client_email ? `<div class="text-sm text-gray-600 mt-1">${invoice.client_email}</div>` : ''}
                        ${invoice.client_address_full ? `<div class="text-sm text-gray-600 mt-1 whitespace-pre-line">${invoice.client_address_full}</div>` : ''}
                    </div>

                    <!-- Invoice Details Card -->
                    <div class="bg-gray-50 rounded-lg p-4 col-span-1">
                        <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Details</div>
                        <div class="space-y-1 text-sm">
                            <div><span class="text-gray-600">Issue Date:</span> <span class="font-medium">${this.formatDate(invoice.issue_date)}</span></div>
                            <div><span class="text-gray-600">Due Date:</span> <span class="font-medium">${this.formatDate(invoice.due_date)}</span></div>
                            <div><span class="text-gray-600">Matter:</span> <span class="font-medium">${invoice.matter_number}</span></div>
                        </div>
                    </div>

                    <!-- Attorney Card -->
                    <div class="bg-blue-50 rounded-lg p-4 col-span-1">
                        <div class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Attorney</div>
                        <div class="font-semibold text-gray-900">${invoice.attorney_name || 'Not assigned'}</div>
                        ${invoice.attorney_email ? `<div class="text-sm text-gray-600 mt-1">${invoice.attorney_email}</div>` : ''}
                        <div class="text-xs text-blue-600 mt-2">${invoice.matter_name}</div>
                    </div>
                </div>

                <!-- Line Items -->
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Service / Expense</th>
                                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-24">Qty</th>
                                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">Rate</th>
                                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${invoice.line_items.map(item => `
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="px-4 py-3">
                                        <div class="text-sm text-gray-900">${item.description}</div>
                                        <div class="text-xs text-gray-500 mt-0.5">${item.item_type === 'time' ? '⏱ Legal Services' : '📄 Expense'}</div>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-700 text-right">${item.quantity.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-sm text-gray-700 text-right">${this.formatCurrency(item.rate)}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-gray-900 text-right">${this.formatCurrency(item.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Summary Box -->
                <div class="flex justify-end mb-6">
                    <div class="w-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Subtotal</span>
                                <span class="font-medium text-gray-900">${this.formatCurrency(invoice.subtotal)}</span>
                            </div>
                            ${invoice.tax_rate > 0 ? `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Tax (${(invoice.tax_rate * 100).toFixed(2)}%)</span>
                                    <span class="font-medium text-gray-900">${this.formatCurrency(invoice.tax_amount)}</span>
                                </div>
                            ` : ''}
                            <div class="border-t border-gray-300 pt-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-lg font-bold text-gray-900">Total Due</span>
                                    <span class="text-2xl font-bold text-blue-600">${this.formatCurrency(invoice.total_amount)}</span>
                                </div>
                            </div>
                            ${invoice.paid_amount > 0 ? `
                                <div class="border-t border-gray-300 pt-3">
                                    <div class="flex justify-between text-sm text-green-600 mb-2">
                                        <span>Amount Paid</span>
                                        <span class="font-semibold">${this.formatCurrency(invoice.paid_amount)}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="font-bold text-gray-900">Balance Due</span>
                                        <span class="text-xl font-bold text-red-600">${this.formatCurrency(invoice.total_amount - invoice.paid_amount)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Additional Info -->
                <div class="space-y-4">
                    ${invoice.payment_terms || firm.default_payment_terms ? `
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                            <h4 class="text-sm font-semibold text-blue-900 mb-2">💳 Payment Terms</h4>
                            <p class="text-sm text-blue-800">${invoice.payment_terms || firm.default_payment_terms}</p>
                        </div>
                    ` : ''}

                    ${invoice.notes ? `
                        <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                            <h4 class="text-sm font-semibold text-gray-900 mb-2">📝 Notes</h4>
                            <p class="text-sm text-gray-700">${invoice.notes}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="mt-8 pt-6 border-t border-gray-200 text-center">
                    ${firm.invoice_footer ? `<p class="text-sm text-gray-600 mb-2">${firm.invoice_footer}</p>` : ''}
                    <div class="text-xs text-gray-400 space-x-4">
                        ${firm.phone ? `<span>☎ ${firm.phone}</span>` : ''}
                        ${firm.email ? `<span>✉ ${firm.email}</span>` : ''}
                        ${firm.website ? `<span>🌐 ${firm.website}</span>` : ''}
                        ${firm.tax_id ? `<span>Tax ID: ${firm.tax_id}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // Detailed Legal Invoice Template - Comprehensive format with all details
    detailed: function(invoice) {
        const firm = invoice.firm || {};
        const firmAddress = [
            firm.address,
            firm.address_line2,
            [firm.city, firm.state, firm.zip_code].filter(Boolean).join(', ')
        ].filter(Boolean).join(' ');

        // Group line items by type
        const timeEntries = invoice.line_items.filter(item => item.item_type === 'time');
        const expenses = invoice.line_items.filter(item => item.item_type === 'expense');

        const timeTotal = timeEntries.reduce((sum, item) => sum + item.amount, 0);
        const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

        return `
            <div class="invoice-template-detailed">
                <!-- Letterhead -->
                <div class="flex justify-between items-start border-b-4 border-gray-800 pb-4 mb-6">
                    <div class="flex-1">
                        ${firm.logo_url ? `<img src="${firm.logo_url}" alt="${firm.firm_name}" class="h-20 mb-2">` : ''}
                        <h1 class="text-2xl font-bold text-gray-900 mb-1">${firm.firm_name || 'Law Firm Name'}</h1>
                        <div class="text-sm text-gray-600">
                            ${firmAddress}
                            ${firm.phone ? `<div class="mt-1">Tel: ${firm.phone} | Fax: ${firm.phone}</div>` : ''}
                            ${firm.email ? `<div>Email: ${firm.email}</div>` : ''}
                            ${firm.website ? `<div>Web: ${firm.website}</div>` : ''}
                            ${firm.tax_id ? `<div class="mt-1">Tax ID: ${firm.tax_id}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-4xl font-bold text-gray-900 mb-2">INVOICE</div>
                        <div class="text-xl font-semibold text-gray-700">${invoice.invoice_number || `Draft #${invoice.id}`}</div>
                        <div class="mt-4 text-sm">
                            <div class="inline-block px-3 py-1 rounded text-white ${this.getStatusColor(invoice.status)}">${invoice.status.toUpperCase()}</div>
                        </div>
                    </div>
                </div>

                <!-- Header Information Grid -->
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <!-- Left Column -->
                    <div>
                        <div class="bg-gray-100 p-4 rounded mb-4">
                            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Client Information</h3>
                            <div class="font-semibold text-gray-900 text-base">${invoice.client_name}</div>
                            ${invoice.client_email ? `<div class="text-sm text-gray-600 mt-1">${invoice.client_email}</div>` : ''}
                            ${invoice.client_address_full ? `<div class="text-sm text-gray-600 mt-2 whitespace-pre-line">${invoice.client_address_full}</div>` : ''}
                        </div>

                        <div class="bg-blue-50 p-4 rounded">
                            <h3 class="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Responsible Attorney</h3>
                            <div class="font-semibold text-gray-900">${invoice.attorney_name || 'Not assigned'}</div>
                            ${invoice.attorney_email ? `<div class="text-sm text-gray-600 mt-1">${invoice.attorney_email}</div>` : ''}
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div>
                        <div class="bg-gray-100 p-4 rounded mb-4">
                            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Invoice Information</h3>
                            <table class="w-full text-sm">
                                <tr>
                                    <td class="py-1 text-gray-600">Issue Date:</td>
                                    <td class="py-1 text-right font-medium">${this.formatDate(invoice.issue_date)}</td>
                                </tr>
                                <tr>
                                    <td class="py-1 text-gray-600">Due Date:</td>
                                    <td class="py-1 text-right font-medium">${this.formatDate(invoice.due_date)}</td>
                                </tr>
                                <tr>
                                    <td class="py-1 text-gray-600">Invoice Number:</td>
                                    <td class="py-1 text-right font-medium">${invoice.invoice_number || `Draft #${invoice.id}`}</td>
                                </tr>
                            </table>
                        </div>

                        <div class="bg-gray-100 p-4 rounded">
                            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Matter Information</h3>
                            <table class="w-full text-sm">
                                <tr>
                                    <td class="py-1 text-gray-600">Matter Number:</td>
                                    <td class="py-1 text-right font-medium">${invoice.matter_number}</td>
                                </tr>
                                <tr>
                                    <td class="py-1 text-gray-600" colspan="2">Matter Description:</td>
                                </tr>
                                <tr>
                                    <td colspan="2" class="py-1 text-gray-900 font-medium">${invoice.matter_name}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Professional Services (Time Entries) -->
                ${timeEntries.length > 0 ? `
                    <div class="mb-6">
                        <h2 class="text-lg font-bold text-gray-900 bg-gray-200 px-4 py-2 mb-2">Professional Services</h2>
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100">
                                <tr class="border-b border-gray-300">
                                    <th class="text-left px-4 py-2 font-semibold">Description of Services</th>
                                    <th class="text-right px-4 py-2 font-semibold w-20">Hours</th>
                                    <th class="text-right px-4 py-2 font-semibold w-24">Rate</th>
                                    <th class="text-right px-4 py-2 font-semibold w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${timeEntries.map(item => `
                                    <tr class="border-b border-gray-100">
                                        <td class="px-4 py-3 text-gray-900">${item.description}</td>
                                        <td class="px-4 py-3 text-gray-700 text-right">${item.quantity.toFixed(2)}</td>
                                        <td class="px-4 py-3 text-gray-700 text-right">${this.formatCurrency(item.rate)}</td>
                                        <td class="px-4 py-3 text-gray-900 font-medium text-right">${this.formatCurrency(item.amount)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="bg-gray-50 font-semibold">
                                    <td colspan="3" class="px-4 py-2 text-right text-gray-700">Total Professional Services:</td>
                                    <td class="px-4 py-2 text-right text-gray-900">${this.formatCurrency(timeTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <!-- Expenses and Disbursements -->
                ${expenses.length > 0 ? `
                    <div class="mb-6">
                        <h2 class="text-lg font-bold text-gray-900 bg-gray-200 px-4 py-2 mb-2">Expenses & Disbursements</h2>
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100">
                                <tr class="border-b border-gray-300">
                                    <th class="text-left px-4 py-2 font-semibold">Description</th>
                                    <th class="text-right px-4 py-2 font-semibold w-20">Qty</th>
                                    <th class="text-right px-4 py-2 font-semibold w-24">Rate</th>
                                    <th class="text-right px-4 py-2 font-semibold w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expenses.map(item => `
                                    <tr class="border-b border-gray-100">
                                        <td class="px-4 py-3 text-gray-900">${item.description}</td>
                                        <td class="px-4 py-3 text-gray-700 text-right">${item.quantity.toFixed(2)}</td>
                                        <td class="px-4 py-3 text-gray-700 text-right">${this.formatCurrency(item.rate)}</td>
                                        <td class="px-4 py-3 text-gray-900 font-medium text-right">${this.formatCurrency(item.amount)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="bg-gray-50 font-semibold">
                                    <td colspan="3" class="px-4 py-2 text-right text-gray-700">Total Expenses:</td>
                                    <td class="px-4 py-2 text-right text-gray-900">${this.formatCurrency(expenseTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <!-- Summary of Charges -->
                <div class="flex justify-end mb-8">
                    <div class="w-96 border-2 border-gray-300">
                        <div class="bg-gray-800 text-white px-4 py-2">
                            <h3 class="font-bold uppercase tracking-wide">Summary of Charges</h3>
                        </div>
                        <div class="p-4 space-y-2">
                            ${timeEntries.length > 0 ? `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Professional Services</span>
                                    <span class="font-medium text-gray-900">${this.formatCurrency(timeTotal)}</span>
                                </div>
                            ` : ''}
                            ${expenses.length > 0 ? `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Expenses & Disbursements</span>
                                    <span class="font-medium text-gray-900">${this.formatCurrency(expenseTotal)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between text-sm border-t pt-2">
                                <span class="text-gray-700 font-medium">Subtotal</span>
                                <span class="font-semibold text-gray-900">${this.formatCurrency(invoice.subtotal)}</span>
                            </div>
                            ${invoice.tax_rate > 0 ? `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Tax (${(invoice.tax_rate * 100).toFixed(2)}%)</span>
                                    <span class="font-medium text-gray-900">${this.formatCurrency(invoice.tax_amount)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between text-xl font-bold border-t-2 border-gray-800 pt-3 mt-2">
                                <span class="text-gray-900">TOTAL DUE</span>
                                <span class="text-gray-900">${this.formatCurrency(invoice.total_amount)}</span>
                            </div>
                            ${invoice.paid_amount > 0 ? `
                                <div class="border-t-2 pt-3 mt-2">
                                    <div class="flex justify-between text-sm text-green-600 mb-2">
                                        <span>Payments Received</span>
                                        <span class="font-semibold">${this.formatCurrency(invoice.paid_amount)}</span>
                                    </div>
                                    <div class="flex justify-between text-lg font-bold">
                                        <span class="text-red-700">BALANCE DUE</span>
                                        <span class="text-red-700">${this.formatCurrency(invoice.total_amount - invoice.paid_amount)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Terms and Notes Section -->
                <div class="space-y-4 border-t-2 border-gray-300 pt-6">
                    ${invoice.payment_terms || firm.default_payment_terms ? `
                        <div>
                            <h4 class="text-sm font-bold text-gray-900 uppercase mb-2 bg-gray-100 px-3 py-1">Payment Terms & Instructions</h4>
                            <p class="text-sm text-gray-700 px-3">${invoice.payment_terms || firm.default_payment_terms}</p>
                        </div>
                    ` : ''}

                    ${invoice.notes ? `
                        <div>
                            <h4 class="text-sm font-bold text-gray-900 uppercase mb-2 bg-gray-100 px-3 py-1">Additional Notes</h4>
                            <p class="text-sm text-gray-700 px-3">${invoice.notes}</p>
                        </div>
                    ` : ''}

                    ${firm.invoice_footer ? `
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-xs text-gray-600 text-center">${firm.invoice_footer}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>This invoice is considered due and payable upon receipt unless otherwise specified.</p>
                    <p class="mt-1">Questions about this invoice? Contact ${firm.email || 'our office'} or call ${firm.phone || 'us'}.</p>
                </div>
            </div>
        `;
    },

    // Utility functions
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    },

    formatDate: function(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    getStatusColor: function(status) {
        const colors = {
            'draft': 'bg-gray-500',
            'review': 'bg-blue-500',
            'finalized': 'bg-purple-500',
            'sent': 'bg-yellow-500',
            'paid': 'bg-green-500',
            'void': 'bg-red-500'
        };
        return colors[status] || 'bg-gray-500';
    },

    // Render invoice with selected template
    render: function(invoice, templateName = 'classic') {
        const template = this[templateName];
        if (!template) {
            console.error(`Template "${templateName}" not found, using classic`);
            return this.classic(invoice);
        }
        return template.call(this, invoice);
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InvoiceTemplates;
}
