# QuickAccounts — Complete UX Flows and Screen Map

Version 2.0 · 08 October 2026  
Status: Revised frontend design specification; no application-code implementation is claimed.  
Scope: Retailers and wholesalers, with multiple outlets, optional warehouses, warranty, repairs and accounting.  
Theme: To be supplied later. This specification defines structure, interaction and behavior.

## 1. Decision: 9 main ERP screens; 10 including access

Build **9 business workspaces plus 1 access screen**. First-time company setup is a guided mode of Settings, so it does not add a separate page. This is the recommended practical minimum for this ERP's scope, rather than a theoretical minimum obtained by putting everything into one page.

The earlier plan treated many selectors, forms, tabs, stages and success messages as separate screens. In this revision these become reusable views inside the workspaces below. This revision supersedes the navigation and separate-screen counts in the earlier UX documents; their business requirements remain covered here.

What the count means:

- **Primary screen:** a distinct top-level page template with its own purpose and URL.
- **Tab/view:** another dataset or task within the same workspace.
- **Editor mode:** a full-width editing area inside that workspace for long tasks, including POS and bulk stock work.
- **Panel:** short record details, a picker, payment or another contextual task.
- **Result state:** a summary in the same editor after the server confirms completion.

There will be more than 10 visual states. Those states reuse layouts and domain components rather than becoming separately designed pages. Mobile may display a panel full-screen; it remains the same component.

| ID | Primary screen | Navigation purpose | Main views |
|---|---|---|---|
| A01 | Access | Sign in, register, recover access | Login, account creation, password recovery, invitation, approval status |
| W01 | Home | Decide what needs doing | Role dashboard, tasks, approvals, alerts |
| W02 | Sales | Sell and manage sales documents | Sell, invoices, quotes/orders |
| W03 | Purchases | Order, receive and record supplier bills | Orders, receiving, bills |
| W04 | Stock | Know and move stock | Stock, products, transfers, stock checks, activity |
| W05 | Returns & Warranty | Resolve customer and supplier cases | Customers, suppliers, repairs |
| W06 | Money | Record money and manage accounts | Activity, cash/bank, business accounts, staff pay |
| W07 | Contacts | Maintain parties and their history | Customers, suppliers, staff |
| W08 | Reports | Answer business questions | Saved reports, report selector, filtered result |
| W09 | Settings | Set up and configure company operations | First-time setup; business, locations, team, rules, data |

The sidebar contains only W01–W09. Each role sees only relevant workspaces and permitted actions. A cashier usually sees Home, Sales, Contacts and Returns & Warranty. A single-shop business automatically uses its only outlet.

## 2. Common interaction model

### 2.1 Five reusable page layouts

| Layout | Used by | Structure |
|---|---|---|
| Task dashboard | Home | Context, priority actions, a few useful totals, pending tasks |
| Work list with selected record | Invoices, purchases, transfers, contacts, claims | Search/filters, rows, record detail, next action |
| Transaction editor | Sale, receipt, transfer, payment, case action | Context, business inputs, totals/effect summary, action footer |
| Grouped tree with detail | COA and settings | Group navigation, selected detail, action or form |
| Report viewer | Reports | Report selector, parameters, result, drilldown and export |

Do not implement one giant form containing all ERP fields. Share layout, controls and business widgets; retain separate sale, receipt, transfer, claim and payment controllers with their own validation.

### 2.2 Common page sections

1. **Context:** company and location, shown in words.
2. **Title and action:** for example Sales and New Sale.
3. **Views:** generally three to five visible tabs, relevant to the role.
4. **Search/filter row:** party, date, status and location as appropriate.
5. **Working area:** list, editor, tree or report.
6. **Selected-record area:** detail, linked records and available next action.
7. **Result:** document reference, money/stock effects and next actions.

The action label describes the actual outcome: Save Draft, Confirm Sale, Receive 20 Items, Send to Outlet, Approve Credit or Record Refund. Do not label every operation Submit.

### 2.3 Panel and navigation discipline

- Short forms and quick adds use one side panel.
- Long line-item forms, bulk serials and complex case work use full-width editor mode.
- Do not stack modal on modal on modal. A nested selector temporarily replaces panel content and has Back.
- Preserve the underlying list filters and scroll position when a panel closes.
- Give selected records and editor modes a URL state so refresh, browser Back and sharing a permitted internal link work.
- Review is an inline section or compact confirmation, not a mandatory new page for each sale.
- After completion, show the saved document and outcome in the same view.
- Printing opens the print layout. It does not need another navigation screen.
- Scan sounds, icons and colors supplement readable status text.

### 2.4 Access and business activation

Registration, password reset, invitation acceptance, approval pending and rejected/review states are modes of A01. Users joining by invitation do not create another company. Use normal sign-in and company-admin activation; do not add a software-license purchase or activation journey.

The staff management view in W09 handles company staff invitations and approvals. Where platform approval of new company owners is enabled, show the authorized administrator's approval queue as a gated W01 task view. A company owner cannot approve their own platform activation.

## 3. Global company and outlet behavior

### 3.1 Context has three different meanings

| Context | Purpose | Rule |
|---|---|---|
| Company | Security and accounting boundary | Every record/query is authorized for this company |
| Viewing location | A filter for lists/reports | All Locations is allowed if permitted |
| Transaction location | Where the actual business operation occurs | Required explicitly; a filter alone cannot change it |

All Locations is never a physical source, destination or cash drawer. Company-wide bank transactions and shared expenses can use the explicit Company / Central Office scope where permitted.

Use a visible label such as “Selling from: Outlet DHA” or “Receiving at: Main Warehouse”. A selected outlet is a default, not hidden authorization.

### 3.2 Switching safely

- Before starting work, default to the user's assigned location. Do not ask on every transaction if there is only one choice.
- During a draft, changing location requires saving that draft or discarding it deliberately. Never silently move an existing cart or serial list to a different outlet.
- Posted documents retain their original outlet when the global viewing filter changes.
- Switching companies cancels obsolete requests and removes previous company data from view.
- Switching outlets updates location-scoped queries. Cached data may be reused only under the correct company/site key.
- An owner opening an Outlet B invoice while viewing Outlet A sees “Document: Outlet B”; the document is not relabeled.
- A warehouse is non-selling by default. An optional direct-wholesale configuration must be explicit and authorized.

