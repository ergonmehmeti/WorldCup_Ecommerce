# Architecture — ValaTV World Cup 2026 Subscription Platform

> **Portfolio copy.** Real hostnames, IP addresses, credentials and vendor-specific IDs are redacted.
> Everything environment-specific is read from `backend/.env` (see [`backend/.env.example`](backend/.env.example)).

## 1. Overview

A web platform where Vala customers buy a pass to stream the FIFA World Cup 2026 live in the TV Vala OTT app.

1. The customer signs up and verifies their email.
2. They accept the terms of use and pay by card on the bank's 3-D Secure page (TEB NestPay).
3. The platform automatically creates their OTT account, emails the credentials and shows them on the dashboard.
4. Customers with a Vala mobile number also receive a free **104 GB** mobile data gift automatically, and can buy combo packages that add a mobile data bundle.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, React Router 6, Tailwind CSS 3 |
| Backend | Node.js, Express 4, helmet, express-rate-limit, jsonwebtoken, bcryptjs, nodemailer |
| Database | PostgreSQL (`pg`), versioned SQL migrations |
| Hosting | Nginx: TLS termination, serves the frontend build, reverse-proxies `/api` to the backend |
| Scheduled jobs | System cron (gift email export) |

## 3. Packages and pricing

| Package | Price | What the customer gets |
|---|---|---|
| Personal (`ValaBoterori`) | €9.99 | OTT account for the tournament, plus the 104 GB gift for Vala numbers |
| Personal + mobile bundle (`XXL` / `XL` / `L` / `M` / `S`) | €19.99 | Everything in Personal, plus the chosen mobile data bundle. Offered only to Vala numbers. |
| Business (`ValaBoterori_BIZ`) | €34.99 | A separate OTT account licensed for public venues (bars, restaurants). Supported by the API and admin panel; the customer dashboard currently shows BIZ credentials but no BIZ purchase button. |

- A mobile bundle counts as the Personal package, so a customer buys one or the other.
- All OTT packages stay active until **25 July 2026**.
- Prices are set in [`paymentController.js`](backend/src/controllers/paymentController.js).

## 4. System diagram

```
[ Browser ]
     │  HTTPS
     ▼
[ Nginx ] ── serves the React build (frontend/dist)
     │  /api/*  → reverse proxy
     ▼
[ Express API — Node.js ]            public / internal IPs: redacted
     │
     ├── PostgreSQL ................. internal network
     │
     ├── TEB NestPay (bank) ......... 3-D Pay Hosting, SHA-512 signed (Hash v3)
     │      ├── browser POST ........ /api/payment/teb-return
     │      └── server-to-server .... /api/payment/teb-callback
     │
     ├── OTT platform API ........... HTTPS + Basic Auth
     │      └── create subscriber, assign packages
     │
     ├── OSC / Recharge ............. SOAP, internal network
     │      └── mobile data gifts to Vala numbers
     │
     ├── VALA Core API .............. placeholder (mocked), used by manual gifts
     │
     └── SMTP ....................... customer emails + customer-care CSV export

[ System cron ] → backend/scripts/valaGiftEmailCron.js (twice a day)
```

## 5. Purchase flow

1. **Sign up** (`POST /api/auth/signup`)
   - Validates the input and hashes the password with bcrypt (cost 12).
   - Emails a 6-digit verification code, valid for 15 minutes.
   - Returns a JWT.
2. **Verify email** (`POST /api/auth/verify-email`). Payment is blocked until the email is verified.
3. **Accept terms** (`POST /api/agreements/accept`). Stores the user, package, timestamp, IP address and user agent as a legal record of consent.
4. **Create payment** (`POST /api/payment/create`)
   - Cancels any earlier pending payment for the same package.
   - Creates a `payments` row with an order reference (`WC-…` for Personal, `WCBIZ-…` for Business).
   - Returns the bank form fields signed with SHA-512 (Hash v3).
   - The frontend auto-submits the form to the bank's 3-D Secure page, so card data never touches this platform.
5. **Bank result.** The result arrives twice: through the customer's browser (`teb-return`) and server-to-server (`teb-callback`).
   - Both handlers verify the bank's hash.
   - Whichever arrives first processes the payment. It is claimed atomically (`UPDATE … WHERE status != 'completed'`), so it is processed exactly once.
   - Late responses for failed or cancelled payments are ignored.
   - `teb-return` breaks out of the bank's iframe with a top-level redirect to `/payment-success` or `/payment-failed`. Provisioning continues in the background.
