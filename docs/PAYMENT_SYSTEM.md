# 💳 Payment System Documentation

## Overview

Basic subscription payment system integrated with Optimus payment gateway. Users can subscribe for UGX 50,000 per month.

## Features

✅ **Subscription Management**
- Monthly subscription at UGX 50,000
- View subscription status
- Payment history tracking

✅ **Payment Integration**
- Optimus payment gateway (sandbox)
- Mobile money support (MTN, Airtel, etc.)
- Automatic subscription activation

✅ **Admin Features**
- Adjustable pricing (database-driven)
- Transaction logging
- Webhook support for payment callbacks

## Database Schema

### Tables Created

1. **subscription_plans** - Available subscription plans
2. **user_subscriptions** - User subscription records
3. **payment_transactions** - Payment transaction history
4. **payment_webhooks** - Webhook logs from payment gateway

## API Endpoints

### Get Subscription Plans
```bash
GET /api/payments/plans
```

### Get Subscription Status
```bash
GET /api/payments/status
```

### Create Subscription
```bash
POST /api/payments/subscribe
Content-Type: application/json

{
  "plan_id": 1,
  "phone": "+256700000000"
}
```

### Payment Webhook
```bash
POST /api/payments/webhook
Content-Type: application/json

{
  "transaction_uid": "xxx-xxx-xxx",
  "status": "completed",
  "data": {}
}
```

### Get Transaction History
```bash
GET /api/payments/transactions
```

### Test Payment Completion (Development Only)
```bash
POST /api/payments/test-payment?transaction_uid=xxx-xxx-xxx
```

## Frontend Pages

### Subscription Page (`/subscription`)

**Features:**
- View available subscription plans
- Display current subscription status
- Mobile money payment form
- Test payment completion tool (dev mode)

**Usage:**
1. Navigate to `/subscription`
2. Select a subscription plan
3. Enter mobile money phone number
4. Click "Subscribe Now"
5. Complete payment via payment gateway
6. Subscription auto-activates on payment success

## Testing

### Backend Test Script

Run the automated test script:

```bash
./test_payment_system.sh
```

This will test:
1. Health check
2. Get subscription plans
3. Get subscription status
4. Create subscription
5. Complete payment (test endpoint)
6. Verify subscription activation
7. Get transaction history

### Manual Testing

1. **Start Backend:**
```bash
cd api_all_devices
python app.py
```

2. **Start Frontend:**
```bash
cd frontend
npm run dev
```

3. **Test Flow:**
   - Open browser to `http://localhost:8080/subscription`
   - Select the "BarcodeGen Pro Monthly" plan
   - Enter test phone number: `+254700000000`
   - Click "Subscribe Now"
   - Note the transaction UID from the response
   - Use the development tool to test payment completion
   - Verify subscription status shows "Active"

## Payment Gateway Configuration

### Optimus Sandbox

**Endpoint:** `https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new`

**Authorization:** `sb_lv_jRVtWwpZVFair290WCV2Ng1QsXxxJeo2KThTtt8fImC`

**Currency Conversion:**
- UGX 50,000 → KES ~13,500 (rate: 1 UGX = 0.27 KES)

### Supported Networks
- MTN Mobile Money
- Airtel Money
- M-PESA
- Other mobile money providers

## Customization

### Change Subscription Price

Update the database:

```sql
UPDATE subscription_plans 
SET price_ugx = 60000 
WHERE name = 'BarcodeGen Pro Monthly';
```

Or use the admin interface (coming soon).

### Add New Features to Plan

Update the features JSON:

```sql
UPDATE subscription_plans 
SET features = '["unlimited_barcodes", "premium_templates", "priority_support", "bulk_export", "custom_branding", "api_access", "white_label"]'
WHERE id = 1;
```

### Create New Plan

```sql
INSERT INTO subscription_plans (name, description, price_ugx, duration_months, features) 
VALUES (
  'BarcodeGen Pro Yearly',
  'Annual subscription with 20% discount',
  480000,
  12,
  '["unlimited_barcodes", "premium_templates", "priority_support", "bulk_export", "custom_branding", "api_access", "white_label", "dedicated_support"]'
);
```

## Security Notes

⚠️ **Production Deployment:**

1. **Environment Variables:**
   - Move API keys to environment variables
   - Use production Optimus credentials
   - Enable HTTPS only

2. **Authentication:**
   - Currently uses mock user (ID: 1)
   - Implement proper user authentication
   - Add JWT token validation

3. **Rate Limiting:**
   - Already configured via `check_rate_limit`
   - Adjust limits for payment endpoints

4. **Webhook Security:**
   - Add webhook signature verification
   - Validate callback data
   - Use HTTPS endpoints only

## Troubleshooting

### Payment Not Completing

1. Check transaction in database:
```sql
SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;
```

2. Check webhook logs:
```sql
SELECT * FROM payment_webhooks ORDER BY created_at DESC LIMIT 5;
```

3. Manually activate subscription:
```bash
curl -X POST "http://localhost:8034/api/payments/test-payment?transaction_uid=YOUR_TRANSACTION_UID" \
  -H "X-API-Key: test_api_key_12345"
```

### Subscription Not Showing

1. Check subscription status:
```sql
SELECT * FROM user_subscriptions WHERE user_id = 1;
```

2. Verify plan exists:
```sql
SELECT * FROM subscription_plans WHERE is_active = 1;
```

### Database Not Initialized

The payment tables are automatically created on API startup. If issues occur:

```python
# In Python console
from models.database import engine
from models.payment_models import Base
Base.metadata.create_all(bind=engine)
```

## Future Enhancements

🚀 **Planned Features:**

1. **Multiple Payment Methods**
   - Credit/Debit cards
   - Bank transfers
   - PayPal integration

2. **Subscription Management**
   - Cancel subscription
   - Upgrade/downgrade plans
   - Auto-renewal toggle
   - Refund processing

3. **Admin Dashboard**
   - View all subscriptions
   - Manage pricing
   - Transaction reports
   - Revenue analytics

4. **User Features**
   - Payment history page
   - Invoice generation
   - Email notifications
   - Usage tracking

## Support

For payment issues:
- Check transaction status via API
- Review webhook logs
- Contact Optimus support for gateway issues

## License

Same as main project license.