### 3.3 Dimensions visible in the relevant forms

| Operation | Show before confirmation |
|---|---|
| Sale | Selling outlet, stock source, cashier, payment account |
| Receipt | Supplier, receiving site/location, actual received quantity |
| Transfer | From, To, dispatched, received, unresolved difference |
| Customer warranty | Original selling outlet, intake outlet, issuing/refunding outlet |
| Supplier warranty | Supplier, faulty-goods source, physical receipt destination |
| Payment | Party/document, payment account, collection/payment location |
| Expense | Expense category, responsible outlet or company, payment source |
| Stock count | Counted site/location, count date, observed quantities |
| Report | Included outlets, date/period, currency and measure definition |

An Outlet B cashier may accept an Outlet A return only if company policy and permissions allow it. The original sale stays attributed to A; custody is at B; replacement stock/refund cash come from the explicitly selected authorized site/account.

Customer and supplier masters are company-wide. A location-filtered statement is labeled as a filtered view, not the person's complete company balance. Full balances remain permission-controlled.

## 4. Detailed primary screens

### A01 — Access

**Users:** all users.

**Sections:** identity, sign-in form, recovery link, create-account option, language/help, pending-approval state if applicable.

**Behavior:** returning users go directly to their last permitted workspace. Use a company selector only for multi-company users. Distinguish Create Business from Join Existing Business. Invalid credentials retain the identifier but never expose another account's existence unnecessarily.

**Result:** active users enter Home; new owners open Settings in setup mode when allowed; pending users see their actual approval state.

### W01 — Home

**Users:** all roles, with scoped content.

**Sections:** active location; three to six frequent action cards; up to four initial business summaries; prioritized work queue; recent activity.

| Role | Default actions and queues |
|---|---|
| Owner | Sell, buy, receive/pay money; balances, overdue tasks, location comparison |
| Cashier | Sell, collect payment, check return; own outlet drafts and pickups |
| Warehouse operator | Receive stock, send stock, receive returns; arrivals and transfer requests |
| Warranty officer | Scan item, open cases, supplier follow-up, customer handovers |
| Technician | Assigned jobs, record work, request inspection |
| Accountant | Collections, payments, accounts, reconciliation, financial reports |

This is one dashboard component with role-specific data. Approvals and alerts are queues; selecting a task opens its source document or action panel.

Avoid showing stock units, money totals, expected replacements and customer custody as interchangeable totals.

### W02 — Sales

**Views:** Sell, Invoices, Quotes & Orders.

**Sell editor, all in one working view:**

| Section | Visible fields/actions |
|---|---|
| Context | Outlet, cashier, date; stock source is visible |
| Customer | Search existing / Walk-in / quick add; required for credit |
| Items | Scan/search, quantity, price, permitted discount, available stock |
| Serial identity | Per-line required/selected count, scan/paste action |
| Warranty | Effective duration and policy preview per product; preset terms |
| Payment | Paid now, Pay later, Part paid; Cash/Bank/split within it |
| Summary | Items, tax, total, money applied, change, still owed |
| Footer | Save Draft, Confirm Sale |

Typing/scanning adds to the cart without a separate product-selection page. Serial entry is a focused panel attached to its line. Search a new customer and quick-add without losing the cart.

Cash amount tendered and change are distinct from the amount applied to the invoice. A bank payment requires the real permitted bank account. Named-customer credit requires due date and any credit-limit approval.

**Invoice view:** searchable table with invoice/date/outlet/customer/total/paid/remaining/status. A row opens DocumentInspector: items, serials, payments, warranty, stock effects and history. Actions include Collect Payment, Return Item, Print and permitted correction.

**Quotes & Orders:** same line editor with order behavior. Confirmation may reserve stock; actual delivery records the issue. Partial delivery and remaining order quantity are visible. An invoice/payment must not issue stock a second time after delivery. The backend decides valid delivery/invoicing rules.

**Save result:** remain on the saved invoice. Show outlet, received amount, still owed, stock issued and Print/New Sale. No standalone success page.

### W03 — Purchases

**Views:** Orders, Receiving, Bills.

**Sections shared across the views:** supplier, date/status filters, document list, selected-record inspector, context-sensitive next action.

| Editor mode | Main fields | Physical/financial result shown |
|---|---|---|
| New Order | Supplier, products, quantities/costs, warranty terms, expected date, destination, credit terms | Ordered and expected; nothing yet received |
| Receive Stock | Order or direct receipt, destination, delivery reference, actual quantities, condition | Physically received; accepted/restricted breakdown |
| Register Serials | Receipt line, serial counts, scan/paste/CSV, validation rows | Units identified; stock quantity unchanged |
| Supplier Bill | Supplier invoice number/date, matched receipts, tax/amounts, due date | Amount now owed; stock not added again |
| Return to Supplier | Linked receipt/bill, items, quantity/serials, reason, settlement intention | Starts linked purchase-return case in W05 |

For a simple purchase already delivered, offer **Record Purchase** using a compact editor containing receipt, supplier bill and optional payment sections. On confirmation the backend creates distinct linked records. If orchestration is not available, show each actual checkpoint and its status; never claim the whole purchase completed after only saving a bill.

Receiving captures all physically arrived units, including damaged ones held for inspection. Label expected, arrived, accepted, held and rejected/returned clearly; do not let an ambiguous “rejected” field hide custody.

**Bulk serial work:** receipt/product is fixed, counts update, leading zeros are preserved, duplicate rows are visible. Registering serials cannot increase stock. A validation preview makes batch policy explicit: default all-or-nothing confirmation; if partial import is supported, user deliberately selects valid rows and sees unresolved rows retained.

A receipt link is verified provenance only with evidence that those units came from that receipt. Never infer an exact supplier invoice simply from cost allocation or “oldest stock”.

### W04 — Stock

**Views:** Stock, Products, Transfers, Stock Checks, Activity.

This replaces separate pages for each warehouse, outlet, condition, movement and transfer stage.

**Stock view:** search, location, condition and ownership filters; available/reserved/on-hand quantities; low-stock actions; record inspector.

**Stock measure presets:**

- Available to Sell: owned sellable stock minus reservations.
- Needs Attention: inspection, faulty and repair stock.
- Customer Items Held: customer-owned goods in custody.
- In Transit / With Supplier: custody outside the site.
- Supplier Replacements Expected: approved but not yet received.

