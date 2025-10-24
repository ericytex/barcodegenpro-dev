# 🧪 Token System Testing Guide

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices
source venv/bin/activate
python app.py
```

**Expected Output:**
```
INFO: Starting Barcode Generator API
INFO: Uvicorn running on http://0.0.0.0:8000
✅ Database initialized with token tables
```

**Backend will be available at:** `http://localhost:8000`

---

### 2. Start the Frontend

Open a NEW terminal:

```bash
cd /Users/ericwatyekele/Research/BARCODE-GENERATOR/frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

**Frontend will be available at:** `http://localhost:5173`

---

## ✅ Test Checklist

### Test 1: New User Registration with Welcome Tokens

1. **Go to:** `http://localhost:5173/register`

2. **Fill in:**
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123`
   - Full Name: `Test User`

3. **Click:** "Sign Up"

4. **✅ Expected Results:**
   - Toast appears: "Registration successful! You've received 10 free tokens!"
   - Auto-login happens
   - Redirect to dashboard

5. **Verify Backend Logs:**
   ```
   INFO: User registered successfully: test@example.com (given 10 welcome tokens)
   ```

---

### Test 2: Check Token Balance

1. **On Dashboard:**
   - Look for Token Balance widget
   - Should show: **10 tokens available**

2. **Verify in Database:**
   ```bash
   sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db
   
   SELECT * FROM user_tokens WHERE user_id = 1;
   # Should show: balance=10, total_purchased=10, total_used=0
   
   SELECT * FROM token_usage WHERE user_id = 1;
   # Should show: welcome_bonus entry with -10 tokens
   
   .exit
   ```

---

### Test 3: Generate Barcodes with Sufficient Tokens

1. **Go to:** Design/Generate page

2. **Upload Excel file with 5 barcodes** OR **Create 5 barcodes manually**

3. **Click:** "Generate"

4. **✅ Expected Results:**
   - Generation succeeds
   - Toast: "Successfully generated 5 barcodes (5 tokens used, 5 remaining)"
   - Token balance updates to: **5 tokens**
   - Barcodes download/display

5. **Verify Backend Logs:**
   ```
   INFO: Deducted 5 tokens from user 1 for operation: barcode_generation
   ```

6. **Verify in Database:**
   ```bash
   sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db
   
   SELECT balance FROM user_tokens WHERE user_id = 1;
   # Should show: 5
   
   SELECT * FROM token_usage WHERE operation = 'barcode_generation';
   # Should show entry with tokens_used=5
   ```

---

### Test 4: Insufficient Tokens Modal

1. **On Dashboard:** You now have 5 tokens

2. **Try to generate 20 barcodes** (more than you have)

3. **✅ Expected Results:**
   - **Insufficient Tokens Modal appears**
   - Shows:
     - "You need: 20 tokens"
     - "You have: 5 tokens"
     - "Missing: 15 tokens"
     - "Cost to continue: UGX 7,500"
   - Generation is **BLOCKED**
   - "Buy Tokens" button available

4. **Verify Backend Response:**
   ```json
   Status: 402 Payment Required
   {
     "error": "insufficient_tokens",
     "required": 20,
     "available": 5,
     "missing": 15,
     "cost_ugx": 7500
   }
   ```

---

### Test 5: Token Purchase Flow

1. **Click:** "Buy Tokens" button

2. **Token Purchase Modal opens**

3. **Select a package:**
   - Click "20 tokens - UGX 10,000"
   - OR enter custom amount: `10000`

4. **Select Payment Provider:**
   - Click on MTN, Airtel, or MPESA logo

5. **Enter Phone Number:**
   - Example: `+256700000000`

6. **Click:** "Pay UGX 10,000"

7. **✅ Expected Results:**
   - Loading spinner appears
   - Backend logs show:
     ```
     INFO: Token purchase initiated: user=1, tokens=20, amount=10000
     🔐 Optimus Payment Request:
     Endpoint: https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new
     Provider: MTN
     Amount: 10000 UGX
     Transaction UID: xxxx-xxxx-xxxx
     ```
   - **Payment Instructions Modal** appears
   - Shows steps to complete payment

8. **Verify Transaction in Database:**
   ```bash
   sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db
   
   SELECT * FROM token_purchases WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;
   # Should show: status='pending', tokens_purchased=20, amount_ugx=10000
   ```

---

### Test 6: Simulate Payment Completion (Development)

Since we're in sandbox/development:

#### Option A: Manual Database Update

```bash
sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db

-- Update purchase status
UPDATE token_purchases 
SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 1;

-- Get the transaction UID
SELECT transaction_uid FROM token_purchases WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1;

.exit
```

#### Option B: Call Backend Directly

```bash
# Get the transaction_uid from the payment response or database
TRANSACTION_UID="xxxx-xxxx-xxxx"

# Simulate payment completion
curl -X POST http://localhost:8000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_uid": "'$TRANSACTION_UID'",
    "status": "completed"
  }'
```

#### Then Refresh Token Balance:

1. **On Frontend:** Click "Done" or refresh the page
2. **Check Balance:** Should now show **25 tokens** (5 + 20)

3. **Verify in Database:**
   ```bash
   sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db
   
   SELECT balance, total_purchased, total_used FROM user_tokens WHERE user_id = 1;
   # Should show: balance=25, total_purchased=30, total_used=5
   ```

---

### Test 7: Generate After Purchase

1. **Now you have 25 tokens**

2. **Upload Excel with 20 barcodes**

3. **Click:** "Generate"

4. **✅ Expected Results:**
   - Generation succeeds
   - Toast: "Successfully generated 20 barcodes (20 tokens used, 5 remaining)"
   - Token balance updates to: **5 tokens**
   - Barcodes download/display

---

### Test 8: Token History

1. **Go to:** Settings or Dashboard

2. **Click:** "View History" (if implemented)

3. **✅ Expected Results:**
   - Shows purchase history:
     - "+20 tokens | UGX 10,000 | Jan 10"
   - Shows usage history:
     - "-20 tokens | Generate | Jan 10"
     - "-5 tokens | Generate | Jan 10"
     - "+10 tokens | Welcome Bonus | Jan 10"

4. **Verify via API:**
   ```bash
   curl http://localhost:8000/api/tokens/history \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "X-API-Key: your-api-key-123"
   ```

---

## 🔍 API Testing with cURL

### Get Token Balance

```bash
TOKEN="your_access_token_here"
API_KEY="your-api-key-123"