6. **OTT provisioning**
   - Creates the subscriber on the OTT platform and assigns the package IDs (each assignment retried up to 5 times).
   - Credentials are saved and emailed (with 3 retries).
   - If provisioning fails, the customer is still marked as paid and receives a "payment confirmed" email. An admin can then provision manually from the admin panel.
7. **Mobile data gift.** Only for Vala numbers: `+383` / `0` followed by `44`, `45` or `46`.
   - Sent through OSC / Recharge, using the order reference as the transaction ID (STAN).
   - For a mobile bundle, a second OSC request with `<order reference>-M` is sent 2 seconds later.
   - `users.mobile_package` moves from `PENDING` to the bundle name, or to `FAILED`.
8. **Dashboard.**
   - After returning from the bank, the dashboard polls `GET /api/auth/me` every 3 seconds (up to 10 times) until the credentials appear.
   - On a normal visit, it first calls `POST /api/payment/reset-pending` to clear an abandoned `pending` status.

## 6. Gift delivery channels

| Channel | When it runs | Status |
|---|---|---|
| **OSC / Recharge (SOAP)** | Automatically after each payment. Admins can retry failed gifts. | Live. Enabled by `OSC_GIFT_ENABLED`; mocked outside production. |
| **Customer-care CSV email** | Cron, twice a day. Sends paid Vala numbers from the last 12 hours that have not been gifted yet, or a heartbeat email if there are none. Admins can bulk-resend failed batches. | Live. Enabled by `VALA_GIFT_ENABLED`. |
| **VALA Core API** | Admin "send gift" button | Placeholder. Mocked until the endpoint is provided. |

Gift activity is logged to weekly files in `VALA_GIFT_LOG_PATH` (`email_gifts_YYYY-Www.log` and `osc_gifts_YYYY-Www.log`).

## 7. API endpoints

**Access levels:**
- **Public:** no login needed.
- **JWT:** a logged-in user.
- **Staff:** `admin` or `admin_operator`.
- **Admin:** `admin` only.

### Authentication — `/api/auth`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/signup` | Public, rate-limited | Register, email a verification code, return a JWT |
| POST | `/login` | Public, rate-limited | Log in, return a JWT |
| POST | `/forgot-password` | Public, rate-limited | Email a password-reset link |
| POST | `/reset-password` | Public, rate-limited | Set a new password using the reset token |
| POST | `/verify-email` | JWT, rate-limited | Verify the email with the 6-digit code |
| POST | `/resend-code` | JWT, rate-limited | Resend the verification code |
| GET | `/me` | JWT | Current user's profile, payment status and credentials |

### Payments — `/api/payment`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/create` | JWT + verified email | Create an order and return the signed bank form |
| GET | `/status` | JWT | Payment and credential status for both packages |
| POST | `/reset-pending` | JWT | Reset an abandoned `pending` payment to `unpaid` |
| POST | `/teb-return` | Public, hash-verified | Customer's browser returning from 3-D Secure |
| POST | `/teb-callback` | Public, hash-verified | Server-to-server payment confirmation from the bank |

### Agreements — `/api/agreements`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/accept` | JWT | Record acceptance of the terms of use |

### Administration — `/api/admin`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/users` | Staff | Customer list |
| GET | `/stats` | Staff | Platform statistics |
| GET | `/operators` | Admin | List staff accounts |
| POST | `/operators` | Admin | Create an `admin` or `admin_operator` account |
| DELETE | `/operators/:id` | Admin | Delete a staff account (not yourself, and not accounts with a payment) |
| PUT | `/operators/:id/demote` | Admin | Demote a staff account to customer |
| PUT | `/operators/:id/promote-admin` | Admin | Promote an operator to admin |
| PUT | `/users/:id/promote` | Admin | Promote a customer to operator |
| PATCH | `/users/:id/phone` | Admin | Update a customer's phone number |
| POST | `/users/:id/provision-ott` | Staff | Manually provision OTT credentials |
| POST | `/users/:id/send-gift` | Staff | Manually send a gift (VALA Core API) |
| POST | `/users/:id/retry-osc-gift` | Staff | Retry a failed OSC gift |
| GET | `/payments/export` | Admin | Export payments as CSV (optional `from` / `to` dates) |
| POST | `/vala-gifts/resend-all-failed` | Admin | Bulk-resend all failed or unsent gift emails |