Expected replacements are an operational queue, never part of physical on-hand. Customer custody is never automatically valued as company inventory.

**Products view:** list, quick create/edit, prices, UOM, tracking policy, warranty policy, stock by site and event history. Serial lookup opens the shared UnitHistory, with product disambiguation if the same serial text exists under different products.

**Transfers view:** one transfer record evolves through request, approval, picking, dispatch, partial receipt and discrepancy. The next action updates according to status and role; no page per status.

**Stock Checks:** open a count session for a location, enter observed quantities/serials, review differences, request approval and post the authorized adjustment. Direct balance editing is unavailable.

**Activity:** date/product/location/source filters and source-document links. Packing, cleaning, repair holding and restock are traceable internal movements or service actions.

### W05 — Returns & Warranty

**Views:** Customers, Suppliers, Repairs. Visible heading/subheading identifies who is receiving the benefit: “Customer returns to us” versus “We return to supplier”.

**Top sections:** prominent Scan Serial / Find Invoice / Find Return Slip input; New Case; open work filters; queue; selected case workspace.

**Case workspace sections:**

1. Product/quantity/serial, party and originating transaction.
2. Original sale or purchase evidence; replacement history.
3. Current location and ownership.
4. Verification result and warranty entitlement.
5. Resolution per unit/quantity.
6. Money/credit status.
7. Supplier recovery links or repair job.
8. Attachments, timeline and next action.

For complex mixed claims use a full-width case view with a left case-item list and selected-item details. Do not squeeze 100 serials or several resolutions into a small modal.

**Customer modes:** ordinary return, warranty, replacement-again, repair, rejected pickup. One case can reject two units, refund three and replace five. Each unit's result is independent. Returned stock goes into inspection/restricted holding until ownership and condition permit restocking.

**Supplier modes:** purchase return, warranty claim, faulty goods dispatch, supplier acknowledgment, partial decision, expected replacement, physical receipt, QA, supplier bill back, rejected-original return, final reconciliation.

**Repair modes:** company-owned stock repair and customer-owned repair. Assign technician, diagnose, consume parts, record costs/work, inspect and select restock / return to customer / further repair / scrap.

Show three independent indicators: **Customer resolution**, **Goods location**, **Supplier recovery**. A customer can be resolved while supplier recovery remains open. A financial credit does not prove faulty goods have physically left or replacements have arrived.

**Primary next-action examples:** Verify Item, Give Replacement, Approve Credit, Record Refund, Send to Supplier, Receive 5 Items, Inspect Arrival, Record Customer Pickup.

### W06 — Money

**Views:** Activity, Cash & Bank, Business Accounts, Staff Pay.

**Always-visible permitted actions:** Receive Money, Pay Money, Move Money.

| Mode | Ask only for | Result |
|---|---|---|
| Collect customer payment | Customer/open invoices, amount, cash/bank, date/reference | Invoice balances reduce; no new sale |
| Pay supplier | Supplier/open bills, amount, payment account | Payables reduce |
| Pay expense | Friendly category, amount, location, paid now/later, attachment | Expense/payment or payable recorded |
| Customer refund | Posted customer credit, permitted amount, account, proof | Actual payout tracked |
| Supplier refund | Recognized supplier credit, actual received amount/account | Actual inflow tracked |
| Move money | From, To, amount/date, separately stated fee if any | Transfer; fee handled as a separate expense when applicable |
| Owner investment/withdrawal | Intent, account, amount, date | Correct ownership-finance flow through server rules |

**Activity:** one chronological list with simple transaction labels. Cashbook, bankbook, daybook and journal are named view presets over the appropriate data; they must not be summed together as additional transactions.

**Cash & Bank:** configured accounts and balances; selected account shows movement history and manual bank-statement matching/reconciliation. Statement matching matches or creates one authorized transaction, never records an already-posted receipt twice. Automated bank feeds remain outside the initial scope.

**Business Accounts:** standardized group tree, search, add account inside group, account activity, mappings and accountant tools. See section 7.

**Staff Pay:** basic salary run, allowances/deductions, advances, payable summary, approval and payment; current FRD's basic scope only. Paying an accrued salary settles the payable; UI cannot record the expense again. Staff permission is separate from contact access.

### W07 — Contacts

**Views:** Customers, Suppliers, Staff.

**Sections:** search/filter, directory rows/cards, selected profile, linked actions.

Customer/supplier profiles share identity/contact/address fields and a detail layout. Their balances and actions remain role-specific: Receive Payment for a customer, Pay Supplier for a supplier.

**Profile content:** overview, amount owed/available credit, related invoices or bills, payments, return/warranty cases, attachments and timeline. These are sections or tabs inside the inspector, not standalone navigation destinations.

A person/company may have both customer and supplier roles; do not silently offset their balances or invent two incompatible identities.

**Staff profile:** employee details, work location, salary/advance summary if permitted and technician assignment. A staff record is not automatically a login account. Login access and role grants belong in W09.

Quick-add from a sale/purchase uses the same PartyPicker form and returns the selected new record to the original draft.

### W08 — Reports

One report browser and renderer covers the report family.

**Sections:** plain-language question selector; report-specific parameter controls; location/date scope; result table/chart; source drilldown; print/export.

| Question group | Reports available |
|---|---|
| What did we sell or buy? | Sales, purchases, cash/credit mix, party/product totals, outlet comparison |
| What stock do we have? | Stock sheet, movement, valuation, low stock, warehouse/outlet comparison, dead stock |
| Who owes money? | Customer/vendor statements, ageing, credits and advances |
| What is happening with returns? | Customer/supplier cases, pending replacements, off-site goods, repeat failures, repairs |
| How is the business doing? | P&L, Balance Sheet, Trial Balance, Cash Flow, cashbook/daybook |
| What needs investigation? | Discrepancies, audit history, missing references, uncollected items |

Different reports have dedicated columns and calculations inside the shared renderer. A common UI does not mean a single generic query can calculate every report.

Label owner/company totals and filtered management views correctly. Outlet P&L states how shared expenses are allocated. Do not imply every isolated outlet view is a separately balanced legal-entity statement. Source links respect site permissions even from consolidated reports.

### W09 — Settings

