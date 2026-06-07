# VTU Platform Backend

A modular Node.js/Express/MongoDB backend for a Ghana-focused VTU (Virtual Top-Up) platform selling Airtime, Data Bundles, Result Checkers, and eSIM services.

---

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT |
| Payments | Paystack |
| Providers | HubNet, VTPass, Manual |
| Email | Nodemailer (SMTP) |
| Logging | Winston |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values.

### 3. Create first admin

Start the server, then call:

```bash
curl -X POST http://localhost:5000/api/auth/admin-setup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Admin User",
    "email": "admin@yourplatform.com",
    "phone": "0200000000",
    "password": "securepassword",
    "setupSecret": "YOUR_ADMIN_SETUP_SECRET"
  }'
```

### 4. Run

```bash
# Development
npm run dev

# Production
npm start
```

---

## API Routes

### Public

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/products | List active products |
| GET | /api/products?category=DATA_BUNDLE | Filter by category |
| POST | /api/orders | Create an order |
| GET | /api/orders/track/:orderNumber | Track an order |
| POST | /api/payments/initialize | Initialize Paystack payment |
| GET | /api/payments/verify/:reference | Verify payment |
| POST | /api/payments/webhook | Paystack webhook |
| POST | /api/esim | Submit eSIM request |
| GET | /api/esim/track/:reference | Track eSIM request |
| GET | /api/settings | Public settings |
| POST | /api/auth/login | Agent/Admin login |
| POST | /api/auth/register-agent | Agent registration |

### Agent (JWT required)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/agent/dashboard | Dashboard stats |
| GET | /api/agent/profile | View profile |
| PATCH | /api/agent/profile | Update profile |
| GET | /api/orders/my | My orders |

### Admin (JWT required, role=ADMIN)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/dashboard | Business analytics |
| GET | /api/orders | All orders |
| GET | /api/users/agents | List agents |
| PATCH | /api/users/agents/:id/approve | Approve agent |
| PATCH | /api/users/agents/:id/suspend | Suspend agent |
| POST | /api/products | Create product |
| PATCH | /api/products/:id | Update product |
| POST | /api/providers | Add provider |
| POST | /api/checker/batch | Create checker batch |
| POST | /api/checker/batch/:id/pins | Upload pins CSV |
| GET | /api/esim | List eSIM requests |
| PATCH | /api/esim/:id | Update eSIM status |
| PATCH | /api/settings | Update settings |

---

## Module Structure

```
src/
├── app.js                         # Entry point
├── config/
│   ├── database.js                # MongoDB connection
│   └── logger.js                  # Winston logger
├── middleware/
│   ├── auth.js                    # JWT auth + roles
│   ├── errorHandler.js            # Global error handler
│   └── validate.js                # express-validator helper
├── shared/
│   ├── errors/index.js            # Custom error classes
│   └── utils/index.js             # Shared utilities
└── modules/
    ├── auth/                      # Login, register, JWT
    ├── users/                     # User model, agent portal, admin management
    ├── products/                  # Product catalog
    ├── providers/                 # Fulfillment providers
    ├── orders/                    # Order lifecycle
    ├── payments/                  # Paystack integration + webhook
    ├── fulfillment/
    │   ├── fulfillment.service.js # Orchestrator
    │   ├── processors/            # Business logic per category
    │   └── adapters/              # External provider API clients
    ├── checker-inventory/         # PIN batch + CSV upload
    ├── esim/                      # eSIM request flow
    ├── notifications/             # Email notifications
    ├── dashboard/                 # Admin analytics
    └── settings/                  # Platform configuration
```

---

## Purchase Flow

```
Customer fills form
      ↓
POST /api/orders          → creates order (PENDING)
      ↓
POST /api/payments/initialize → gets Paystack URL
      ↓
Customer pays on Paystack
      ↓
POST /api/payments/webhook  → payment confirmed (PAID)
      ↓
fulfillmentService.processOrder()
      ↓
Processor (data/airtime/checker/esim)
      ↓
Adapter (HubNet / VTPass / Manual)
      ↓
Order marked SUCCESS
      ↓
Email notification sent
```

---

## Adding a New Provider

1. Create `src/modules/fulfillment/adapters/newprovider.adapter.js`
2. Implement `sendData()` and `sendAirtime()` methods
3. Add the provider code to the `ADAPTER_MAP` in the relevant processor

---

## Deployment

### Backend (Render / Railway)
- Set all `.env` variables in the dashboard
- Start command: `npm start`
- Node version: 18+

### Database (MongoDB Atlas)
- Create a free cluster
- Whitelist `0.0.0.0/0` for Render/Railway IPs
- Copy connection string to `MONGODB_URI`

### Paystack Webhook
- In Paystack dashboard → Webhooks
- URL: `https://your-api-domain.com/api/payments/webhook`
- Copy webhook secret to `PAYSTACK_WEBHOOK_SECRET`