### Other

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| POST | `/mock/bank/simulate-callback` | Development only | Simulate a bank callback. Enabled outside production or with `ENABLE_MOCK_ROUTES=true`. |

## 8. Security

**Sessions**
- JWT Bearer tokens. Lifetime comes from `JWT_EXPIRES_IN` (default 7 days).
- The user is reloaded from the database on every request, so role changes take effect immediately.
- The frontend logs the user out automatically on any `401`.

**Passwords**
- bcrypt with cost 12; minimum 8 characters at sign-up.
- Password reset uses a 32-byte random token. Only its SHA-256 hash is stored, and it expires after 1 hour.

**Email verification**
- 6-digit code, valid for 15 minutes.
- Required before payment.

**Roles**
- `customer`, `admin_operator` and `admin`.
- Enforced by API middleware and by frontend route guards.

**Rate limits (per IP)**

| Endpoint | Limit |
|---|---|
| login | 10 failed attempts / 15 min |
| verify-email | 10 failed attempts / 15 min |
| reset-password | 10 / 15 min |
| signup | 5 / hour |
| forgot-password | 5 / hour |
| resend-code | 5 / hour |

**Payments**
- The outgoing bank form is signed, and every incoming bank response is hash-verified (SHA-512).
- Processing is idempotent.
- Card data is entered only on the bank's page.

**HTTP hardening**
- helmet with a strict Content-Security-Policy and HSTS (1 year, preload).
- CORS restricted to `FRONTEND_URL`.
- `trust proxy` is set so rate limits see the real client IP.

**Nginx**
- HTTP redirects to HTTPS; only TLS 1.2 and 1.3 are allowed.
- Requests to the bare IP are dropped (`444`).
- Hidden files are denied.

**Database**
- All SQL uses parameterized queries.

## 9. Data model

| Table | Contents |
|---|---|
| `users` | Profile, password hash, email verification and role. Per package: payment status (`unpaid` / `pending` / `paid`), payment reference, date and amount, OTT credentials and subscriber ID (Business uses separate `biz_*` columns). Gift tracking (`valaboterori_gift*`, `osc_*`, `vala_email_*`) and `mobile_package`. |
| `payments` | One row per payment attempt: `order_reference`, amount in cents, currency, status (`pending` / `completed` / `failed` / `cancelled`), `package_type`, `mobile_package`, bank transaction ID and the raw bank response (JSONB). |
| `agreements` | User, package, accepted-at timestamp, IP address and user agent. |
| `schema_migrations` | Applied migrations. Managed with `npm run db:migrate` and `npm run db:status` (12 migrations). |

## 10. Development mode

**Mocks.** Outside production, the OTT platform, OSC / Recharge and email are all mocked and logged to the console, so the full purchase flow runs locally without any external system.

**Local setup**
- If `backend/certs/key.pem` and `cert.pem` exist, the backend serves HTTPS locally.
- Vite proxies `/api` to the backend.

**Feature flags**

| Flag | Effect |
|---|---|
| `OSC_GIFT_ENABLED` | Turns on real OSC gifting in production |
| `VALA_GIFT_ENABLED` | Turns on the customer-care CSV email |
| `EMAIL_MOCK_MODE` | Logs emails instead of sending them, even in production |
| `DISABLE_OTT` | Simulates an OTT outage |
| `ENABLE_MOCK_ROUTES` | Exposes `/mock` routes in production |

## 11. Operations scripts (`backend/scripts`)

| Area | Scripts |
|---|---|
| Accounts | `createDemoAdmins`, `createDemoCustomers` (operator training), `createTestCustomer`, `createTestValaCustomer`, `promoteToAdmin`, `deleteUser`, `deleteInvalidUsers` |
| Customer support | `lookupCustomer`, `checknumberpayments`, `fixPaymentStatus` |
| Reports (CSV by email) | `exportUnverifiedUsers`, `exportAllUnverifiedUsers`, `exportPaidNoCredentials`, `exportProvisionedUsers` |
| Integration tests | `testDbConnection`, `testOttProvisioning`, `testUsernameGeneration`, `testOscRecharge`, `testOscMobilePackages`, `testMobilePackageFlow` |
| Scheduled | `valaGiftEmailCron` |

See [`backend/scripts/README.md`](backend/scripts/README.md) for usage.