**Sections:** Business, Locations, Team, Rules, Data.

| Section | Included tasks |
|---|---|
| Business | Company profile, country/currency/year, language, invoice branding, document templates |
| Locations | Outlets/warehouses/repair areas, internal locations, primary outlet, cash-drawer assignment |
| Team | Users, invitations, company roles, site scope, revocation and approvals |
| Rules | Warranty templates/versions, serial policy, taxes, document numbering, workflow approvals, notifications |
| Data | Import preview/mapping, exports/jobs, audit log, retention/backup status and authorized recovery requests |

Money account configuration and financial closing use W06 components. Settings links directly to the relevant W06 view instead of duplicating the form.

Global search, task notification panels, document attachments, import progress, and print previews are shared components. No separate page is needed for each one.

#### First-time setup mode — reuse Settings

**Users:** owner or authorized setup administrator. The same Settings page opens with four collapsible sections and saved progress.

| Section | Fields/defaults | Completion |
|---|---|---|
| Business | Name, country, currency, timezone, financial year, owner details | Save business identity |
| Locations | Primary outlet, optional warehouse, further outlets | Seed internal receiving/sellable/holding locations |
| Money and tax | Standard Retail & Wholesale account template, actual cash/bank details, tax configuration | Seed accounts; identify missing setup |
| Readiness | Team invitations, opening stock/balances, optional imports, review | Show what is ready and what still needs attention |

Start with one primary outlet. With no warehouse, purchase receiving defaults there. With a warehouse, default to warehouse receiving. Adding another outlet uses the same location form in W09.

The account template is preselected and previewable. A sample bank account is not a usable real bank account until configured. Country/tax settings are returned by the backend; do not embed a universal tax rate.

Opening data and team setup can continue later through Home tasks. Block only operations whose specific prerequisites remain missing. No mandatory tour with many “Next” screens.

## 5. Named reusable component inventory

These are business-level components and patterns; basic buttons, inputs, menus, tabs and accessible dialogs come from the chosen UI kit. Count shared behavior rather than treating every label or icon as a custom component.

| ID | Component | Responsibility | Main consumers |
|---|---|---|---|
| C01 | AppShell | Navigation, header, responsive frame, account/help menu | All workspaces |
| C02 | CompanyLocationContext | Company boundary, viewing location, transaction-site selection | All operational views |
| C03 | GlobalLookup | Search product, serial, party, invoice, slip; scoped results | Header, Sales, Stock, Returns |
| C04 | WorkspaceHeader | Title, context, tabs, primary action, saved views | All workspaces |
| C05 | RecordTable | Search, filters, cursor paging, authorized actions, mobile rows | All lists |
| C06 | DocumentInspector | Read-only source record, references, next actions and history | Invoices, bills, transfers, credits |
| C07 | EditorFrame | Draft state, inline review, sticky totals/actions, save result | All long forms |
| C08 | TaskPanel | Short action form, dialog focus, mobile full-screen form | Payments, quick add, approvals |
| C09 | PartyPicker | Existing party, permitted quick add, role and balance context | Sales, Purchases, Money, Returns |
| C10 | ProductPicker | Scan/search with SKU, unit, price and location availability | Sale, receipt, transfer, case |
| C11 | LineItemsEditor | Product rows, quantities, discounts/tax displays, row errors | Sale, purchase, transfer, bill |
| C12 | SerialCapture | Scan/paste/CSV/manual, counts, duplicates, product/receipt binding | Receipt, sale, warranty, transfers |
| C13 | StockContext | Source/destination, ownership, condition, availability | Stock-impacting commands |
| C14 | SettlementEditor | Direction, approved value, payment account, split, allocation, remaining | Sale, payment, customer/supplier bill back |
| C15 | AllocationPicker | Select open invoice/bill/credit and apply exact amount | Collections, payments, credits |
| C16 | CaseWorkbench | Linked customer/supplier/repair case with separate state dimensions | Returns & Warranty |
| C17 | UnitHistory | Original issue, replacement chain, provenance and current entitlement | Global lookup, Stock, cases |
| C18 | QuantityProgress | Ordered/sent/arrived/accepted/pending with definitions | Purchases, transfers, supplier cases |
| C19 | ReviewAndApproval | Plain action summary, thresholds, decision and reason | Refund, adjustment, scrap, period tasks |
| C20 | AttachmentsAndNotes | Evidence, notes, upload status and authorized access | All documents/cases |
| C21 | ActivityTimeline | Append-only business events with source links | Documents, unit/party history |
| C22 | AccountGroupTree | Friendly COA groups, leaf details, mappings and add account | Money and setup preview |
| C23 | AccountSelector | Permitted real cash/bank or eligible expense/account selection | Payments, expenses, setup |
| C24 | ReportViewer | Typed parameters, table/chart, source links and export | All reports |
| C25 | ImportExportPanel | Mapping, dry-run, row errors, job/result, file links | Products, parties, serials, openings |
| C26 | PrintDocument | Versioned invoice/slip/statement/receipt/transfer render | All printable records |
| C27 | TaskQueue | Tasks/alerts/approvals sorted by age/urgency/role | Home and document badges |
| C28 | StateFeedback | Loading/empty/error/conflict/unknown-result/result summaries | Every query/mutation |

### 5.1 Shared foundation services

- Permission policy and allowed-action resolver: route, action and field scope; backend remains authoritative.
- Company-aware API adapter and query keys including site/filter dimensions.
- Money and quantity controls preserving decimal strings; server owns authoritative totals and journals.
- Draft manager with explicit server/draft IDs and stable company/site context.
- Mutation coordinator with stable idempotency key, pending/unknown states and authorized retries.
- URL-state serializer for views, selected records and editor mode.
- Locale, short translated labels, dates/currency and optional read-aloud help.
- Request cancellation, stale-response guards and accessible focus restoration.

### 5.2 What to share, and what to keep distinct

| Share | Keep distinct |
|---|---|
| Line-table layout and product/serial widgets | Sale pricing versus receipt costing versus quantity-only transfer |
| Money fields and account picker | Money coming in versus going out; cash tender/change |
| Settlement layout | Customer liability versus supplier credit; separate server commands |
| Case layout and timeline | Customer verification, supplier recovery, repair acceptance |
| Document list and inspector | Legal document type, permissions, valid lifecycle and print template |
| Report frame and filters | Stock, accounting and warranty calculations |
| Status presentation | Custody, financial settlement and case outcome states |

