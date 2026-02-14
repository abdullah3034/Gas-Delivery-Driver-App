# Gas Delivery Driver App Report

## A) Summary
- **What was built:** A standalone, offline-first LPG delivery driver app (Expo + SQLite) that simulates the full delivery lifecycle: vehicle selection, order assignment, delivery confirmation (including partial deliveries), payment capture, receipt generation, inventory tracking, and dashboard analytics.
- **Included:** 
  - Vehicle-based order lists
  - Start delivery -> confirm delivery flow
  - Partial delivery support with remaining delivery completion
  - Payments (cash, cheque, credit) with cash change handling
  - Receipt view with per‑delivery breakdown
  - Inventory load/return and movement log
  - Dashboard KPIs (commission, payments, inventory mix, progress by shop)
  - Commission config screen (menu-only)
- **Excluded:** 
  - Backend sync
  - Authentication
  - Real printer/ESC‑POS integration

**How to run & access key screens quickly**
1. `npm install`
2. `npx expo start`
3. Select a vehicle on the Home/Dashboard.
4. Orders tab -> open any order -> Start Delivery -> Confirm.
5. After delivery, record payment -> view receipt.
6. Inventory tab for stock load/return.
7. Menu tab -> Commission Config.

## B) Assumptions
- **Commission calculation:** Commission is a percentage of daily revenue (cash + cheque + credit collected today).  
  Reason: matches business logic for driver earnings and user request.  
  Impact: Commission depends on payments, not just delivered quantity.
- **Daily commission target:** Target is a **currency amount** (e.g., $50), not quantity.  
  Reason: aligns with revenue‑based commission.  
  Impact: progress is calculated against money, not cylinders.
- **Partial deliveries:** Orders can be partially delivered. Remaining delivery can be completed later.  
  Reason: real-world deliveries often partial.  
  Impact: order status can be `partial` and receipts show delivery history.
- **Per‑delivery pricing:** Each delivery’s due is calculated from that delivery’s quantities (not re‑calculated from the full order).  
  Reason: user requirement for separate delivery totals.  
  Impact: receipts list each delivery’s totals independently.
- **Inventory rules:** Delivery cannot exceed vehicle inventory; inventory decrements on confirmation.  
  Reason: ensure realistic stock control.
- **Cheque payments:** require bank name + cheque number.  
  Reason: validation and audit trace.

## C) Core User Flows
- **Vehicle selection -> Order list -> Order details -> Completion**
  - Select vehicle on Home.
  - Orders list filters by selected vehicle.
  - Start Delivery -> Confirm Delivery.
  - Order status transitions: Pending -> In Progress -> Delivered/Partial -> Paid.
- **Payment capture**
  - Cash: enter cash received; change calculated automatically.
  - Cheque: bank selection + cheque number required.
  - Credit: stored without cash change.
- **Receipt generation**
  - After payment, receipt shows delivery items and totals.
  - If multiple deliveries, receipt shows per‑delivery breakdown.
- **Inventory operations & constraints**
  - Load stock / return stock from Inventory screen.
  - Delivery blocked if insufficient inventory.
  - Inventory movements recorded for audit.

## D) Known Limitations & Next Steps
- **Limitations**
  - No backend sync or multi‑user support.
  - No authentication/role management.
  - Real printing not integrated (receipt is preview only).
  - No automated tests.
- **Next Steps**
  - Add backend sync and user accounts.
  - Add full reporting (per driver, per vehicle, per day).
  - Add analytics for cancellations and shortages.
  - Integrate printer support for production use.

