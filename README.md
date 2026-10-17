# Express Checkout Service

[![CI](https://github.com/mayurmakwana/express-checkout-service/actions/workflows/ci.yml/badge.svg)](https://github.com/mayurmakwana/express-checkout-service/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Production-grade E-Commerce Checkout, Order Processing & Webhook REST API built with Node.js and Express. Designed for high reliability, test coverage, and automated code review evaluation.

---

## Features

- **Order Management**: Create, list, query, and transition order lifecycle statuses (`PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- **Financial Calculation Engine**: Accurately computes subtotal, progressive discounts, regional tax calculations, and dynamic shipping rates.
- **Webhook Ingestion Engine**: Verifies HMAC-SHA256 signatures for payment gateway callbacks (`payment.succeeded`, `payment.failed`).
- **High Test Coverage**: Rigorous unit and integration test suites using Jest and Supertest.
- **CI/CD Integration**: Automated multi-version Node.js matrix testing (Node 20, 22, 24) on pull requests.

---

## Architecture

The project follows clean, layered architecture principles:

```text
├── src/
│   ├── config/             # Environment configuration
│   ├── controllers/        # Express HTTP route controllers
│   ├── middleware/         # Centralized error handler & validation
│   ├── repositories/       # Isolated data persistence abstraction
│   ├── routes/             # RESTful API route definitions
│   ├── services/           # Core domain logic & business calculations
│   ├── app.js              # Express app configuration & middleware pipeline
│   └── server.js           # Server bootstrap & graceful shutdown hooks
├── tests/
│   ├── unit/               # Service & domain calculation tests
│   └── integration/        # Supertest HTTP endpoint tests
└── .github/workflows/      # Automated CI workflow
```

---

## API Endpoints

### Health Check
- `GET /api/health` — Service health probe and uptime check.

### Orders API
- `POST /api/orders` — Create a new order with calculated totals.
- `GET /api/orders` — List orders (supports `?status=` and `?customerId=` filters).
- `GET /api/orders/:id` — Retrieve an order by ID.
- `PATCH /api/orders/:id/status` — Update order status.
- `POST /api/orders/:id/cancel` — Cancel an order with automated refund processing based on order lifecycle status.

### Webhooks API
- `POST /api/webhooks` — Ingest payment gateway events (requires `x-signature` header).

---

## Setup & Testing

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
git clone https://github.com/mayurmakwana/express-checkout-service.git
cd express-checkout-service
npm install
```

### Running the Application
```bash
# Start production server
npm start

# Start development mode with hot-reloading
npm run dev
```

### Running Tests
```bash
# Run all unit and integration tests
npm test

# Run tests with code coverage reporting
npm run test:coverage
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