Use typed variants such as sale, receipt and transfer. Never allow an arbitrary frontend mode string or arbitrary journal-account pair to choose the server's accounting behavior.

## 6. Clean user journeys

“Within one screen” means the user stays in the workspace while inline sections/panels change. Tasks separated by real-world time, approvals or different staff remain separate recorded events.

### J01 — Sign in and start work

**A01 Access → W01 Home.** Use the sole permitted company/outlet automatically. Multi-company or multi-site selection is a header control. New owners open W09 Settings in setup mode once; invitation members join the company already selected by their invitation.

**Outcome:** clear company/location and relevant tasks; no mandatory daily setup wizard.

### J02 — Simple sale

**W02 Sales / Sell → scan or choose products → enter serials when required → Cash or Bank → Confirm Sale.**

Customer, items, payment and inline review are visible in the same editor. A cashier with one outlet never reselects it. Show bank/account name, amount received/change and stock source before confirmation.

**Outcome:** saved invoice, payment(s), stock issue and warranty entitlement references are shown only after server success. Keep Print and New Sale beside the saved result.

### J03 — Credit or partially paid sale

**W02 Sales → select named customer/items → Pay later or Part paid → due date/payment details → Confirm Sale.**

Credit-limit warnings show the amount and the required action. **Later:** select invoice in W02 or customer in W07 → Collect Payment panel → choose account/amount/invoices → confirm.

**Outcome:** same original invoice; no second sale or stock issue.

### J04 — Wholesale order and partial delivery

**W02 Sales / Quotes & Orders → select customer/items/delivery terms → confirm order → Reserve / Record Delivery on that record → create or link invoice.**

The fulfillment section shows requested, reserved, delivered and remaining quantities. Actual serial issue belongs to delivery. Deposits are separately shown from recognized invoice payment.

**Outcome:** partial shipments and outstanding order quantity remain visible. No extra “delivery screen” or repeated COGS posting.

### J05 — Direct purchase or order arriving later

**Already arrived:** W03 Purchases → Record Purchase → supplier/items/destination/actual quantities → add supplier invoice/payment if available → confirm actual operations.

**Arriving later:** W03 Orders → New Order → confirm → reopen same order when goods arrive → Receive Stock → actual received quantity and condition → confirm receipt.

**No invoice yet:** keep received-not-billed status and later Add Supplier Bill on the same purchase record.

**Outcome:** warehouse or primary/selected outlet gains only actual physical receipt; supplier bill/payment status stays separate.

### J06 — Bulk serial identification

**W03 Receiving → select receipt line → Register Serials → scan/paste/CSV → validation preview → Register.**

Example: 100 received, 40 identified, 60 left. Upload identifies 60 units; on-hand remains 100. Large lists use a full-width serial editor with row-error summary.

If some stock already moved or was sold, do not default newly linked serials to the old receiving location. Resolve their current event/custody evidence or require authorized review.

**Outcome:** exact receipt association when supported by evidence; unregistered quantity remains visible otherwise. An unknown sale-time serial can be registered against authorized unidentified stock by the configured policy, without inventing a supplier invoice.

### J07 — Warehouse-to-outlet transfer

**W04 Stock / Stock → select product → Move Stock or Request Stock → From, To, quantity/serials → confirm request.**

The same transfer opens in Transfers. Next actions are Approve, Pick, Send, Receive; roles see only permitted actions. Source decreases at dispatch; destination increases at receipt; transit carries the difference.

**Exception:** sent 20, received 18 → same record shows 2 still in transit/investigation. A later receipt or approved loss adjustment resolves it.

**Outcome:** company-owned quantities remain traceable throughout. With no warehouse, outlet-to-outlet transfer uses the same editor.

### J08 — Ordinary customer return

**W02 invoice → Return Item → W05 case prefilled with invoice/lines → receive/inspect → choose refund, customer credit or exchange → confirm each required action.**

A linked action preserves a Return to Invoice control; it does not require re-entering the customer or products. Nonserialized quantities are limited to the transaction's remaining returnable quantity. Restocking requires suitable condition and ownership.

**Outcome:** related stock receipt and financial adjustment are distinct records; replacement/exchange price difference is explicit.

### J09 — Warranty intake and repeated replacement

**W05 Customers → scan serial/slip → review original/current entitlement → receive item and issue slip → verify → Give Replacement / Approve Credit / Repair / Reject.**

An old replacement serial B automatically opens its chain A → B, then new issue C when authorized. Show “Previously replaced” and current warranty dates in plain language. Scanning a model barcode first asks for the exact unit serial where necessary.

Rejected goods go to a visible Awaiting Customer Pickup filter. Record Handover later. Repaired customer goods keep the same unit identity.

**Outcome:** no overwritten sale/serial history; duplicate active claims or duplicate resolution are blocked.

### J10 — Customer bill back

**W05 verified case → Approve Credit → choose payout or customer credit use → review → confirm authorized action.**

Example: approved 20,000; refund 8,000 from the selected cash/bank account; keep 12,000 as credit or apply to selected invoices. Display “Refunded”, “Applied” and “Available credit” separately.

Approving a credit alone does not mark cash as paid. If actual payout is later, the same case's next action is Record Refund.

**Outcome:** clear customer resolution and remaining credit. Faulty goods still have their own custody/disposition task.

### J11 — Supplier warranty from several outlets

**W05 Suppliers → New Claim → select supplier and eligible faulty items → check purchase evidence → approve → Send to Supplier.**

Each row retains originating outlet/customer case. Create separate dispatch batches for physically separate sites, or transfer goods to a collection location first. Selecting a list from three outlets is not evidence that all goods were dispatched.

**Outcome:** transit/with-supplier custody recorded per actual dispatch. No replacement stock created.

### J12 — Partial supplier decision and arrival

**W05 supplier case → Record Supplier Response → replacement / bill back / rejection per item → wait → Receive Replacement → actual destination/quantities/serials → Inspect.**

Example: 8 approved; 5 arrive; 4 pass; 1 fails. Display **3 not received**, **4 accepted**, **1 received but disputed**. The failed unit's follow-up is visible separately; it must not disappear because delivery progress reached five.

