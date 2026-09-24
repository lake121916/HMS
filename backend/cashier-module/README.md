# Alem Ketema Enat Hospital Cashier Module

Standalone production-oriented Sequelize/Express cashier backend. It uses the Hospital Account Number (MRN) as the payment identifier and exposes `/api/cashier`.

## File tree

```text
cashier-module/
├── app.js
├── package.json
├── .env.example
├── README.md
├── config/
│   └── database.js
├── controllers/
│   └── cashierController.js
├── gateways/
│   ├── cbeBirr.js
│   ├── chapa.js
│   └── telebirr.js
├── middleware/
│   ├── auth.js
│   └── idempotency.js
├── models/
│   ├── index.js
│   ├── Invoice.js
│   ├── Patient.js
│   ├── Payment.js
│   └── Reconciliation.js
├── routes/
│   └── cashierRoutes.js
├── services/
│   ├── accountService.js
│   ├── invoiceService.js
│   └── paymentService.js
└── utils/
    └── errors.js
```

## Run

```bash
cd backend/cashier-module
copy .env.example .env
# Set DB, JWT, and real gateway credentials in .env
npm install
npm start
```

`sequelize.sync()` creates/updates the module tables. Use migrations instead of `sync()` for a controlled production deployment.

## API examples

Set a valid cashier JWT first:

```bash
set TOKEN=your_cashier_jwt
```

### Verify account

```bash
curl "http://localhost:5001/api/cashier/verify-account/MRN-000123?lastName=Bekele&dob=1988-04-12" ^
  -H "Authorization: Bearer %TOKEN%"
```

### Fetch invoice

```bash
curl "http://localhost:5001/api/cashier/invoice/INV-2026-0009/MRN-000123" ^
  -H "Authorization: Bearer %TOKEN%"
```

### Process Telebirr payment

```bash
curl -X POST "http://localhost:5001/api/cashier/payment" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: 4d8c8b99-telebirr-0001" ^
  -d "{\"accountNumber\":\"MRN-000123\",\"lastName\":\"Bekele\",\"dob\":\"1988-04-12\",\"invoiceNumber\":\"INV-2026-0009\",\"amount\":\"1250.00\",\"paymentMethod\":\"TELEBIRR\",\"transactionRef\":\"TB-987654\"}"
```

### Process cash payment

```bash
curl -X POST "http://localhost:5001/api/cashier/payment" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: 4d8c8b99-cash-0001" ^
  -d "{\"accountNumber\":\"MRN-000123\",\"lastName\":\"Bekele\",\"dob\":\"1988-04-12\",\"invoiceNumber\":\"INV-2026-0009\",\"amount\":\"500.00\",\"paymentMethod\":\"CASH\"}"
```

### Get receipt

```bash
curl "http://localhost:5001/api/cashier/receipt/AKH-1770000000000-AB12CD34" ^
  -H "Authorization: Bearer %TOKEN%"
```

## Production checklist

- Use a real, rotated `JWT_SECRET`; restrict cashier tokens to cashier roles at the identity provider.
- Keep `Idempotency-Key` mandatory and unique; retain idempotency records long enough for gateway retry windows.
- Run invoice/payment/reconciliation writes inside a Sequelize transaction with row locking.
- Verify MRN with last name and date of birth on every payment; never trust MRN alone.
- Verify Telebirr, Chapa, and CBE Birr transactions before marking any invoice paid.
- Treat gateway timeouts and non-success responses as `GATEWAY_FAILED`; never mutate invoice totals in that case.
- Use DECIMAL/strings for money and validate currency as ETB; never use JavaScript floating point for totals.
- Add immutable audit events containing cashier ID, request ID, gateway response, and invoice state transition.
- Encrypt database connections and secrets; do not log tokens, identity data, or gateway credentials.
- Replace `sequelize.sync()` with reviewed migrations before production rollout.
- Add webhook reconciliation and scheduled settlement checks for each provider.
- Add rate limiting, request validation, structured logging, metrics, alerting, and gateway circuit breakers.
- Test duplicate requests, concurrent payments, partial payments, overpayments, refunds, and gateway failures.