curl http://localhost:8000/api/tokens/balance \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: $API_KEY"
```

**Expected Response:**
```json
{
  "balance": 10,
  "total_purchased": 10,
  "total_used": 0,
  "user_id": 1,
  "created_at": "2025-01-10T12:00:00",
  "updated_at": "2025-01-10T12:00:00"
}
```

---

### Purchase Tokens

```bash
curl -X POST http://localhost:8000/api/tokens/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_ugx": 10000,
    "provider": "MTN",
    "phone": "+256700000000"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "transaction_uid": "xxxx-xxxx-xxxx",
  "tokens_purchased": 20,
  "amount_ugx": 10000,
  "payment_instructions": {...}
}
```

---

### Generate Barcodes (with token check)

```bash
curl -X POST http://localhost:8000/api/barcodes/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"imei": "123456789012345", "model": "Test Phone"}
    ],
    "create_pdf": false
  }'
```

**Success Response (sufficient tokens):**
```json
{
  "success": true,
  "message": "Successfully generated 1 barcodes (1 tokens used, 9 remaining)",
  "generated_files": [...],
  "total_items": 1
}
```

**Error Response (insufficient tokens):**
```json
Status: 402 Payment Required
{
  "detail": {
    "error": "insufficient_tokens",
    "message": "You need 20 tokens but only have 10",
    "required": 20,
    "available": 10,
    "missing": 10,
    "cost_ugx": 5000
  }
}
```

---

## 🗄️ Database Inspection

### Check All Token Tables

```bash
sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db

-- List all token tables
.tables
# Should show: user_tokens, token_purchases, token_usage, token_settings

-- Check token balance
SELECT * FROM user_tokens;

-- Check purchases
SELECT * FROM token_purchases ORDER BY created_at DESC;

-- Check usage
SELECT * FROM token_usage ORDER BY created_at DESC;

-- Check settings
SELECT * FROM token_settings;

-- Summary query
SELECT 
  u.username,
  t.balance,
  t.total_purchased,
  t.total_used,
  (SELECT COUNT(*) FROM token_purchases WHERE user_id = u.id) as purchase_count,
  (SELECT COUNT(*) FROM token_usage WHERE user_id = u.id) as usage_count
FROM users u
LEFT JOIN user_tokens t ON u.id = t.user_id;

.exit
```

---

## 🐛 Troubleshooting

### Issue: No welcome tokens after registration

**Check:**
```bash
sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db
SELECT * FROM token_settings WHERE setting_key = 'welcome_bonus_tokens';
```

**Fix:** Should return `10`. If not, run:
```sql
UPDATE token_settings SET setting_value = '10' WHERE setting_key = 'welcome_bonus_tokens';
```

---

### Issue: Backend won't start

**Error:** `ModuleNotFoundError`

**Fix:**
```bash
cd api_all_devices
source venv/bin/activate
pip install -r requirements.txt
```

---

### Issue: 402 error but should have tokens

**Debug:**
```bash
# Check actual balance
sqlite3 /Users/ericwatyekele/Research/BARCODE-GENERATOR/api_all_devices/data/barcode_generator.db
SELECT balance FROM user_tokens WHERE user_id = YOUR_USER_ID;

# Check recent usage
SELECT * FROM token_usage WHERE user_id = YOUR_USER_ID ORDER BY created_at DESC LIMIT 5;
```

---

### Issue: Token balance not updating in UI

**Fix:**
1. Check browser console for errors
2. Verify TokenContext is wrapping the app
3. Manually refresh: Click refresh icon or reload page
4. Check API response in Network tab

---

## 📊 Test Scenarios Summary

| Test | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Register new user | Get 10 free tokens | ☐ |
| 2 | Check balance | Shows 10 tokens | ☐ |
| 3 | Generate 5 barcodes | Success, 5 tokens remaining | ☐ |
| 4 | Try to generate 20 | Insufficient tokens modal | ☐ |
| 5 | Purchase 20 tokens | Payment flow initiated | ☐ |
| 6 | Complete payment | Balance updates to 25 | ☐ |
| 7 | Generate 20 barcodes | Success, 5 tokens remaining | ☐ |
| 8 | View history | Shows all transactions | ☐ |

---

## 🎯 Success Criteria

✅ All tests pass
✅ No console errors
✅ Database updates correctly
✅ UI reflects token changes immediately
✅ Payment flow completes
✅ Generation blocked when insufficient tokens
✅ Generation succeeds when sufficient tokens

---

## 📝 Notes for Production

Before deploying to production:

1. **Update Optimus API credentials** in `services/payment_service.py`
2. **Change environment** from `sandbox` to `production`
3. **Update SECRET_KEY** in `services/auth_service.py`
4. **Set up proper webhooks** for payment confirmation
5. **Add error tracking** (Sentry, etc.)
6. **Set up monitoring** for token transactions
7. **Test with real mobile money** accounts

---

## 🚀 Ready to Test!

Start both servers and go through the test checklist above. The entire flow should work end-to-end!