**Outcome:** physically arrived stock is in receiving/quarantine; only passing units become sellable. Rejected original goods remain off-site until their actual return receipt.

### J13 — Supplier bill back

**W05 supplier case → record approved amount → record supplier credit evidence → Receive Money or Apply to Bills.**

Example: 50,000 confirmed supplier credit; 20,000 actually received in bank; 30,000 applied to selected supplier bills. Approval, issued credit, received money and applied credit have their own evidence/dates.

**Outcome:** financial settlement does not add replacement stock or silently dispose of original faulty goods. Reconciliation lists any remaining physical or financial obligation.

### J14 — Repair, QA and restock

**W04 faulty unit → Send for Repair → W05 Repairs job → assign/diagnose → record parts/work → Complete Work → Inspect → Restock / Return to Customer / Further Repair / Scrap.**

The same repair job displays each stage. Location changes use StockContext and movements; they do not teleport goods between distant sites.

Company-owned QA-passed units can be restocked. Customer-owned units go to pickup/handover. Resale preserves unit identity and prior history and uses the new selling price.

**Outcome:** “repair completed” alone never makes stock sellable.

### J15 — Count stock and resolve differences

**W04 Stock Checks → select location/products → record observations → review variance → approve adjustment → confirm.**

Keep counted time/snapshot and concurrent movement handling explicit. Serialized counts show missing and unexpected units. Do not equate missing serial registrations with physically missing stock.

**Outcome:** approved movement and accounting references; no editable stock-balance cell.

### J16 — Collect, pay, expense or move money

**W06 Money → Receive / Pay / Move → choose intent if not prefilled → party/category + amount + real account + location → inline review → confirm.**

Opening from an invoice, bill or claim prefills intent and source; the user is not asked again what kind of payment it is.

Shop rent: Pay → Rent → amount → outlet/company scope → Cash/Bank → confirm. Pay later records an obligation with due date. A later settlement references it.

**Outcome:** readable amount and remaining balance. No debit/credit entry required from a cashier.

### J17 — Use the default accounts

**W06 Business Accounts → Bank & Cash / Income / Expenses / another group → select account to view activity or Add Account.**

Add Expense Category inside Expenses asks for name and allowed business subtype, optionally location. Technical posting controls remain administrator-only.

**Outcome:** reuse the seeded structure, automatically select valid accounting defaults, never create duplicate ledger accounts per customer or product just to show history.

### J18 — Staff salary and advance

**W07 Staff → select employee or W06 Staff Pay → period/base pay/adjustments → review run → approval → record payment.**

Outstanding advances and prior payments are shown. A salary run and its payout are linked records. Recurring statutory payroll automation is not implied by this basic workflow.

**Outcome:** employee statement, payable/payment and location expense tags, with restricted staff visibility.

### J19 — Openings, reconciliation and financial closing

**W06 Business Accounts → Accounting setup → opening batch → import/enter linked stock and party documents → validate → authorized post.**

Inventory opening and general-ledger opening must link once; do not post the same inventory value twice. Party balances retain due dates/evidence. The UI shows a difference requiring correction rather than silently inserting unexplained capital.

**Reconcile:** Cash & Bank → account → statement/count → Match / Investigate / authorized adjustment.
**Close:** Business Accounts → Periods → select period → review blockers → close with permission. Reopening is separately authorized.

**Outcome:** server-confirmed balances and period controls, audit links and visible unresolved items.

### J20 — Reports and source investigation

**W08 Reports → choose question/report → date + location filters → View → select figure/row for its underlying documents → print/export.**

Report viewer stays in the same workspace. Drilldown uses DocumentInspector with current report context preserved. Long exports use ImportExportPanel progress.

**Outcome:** same filters on screen and exported document, correct site permissions, no separate page per report.

### J21 — Add an outlet and assign team

**W09 Locations → Add Location → outlet/warehouse details → default receiving/sellable/holding locations → cash drawer → save.**

Then Team → choose member/role → assign permitted sites. Setup seeds relevant defaults but no opening stock is invented. The new outlet appears in the shared selector and uses the existing Sales/Stock/Returns components.

**Outcome:** adding a location never requires a new frontend page or duplicated screen component.

### J22 — Import, approvals and correction

**W09 Data or contextual Import → choose file → preview/map → correct errors → explicit import → result.**
**W01 task queue → open source → review evidence → approve/reject/request change.**
**Posted document → permitted correction action → reason/effects → confirm reversal or linked adjustment.**

Every path returns to its source/list with draft inputs, history and unresolved errors preserved.

## 7. Detailed simplified Chart of Accounts experience

### 7.1 Two levels of presentation

**Daily staff:** expenses by category; real cash/bank accounts; “Customers owe us”, “We owe suppliers”; clear payment purpose. No account codes required.

**Owner/accountant:** W06 Business Accounts has group tree, search, opening/closing controls, account activity and automatic mapping status. Technical detail is a gated drawer.

| Friendly group | Example contents | UX rule |
|---|---|---|
| Bank & Cash | Outlet drawers, configured bank accounts | One clear real account per money movement |
| Customers Owe Us | Customer receivables and related asset subgroups | Parties are subledger records, not new GL accounts |
| Stock & Other Assets | Inventory, supplier recoveries, equipment | Ownership and valuation remain explicit |
| Suppliers & Other Amounts We Owe | Supplier payables, customer advances/credits, salaries payable | Liability groups remain distinct from receivables |
| Income | Product/service sales, permitted other income | Collections of old invoices are not entered as new income |
| Cost of Products Sold | Inventory cost released on sale/delivery | Automatically calculated by backend policy |
| Expenses | Rent, utilities, wages, freight, repairs, approved losses | Add allowed leaf categories here |
| Owner Funds | Capital, drawings and retained results | Not part of daily income/expense categories |
| Taxes | User-friendly navigation for tax-related accounts | Asset and liability tax balances stay separately classified |

“Taxes” may be a convenience filter across typed groups; it must not change accounting nature. Use the backend's validated default hierarchy. Previous illustrative tables need normalization before becoming production seeds: customer advances belong in liabilities, recoverable input tax in assets, and header groups must not accept postings. The frontend must not copy contradictory sample codes into a hardcoded tree.

### 7.2 Account editor

