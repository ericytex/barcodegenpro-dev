# 📡 Optimus Payment Gateway API - Exact Parameters

## ✅ Current Implementation Status

Your payment integration is **correctly configured** with the Optimus API specification!

## 🔗 API Endpoint

```
POST https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new
```

## 🔑 Authentication Header

```
Authorization: sb_lv_jRVtWwpZVFair290WCV2Ng1QsXxxJeo2KThTtt8fImC
```

## 📋 Request Payload Structure

```json
{
    "data": {
        "local_country": "KEN",
        "local_telecom": "MPESA",
        "local_currency": "KES",
        "local_phone": "+254700000000",
        "local_amount": 2000,
        "app_transaction_uid": "11232333210029"
    }
}
```

## 🏢 Provider-Specific Parameters

### M-PESA (Kenya)
```json
{
    "data": {
        "local_country": "KEN",
        "local_telecom": "MPESA",
        "local_currency": "KES",
        "local_phone": "+254700000000",
        "local_amount": 13500,          // Converted from UGX (50,000 * 0.27)
        "app_transaction_uid": "uuid"
    }
}
```

### MTN Mobile Money (Uganda)
```json
{
    "data": {
        "local_country": "UGA",
        "local_telecom": "MTN",
        "local_currency": "UGX",
        "local_phone": "+256700000000",
        "local_amount": 50000,           // No conversion needed
        "app_transaction_uid": "uuid"
    }
}
```

### Airtel Money (Uganda)
```json
{
    "data": {
        "local_country": "UGA",
        "local_telecom": "AIRTEL",
        "local_currency": "UGX",
        "local_phone": "+256700000000",
        "local_amount": 50000,           // No conversion needed
        "app_transaction_uid": "uuid"
    }
}
```

## 📊 Parameter Details

| Parameter               | Type   | Required | Description                           | Example            |
|------------------------|--------|----------|---------------------------------------|--------------------|
| `local_country`        | string | Yes      | ISO 3-letter country code             | "KEN", "UGA"       |
| `local_telecom`        | string | Yes      | Mobile money provider                 | "MPESA", "MTN"     |
| `local_currency`       | string | Yes      | ISO 3-letter currency code            | "KES", "UGX"       |
| `local_phone`          | string | Yes      | Phone with country code               | "+254700000000"    |
| `local_amount`         | int    | Yes      | Amount in local currency (no decimal) | 2000               |
| `app_transaction_uid`  | string | Yes      | Unique transaction identifier         | "uuid-v4"          |

## 🔄 Currency Conversion Logic

Our system automatically converts amounts based on the selected provider:

```python
provider_config = {
    "MPESA": {
        "country": "KEN",
        "telecom": "MPESA",
        "currency": "KES",
        "rate": 0.27  # 1 UGX = 0.27 KES
    },
    "MTN": {
        "country": "UGA",
        "telecom": "MTN",
        "currency": "UGX",
        "rate": 1.0   # No conversion
    },
    "AIRTEL": {
        "country": "UGA",
        "telecom": "AIRTEL",
        "currency": "UGX",
        "rate": 1.0   # No conversion
    }
}

# Conversion
amount_local = int(amount_ugx * config["rate"])
```

## 📝 Example Console Output

When you make a payment, you'll see this in your terminal:

```
======================================================================
🚀 CREATING PAYMENT WITH OPTIMUS API
======================================================================
📡 Endpoint: https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new
🔑 Authorization: sb_lv_jRVtWwpZVFair290WCV2Ng1QsXxxJeo2KThTtt8fImC

🆔 Transaction UID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
👤 User ID: 1
🏢 Provider: MTN

📋 REQUEST PARAMETERS:
  • local_country: UGA
  • local_telecom: MTN
  • local_currency: UGX
  • local_phone: +256700000000
  • local_amount: 50000
  • app_transaction_uid: a1b2c3d4-e5f6-7890-abcd-ef1234567890

💰 Amount Conversion: 50000 UGX → 50000 UGX

📤 FULL PAYLOAD:
{
  "data": {
    "local_country": "UGA",
    "local_telecom": "MTN",
    "local_currency": "UGX",
    "local_phone": "+256700000000",
    "local_amount": 50000,
    "app_transaction_uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
======================================================================
```

