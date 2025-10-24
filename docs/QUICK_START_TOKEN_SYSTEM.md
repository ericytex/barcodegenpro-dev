# 🚀 Token System - Quick Start Guide

## Start the System

```bash
# 1. Backend
cd api_all_devices
python app.py

# 2. Frontend (new terminal)
cd frontend
npm run dev
```

## Test Flow

### 1. Register New User
Go to: http://localhost:8080/register

- Email: test@example.com
- Username: testuser
- Password: password123

✅ You'll get **10 free tokens** automatically!

### 2. View Token Balance
Go to Dashboard: http://localhost:8080

You'll see:
```
🪙 Your Token Balance
     10 tokens
    available
```

### 3. Buy More Tokens
Click "Buy More Tokens" button

- Select a package (e.g., 20 tokens for UGX 10,000)
- Choose payment method (MTN/Airtel/MPESA)
- Enter phone number
- Click "Pay Now"
- Follow instructions modal
- Click "Test Payment (Dev)" to simulate payment

✅ Tokens added instantly!

### 4. Generate Barcodes
Go to Design page: http://localhost:8080/design

- Upload Excel file or use designer
- System checks if you have enough tokens
- If yes: Generates barcodes and deducts tokens
- If no: Shows "Insufficient Tokens" modal

## Admin Functions

### Change Token Price
```bash
curl -X POST http://localhost:8034/api/tokens/admin/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "token_price_ugx", "value": "450"}'
```

### Grant Free Tokens
```bash
curl -X POST "http://localhost:8034/api/tokens/admin/grant?user_id=1&tokens=50&reason=Promotion" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View All Settings
```bash
curl http://localhost:8034/api/tokens/admin/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Available Settings (No Code Changes Needed!)

1. `token_price_ugx` - Price per token (default: 500)
2. `welcome_bonus_tokens` - Free tokens for new users (default: 10)
3. `min_purchase_tokens` - Minimum purchase (default: 10)
4. `max_purchase_tokens` - Maximum purchase (default: 1000)
5. `discount_tier_1_min` - Tokens needed for 10% discount (default: 50)
6. `discount_tier_1_percent` - Tier 1 discount % (default: 10)
7. `discount_tier_2_min` - Tokens needed for 20% discount (default: 100)
8. `discount_tier_2_percent` - Tier 2 discount % (default: 20)
9. `discount_tier_3_min` - Tokens needed for 30% discount (default: 500)
10. `discount_tier_3_percent` - Tier 3 discount % (default: 30)
11. `tokens_never_expire` - Whether tokens expire (default: true)

## API Endpoints Reference

### User Endpoints
- `GET /api/tokens/balance` - Get balance
- `POST /api/tokens/purchase` - Buy tokens
- `GET /api/tokens/history` - View history
- `GET /api/tokens/pricing` - Get pricing info
- `POST /api/barcode/generate` - Generate with tokens
- `POST /api/barcode/generate-from-excel` - Excel upload with tokens

### Admin Endpoints
- `GET /api/tokens/admin/settings` - View settings
- `POST /api/tokens/admin/settings` - Update settings
- `POST /api/tokens/admin/grant` - Grant tokens

## Database

Location: `api_all_devices/data/barcode_generator.db`

View tokens:
```sql
SELECT * FROM user_tokens;
SELECT * FROM token_purchases;
SELECT * FROM token_usage;
SELECT * FROM token_settings;
```

## Troubleshooting

### Issue: User not getting welcome bonus
**Fix**: Check `token_settings` table, ensure `welcome_bonus_tokens` is set

### Issue: Payment not completing
**Fix**: Check logs in `api_all_devices/logs/`, ensure Optimus API key is correct

### Issue: Token balance not updating
**Fix**: Call `refreshBalance()` in TokenContext or reload page

### Issue: Frontend not showing token balance
**Fix**: Ensure user is logged in and `TokenProvider` wraps the app in `App.tsx`

## Support

- Documentation: `TOKEN_SYSTEM_COMPLETE.md`
- Implementation status: `TOKEN_SYSTEM_IMPLEMENTATION_STATUS.md`
- Database structure: See `api_all_devices/models/database.py`
- API routes: See `api_all_devices/routes/tokens.py`

---

**Happy Generating! 🎉**