**Ordinary authorized user:** Group preselected, Account/category name, short purpose/subtype, applicable location, Save. Display “Used for Rent expenses” as confirmation.

**Accountant:** technical code/type, reconciliation/control behavior, valid mapping roles and history. Derive safe defaults from the selected group and server schema. Do not expose arbitrary changes to an account's accounting nature after use.

Actual bank details are configured before payment selection. A template Bank Accounts group alone is not enough to accept a bank receipt.

### 7.3 Automatic mapping and history

Show “Ready” or “Needs setup” by business operation. A missing sale inventory or payment mapping blocks the affected posting with a direct authorized fix action. Do not turn every cashier save into an account-configuration workflow.

Journal detail is inspectable from the original invoice/payment/case. Manual journals and closing tools remain restricted and retain business evidence.

## 8. Complete module coverage and consolidation

| Existing capability | New home | Presentation |
|---|---|---|
| Company registration, owner approval, setup | A01, W09 setup mode, W01 authorized task queue | Access state and compact setup |
| Multi-company, roles and site scopes | Global context + W09 Team | Selector and access controls |
| Outlets, warehouses, primary outlet, internal locations | W09 Locations | Shared location editor |
| Catalog, categories, UOM, barcodes, pricing | W04 Products | Product editor and fields |
| Serial intake, exact lookup, replacement chain | W03/W02/W05 plus global lookup | SerialCapture + UnitHistory |
| Purchase orders and direct purchases | W03 Orders | Same purchase editor modes |
| Partial receipts, cleaning/packing, QA | W03 Receiving + W04 stock movement | Receipt/condition action |
| Supplier bills, terms and overdue balances | W03 Bills + W06/W07 | Linked document and settlement |
| Retail POS, wholesale quotes/orders | W02 | Sell editor and order view |
| Invoices, discounts, cash/credit/split payment | W02 | Same invoice/payment sections |
| Deliveries, reservations and backorders | W02 order record + W04 Transfers/Stock | Fulfillment sections |
| Customer/supplier profiles and statements | W07 | One party profile template |
| Stock sheet, ownership, condition, valuation | W04; valuation report in W08 | Scoped views and presets |
| Transfers, approval, picking, dispatch and partial receipt | W04 Transfers | One evolving record |
| Counts, adjustments and audit movements | W04 Stock Checks/Activity | Count editor and variance action |
| Low stock and reordering | W04 + W01 queue | Filter/action to purchase or transfer |
| Sales and purchase returns | W05; launch from W02/W03 | Prefilled case |
| Customer warranty and repeated replacements | W05 Customers | Same case and unit history |
| Supplier warranty, with-supplier custody and partial outcomes | W05 Suppliers | Same case with separate progress |
| Bill backs, credit notes, refunds and unapplied credits | W05 + W06 | Shared settlement components |
| Dead stock, rejected pickup, rejected originals | W04 filters + W05 case queues | Condition/custody views |
| Repair, technician work, QA, restock, scrap | W05 Repairs; stock impact in W04 | One job and authorized actions |
| COA hierarchy/default templates, mappings and categories | W09 setup mode + W06 Business Accounts | Seed preview and account tree |
| Journals, ledger, daybook, cashbook and bank movements | W06 | Views and inspector |
| Payments, advances, allocation and reconciliation | W06, contextual panels in W02/W03/W05/W07 | Shared exact settlement editor |
| Opening stock/financial balances and period close | W06 Accounting setup + W04 linked stock opening | Guided batch and checks |
| Basic employee salary, advances and deductions | W07 Staff + W06 Staff Pay | Staff profile and pay run |
| Sales, purchases, location profitability and inventory reports | W08 | Report definitions |
| Warranty, serial, ageing and financial statements | W08 | Report definitions |
| Taxes, policies, numbering, templates and approvals | W09 Rules/Business | Setting sections |
| Attachments, audit, imports/exports and backup controls | Shared components + W09 Data | Panels and job/status views |

Manufacturing/BOM, license-sale flows, offline posting and automated bank feeds are not added to this retail/wholesale baseline. Permission-driven features are based on company policy and role, not a newly introduced licensing flow.

## 9. Implementation architecture and route budget

### 9.1 Route templates

| Primary screen | Proposed frontend route |
|---|---|
| A01 Access | /access |
| W01 Home | /c/{companyId}/home |
| W02 Sales | /c/{companyId}/sales |
| W03 Purchases | /c/{companyId}/purchases |
| W04 Stock | /c/{companyId}/stock |
| W05 Returns & Warranty | /c/{companyId}/returns |
| W06 Money | /c/{companyId}/money |
| W07 Contacts | /c/{companyId}/contacts |
| W08 Reports | /c/{companyId}/reports |
| W09 Settings | /c/{companyId}/settings |

Example view state: /c/{companyId}/sales?view=invoices&site={siteId}&record={invoiceId}. First-time setup renders W09 at /c/{companyId}/settings?mode=setup after business registration establishes the company identity. Deep links and authentication callbacks can have route aliases, but must render existing page components. The screen budget refers to primary templates, not every possible URL.

Use document IDs in links; avoid customer names/serials/payment details in URLs. Unauthorized referenced records return a safe scoped error.

### 9.2 Feature boundaries

Keep sales, purchasing, stock, service, payments, contacts, accounts, reports and settings in separate feature modules. Each owns its command adapters, schemas and domain rules. Compose shared components from section 5.

The current input is a requirements/API proposal, not a verified running repository. The actual source code, generated API types, database migrations and tests have not been reviewed as part of this screen-consolidation task. Before implementation, verify the existing auth contract and endpoints; label unsupported workflows as contract work, not working UI.

Do not invent a capabilities URL, opening-batch schema or salary endpoint because a component needs it. Keep routing/auth differences behind a typed adapter and implement required backend commands before calling them.

### 9.3 UI state and posting safety

- List state, selected record and form draft state are distinct.
- A draft carries fixed company/site/document identity and revision.
- Use string decimals at the boundary; format without losing precision.
- Server totals/posting results are authoritative.
- Never show a successful invoice or stock receipt from optimistic totals alone.
- Reuse the same idempotency key for a retry of the same confirmed command.
- If the network response is unknown, show “Checking whether this was recorded”; resolve by command/document identity before allowing another posting.
- One-screen commands can create several server records. Expose partial checkpoints if the existing API does not provide atomic orchestration.
- Background printing/export/notifications must not repost the original transaction.
- Enforce permissions in the backend for requests, search results and exports.
- Use secure browser authentication; never persist raw access tokens in localStorage.
- On mobile, the same editor uses collapsible sections and a sticky action footer. No alternate business rules.