## ✅ Implementation Verification

Your current implementation in `api_all_devices/services/payment_service.py`:

1. ✅ **Correct Endpoint**: `https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new`
2. ✅ **Correct Authorization**: `sb_lv_jRVtWwpZVFair290WCV2Ng1QsXxxJeo2KThTtt8fImC`
3. ✅ **Correct Payload Structure**: Matches exact format with `data` wrapper
4. ✅ **All Required Parameters**: Includes all 6 required fields
5. ✅ **Provider-Specific Config**: Dynamically adjusts based on selection
6. ✅ **Currency Conversion**: Automatic conversion for MPESA
7. ✅ **UUID Generation**: Uses `uuid.uuid4()` for unique transaction IDs
8. ✅ **Comprehensive Logging**: Shows all parameters being sent

## 🧪 Testing with Different Providers

### Test with M-PESA (Kenya)
```bash
# User selects M-PESA and pays UGX 50,000
# System sends to Optimus:
{
  "data": {
    "local_country": "KEN",
    "local_telecom": "MPESA",
    "local_currency": "KES",
    "local_phone": "+254712345678",
    "local_amount": 13500,           # 50,000 * 0.27
    "app_transaction_uid": "..."
  }
}
```

### Test with MTN (Uganda)
```bash
# User selects MTN and pays UGX 50,000
# System sends to Optimus:
{
  "data": {
    "local_country": "UGA",
    "local_telecom": "MTN",
    "local_currency": "UGX",
    "local_phone": "+256700000000",
    "local_amount": 50000,           # No conversion
    "app_transaction_uid": "..."
  }
}
```

### Test with Airtel (Uganda)
```bash
# User selects Airtel and pays UGX 50,000
# System sends to Optimus:
{
  "data": {
    "local_country": "UGA",
    "local_telecom": "AIRTEL",
    "local_currency": "UGX",
    "local_phone": "+256750000000",
    "local_amount": 50000,           # No conversion
    "app_transaction_uid": "..."
  }
}
```

## 🔍 Where to See the Parameters

### Frontend (Browser Console - F12)
```javascript
╔════════════════════════════════════════════════════════════════╗
║              PAYMENT REQUEST DATA                              ║
╚════════════════════════════════════════════════════════════════╝
📤 POST to: http://localhost:8034/api/payments/subscribe
💳 Payment Data: { 
  plan_id: 1, 
  phone: "+256700000000", 
  provider: "MTN" 
}
📱 Provider: MTN
```

### Backend (Terminal)
```bash
======================================================================
🚀 CREATING PAYMENT WITH OPTIMUS API
======================================================================
📡 Endpoint: https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new
🔑 Authorization: sb_lv_jRVtWwpZVFair290WCV2Ng1QsXxxJeo2KThTtt8fImC

📋 REQUEST PARAMETERS:
  • local_country: UGA
  • local_telecom: MTN
  • local_currency: UGX
  • local_phone: +256700000000
  • local_amount: 50000
  • app_transaction_uid: uuid...
======================================================================
```

## 🚀 Next Steps

Your implementation is ready! To test:

1. Start backend: `python app.py` (watch terminal logs)
2. Start frontend: `npm run dev` (open console F12)
3. Sign up → Choose plan → Select provider → Pay
4. See **exact parameters** in both consoles!

## 📚 Quick Reference

**File**: `api_all_devices/services/payment_service.py`
**Class**: `OptimusPaymentService`
**Method**: `create_payment()`

All parameters match the Optimus specification exactly! ✅