### 9.4 Backend decisions that need contracts

| Area | Required agreement |
|---|---|
| Direct purchase completion | How receipt, bill and optional payment coordinate and recover |
| Serial registration | Validation preview, atomic/partial semantics, current custody and verified receipt associations |
| Warranty settlement | Separate approved/posted/paid/applied amounts; mixed unit outcomes |
| Location selection | Valid selling/receiving sites, cross-outlet returns and cash/account scope |
| Staff pay and bank matching | Basic schemas/endpoints and reconciliation states |
| Capability and approval loading | Actual auth/permission response and owner-activation policy |
| Openings and accounting defaults | Valid account classifications and no duplicated stock opening value |

These are implementation contract tasks, not additional screens.

## 10. Simplicity and accessibility rules

- One prominent next action for the current task; advanced actions stay in an authorized menu.
- Short label plus consistent icon: Store for outlet, Warehouse for warehouse, ShoppingCart for sale, Package for stock, ArrowLeftRight for moves, ShieldCheck for warranty, Wrench for repair.
- Important actions never rely on icon alone or color alone.
- Use product photos when available; show SKU/serial text to distinguish similar items.
- Offer a chosen language consistently. Optional spoken guidance explains labels/amounts; do not promise that icons alone eliminate all reading or training.
- Keep button labels literal: “Receive 5 Items”, “Pay 8,000”, “Save Draft”.
- Keep one decimal/currency convention per user locale while preserving exact stored values.
- Keyboard/scanner navigation, explicit focus, readable contrast and large touch targets are structural requirements independent of the later theme.
- Pause scanning while another form owns focus; a barcode must not land in a money field.
- No nested confirmation staircase for a routine sale; use the inline summary and a single final business confirmation.
- Do not hide unreadable 20-column tables behind “simple UI”. Default to essential columns and show details on selection.
- Restrict optional fields until relevant; keep mandatory stock, money and identity decisions visible.
- Theme decisions—including palette, typography, icon styling and final spacing tokens—remain open for the user's next direction.

## 11. Build sequence and acceptance

### 11.1 Build sequence within the same screen budget

1. AppShell, access/setup, context, permissions, draft/mutation handling and shared page layouts.
2. Contacts/products, default accounts, opening prerequisites, basic purchase/receipt and outlet sale/payment.
3. Stock/transfer state transitions, serial registration and bulk/scanner interaction.
4. Customer/supplier warranty, mixed settlements, repair, custody and QA.
5. Remaining reports, staff pay, reconciliation, period tools, imports and approvals.
6. Theme implementation and representative usability validation.

Posting controls, company isolation, correct account defaults and financial-period checks are foundations, even when their detailed administrator UI appears later.

### 11.2 Acceptance scenarios

| ID | Scenario | Required evidence |
|---|---|---|
| UX01 | Single-shop paid-now sale | Products, serials and payment entered in one Sell editor; one confirmed result |
| UX02 | Multi-outlet sale | Invoice attributed to A; only A stock changes; B and warehouse unchanged |
| UX03 | Change location with a draft | Draft stays bound to original site or is deliberately discarded/saved |
| UX04 | Receiving 100 then registering 100 serials | On-hand remains 100; receipt identities linked; duplicates rejected |
| UX05 | Identifying units after onward movement | Correct current custody; no false warehouse reset |
| UX06 | Transfer 20; receive 18 | Source, transit, destination and unresolved 2 reconcile |
| UX07 | Return at another permitted outlet | Original selling site and new intake/issue site both retained |
| UX08 | Claim serial B from A→B chain | Current entitlement evaluated; C link preserves prior history |
| UX09 | Customer 20,000 bill back, 8,000 payout | Paid/applied/unapplied amounts reconcile; no duplicate credit |
| UX10 | Supplier approves 8, receives 5, QA passes 4 | 3 unreceived and 1 dispute visible; only 4 sellable |
| UX11 | Repair customer-owned unit | Same unit returned; never company sellable stock |
| UX12 | Late invoice payment after credit sale | Existing balance reduces; no new sale/stock issue |
| UX13 | Expense by category | No debit/credit knowledge needed; inspectable server posting |
| UX14 | COA/account-opening setup | Valid typed groups, configured real bank, no doubled inventory opening |
| UX15 | Salary run then payout | Payable settles once; no repeated expense |
| UX16 | Timeout and retry | Original operation resolved; no duplicate records |
| UX17 | Unauthorized site search/export | No forbidden data disclosure |
| UX18 | New outlet added | Existing screens reused with location scope |
| UX19 | Report drilldown and Back | Filter/scroll restored and amount explained |
| UX20 | Small-screen/scanner flow | Labeled actions accessible; money fields protected from scanner focus |

Validate the prototype with a cashier, stock operator and owner who do not know accounting terminology. Test a sale, delayed payment, partial receipt, transfer, warranty replacement and expense. Treat completion times/click targets as hypotheses until observed; the screen count alone does not prove ease of use.

## 12. Migration from the earlier screen registry

| Earlier IDs/functions | New destination |
|---|---|
| AUTH-* and company-selection startup | A01; global selector |
| ORG-* | W09 setup mode; account tools reuse W06 components |
| SHELL-* | C01–C03; no separate screen |
| DASH-*, TASK-*, ALERT-* | W01 with role/context + C27 |
| SALE-* | W02; returns launch W05, payment uses C14 |
| PUR-* | W03; return cases launch W05 |
| INV-* and TRF-* | W04; repair/case links to W05 |
| CWR-*, SWR-*, REP-* | W05; settlement uses C14 |
| MON-* and COA-* | W06; related transaction panels reused elsewhere |
| PAR-* | W07 |
| RPT-* | W08 |
| ADM-* | W09; contextual tasks use W01 queue |

This retains the modules and separates physical, financial and approval records while reducing top-level page design to 9 ERP screens plus Access. The default user journey is: open the relevant workspace, complete the business details there, review the outcome, confirm once, and continue from the saved record.

