# 🪙 Token Checking Logic - Detailed Flow

## 📋 Understanding Your Requirements

### Core Principle:
**1 Row in Excel = 1 Barcode = 1 Token Required**

---

## 🔄 Flow Breakdown

### Scenario 1: Direct Barcode Generation Toggle

#### Initial State:
- User on Dashboard
- "Direct Barcode Generation" toggle is OFF
- User has 0 tokens

#### User Action:
1. User clicks toggle to turn ON "Direct Barcode Generation"

#### System Response:
```
CHECK tokens:
  IF user_tokens == 0:
    ❌ DO NOT toggle ON
    ❌ DO NOT allow toggle state change
    🚫 BLOCK: Show alert "You have 0 tokens. Please buy tokens before uploading."
    💡 Show "Buy Tokens" button
    STOP - Do not proceed
    
  ELSE IF user_tokens > 0:
    ✅ ALLOW toggle to turn ON
    ✅ Enable Excel upload functionality
    ✅ User can now select and upload Excel file
```

---

### Scenario 2: Excel File Upload (Direct Generation ON)

#### Initial State:
- "Direct Barcode Generation" is ON
- User has 15 tokens
- User selects Excel file with 20 rows

#### User Action:
1. User uploads Excel file
2. System reads Excel file

#### System Response:
```
STEP 1: Count Excel rows
  excel_row_count = 20
  
STEP 2: Get user token balance
  user_tokens = 15
  
STEP 3: Compare
  tokens_needed = excel_row_count = 20
  tokens_available = user_tokens = 15
  tokens_missing = tokens_needed - tokens_available = 5
  
STEP 4: Check sufficiency
  IF tokens_available < tokens_needed:
    ❌ DO NOT generate barcodes
    ❌ DO NOT proceed with upload
    🚫 BLOCK: Show "Insufficient Tokens" modal
    
    Modal shows:
    ┌────────────────────────────────────┐
    │  ⚠️ Insufficient Tokens            │
    ├────────────────────────────────────┤
    │  Your Excel file has: 20 rows      │
    │  You need: 20 tokens               │
    │  You have: 15 tokens               │
    │  Missing: 5 tokens                 │
    │                                    │
    │  Cost: UGX 2,500 (5 tokens)       │
    │                                    │
    │  [Buy Tokens] [Cancel]            │
    └────────────────────────────────────┘
    
    User must:
    - Click "Buy Tokens" to purchase more
    - OR Cancel and upload smaller Excel file
    - OR Wait until they have enough tokens
    
    STOP - Do not generate
```

---

### Scenario 3: Excel Upload with Sufficient Tokens

#### Initial State:
- "Direct Barcode Generation" is ON
- User has 25 tokens
- User selects Excel file with 20 rows

#### User Action:
1. User uploads Excel file
2. System reads Excel file

#### System Response:
```
STEP 1: Count Excel rows
  excel_row_count = 20
  
STEP 2: Get user token balance
  user_tokens = 25
  
STEP 3: Compare
  tokens_needed = excel_row_count = 20
  tokens_available = user_tokens = 25
  
STEP 4: Check sufficiency
  IF tokens_available >= tokens_needed:
    ✅ SUFFICIENT TOKENS
    
    PROCEED:
    1. Start barcode generation
    2. Generate 20 barcodes (one per row)
    3. Deduct tokens: 25 - 20 = 5
    4. Update user balance: new_balance = 5 tokens
    5. Show success message:
       "✅ Generated 20 barcodes. 20 tokens used, 5 remaining"
    6. Allow download of generated barcodes
    
    RESULT:
    - Barcodes generated: ✅
    - Tokens used: 20
    - Tokens remaining: 5
```

---

## 📊 Complete Flow Diagrams

### Flow A: Toggle Check
```
User clicks toggle
    ↓
Check tokens
    ↓
    ├─ tokens == 0?
    │     ↓
    │   ❌ Block toggle
    │   🚫 Show alert
    │   💰 Offer "Buy Tokens"
    │   STOP
    │
    └─ tokens > 0?
          ↓
        ✅ Allow toggle ON
        ✅ Enable upload
```

### Flow B: Upload with Direct Generation ON
```
User uploads Excel (20 rows)
    ↓
System counts rows: 20
    ↓
System checks tokens: 15
    ↓
Compare: 20 needed vs 15 available
    ↓
    ├─ 15 < 20? (INSUFFICIENT)
    │     ↓
    │   ❌ Block generation
    │   🚫 Show "Insufficient Tokens" modal
    │   💰 Show cost for missing 5 tokens
    │   📊 Required: 20 | Available: 15 | Missing: 5
    │   STOP
    │
    └─ 15 >= 20? (SUFFICIENT)
          ↓
        ✅ Generate 20 barcodes
        ✅ Deduct 20 tokens
        ✅ New balance: 15 - 20 = -5 (ERROR!)
        
        (This branch won't happen because 15 < 20)
```

### Flow C: Upload with Sufficient Tokens
```
User uploads Excel (10 rows)
    ↓
System counts rows: 10
    ↓
System checks tokens: 25
    ↓
Compare: 10 needed vs 25 available
    ↓
25 >= 10? YES (SUFFICIENT)
    ↓
✅ Generate 10 barcodes
✅ Deduct 10 tokens
✅ New balance: 25 - 10 = 15
✅ Show: "Generated 10 barcodes. 10 tokens used, 15 remaining"
✅ Allow download
```

---

## 🎯 Edge Cases to Handle

### Edge Case 1: User uploads Excel with 0 rows
```
IF excel_row_count == 0:
  ❌ Show error: "Excel file is empty or has no valid data"
  STOP
```

### Edge Case 2: User has exact tokens needed
```
User tokens: 20
Excel rows: 20
Result: ✅ Generate (20 - 20 = 0 tokens remaining)
Warning: "⚠️ You have 0 tokens remaining. Buy more to continue generating."
```

### Edge Case 3: Toggle is ON, user buys tokens, then uploads
```
1. Toggle ON (user has 5 tokens)
2. User buys 20 tokens → balance = 25
3. User uploads 10 rows → balance = 25 - 10 = 15 ✅
```

### Edge Case 4: Excel file read fails
```
IF excel_read_error:
  ❌ Show error: "Failed to read Excel file"
  ❌ Don't deduct tokens
  STOP
```

### Edge Case 5: Generation fails midway
```
IF generation_error:
  ❌ Show error: "Generation failed"
  ⚠️ IMPORTANT: Refund tokens (add back deducted tokens)
  OR: Only deduct tokens AFTER successful generation
```

---

## 🔐 Token Deduction Timing

### IMPORTANT: When to deduct tokens?

**Option A: Deduct BEFORE generation**
```
1. Check tokens
2. Deduct tokens
3. Generate barcodes
4. IF generation fails → Refund tokens
```

**Option B: Deduct AFTER generation (SAFER)**
```
1. Check tokens
2. Generate barcodes
3. IF success → Deduct tokens
4. IF failure → Don't deduct (user keeps tokens)
```

**RECOMMENDED: Option B** - Only deduct tokens after successful generation

---

## 📍 Where to Check Tokens

### Location 1: Toggle Button Click
**Component:** `ApiFileUpload.tsx` (or wherever the toggle is)
**Check:** `if (balance === 0) { prevent toggle }`

### Location 2: Excel File Upload
**Component:** `ApiFileUpload.tsx` or `SamsungGalaxyExcelUpload.tsx`
**Check:** 
```typescript
const rowCount = excelData.length;
const userBalance = balance;

if (userBalance < rowCount) {
  showInsufficientTokensModal({
    required: rowCount,
    available: userBalance,
    missing: rowCount - userBalance,
    costUgx: (rowCount - userBalance) * 500
  });
  return; // STOP
}
```

### Location 3: Backend API
**Endpoint:** `/api/barcodes/upload-excel`
**Check:** Already implemented! ✅
```python
tokens_needed = len(excel_rows)
if user_balance < tokens_needed:
  return 402 Payment Required
```

---

## 🎨 UI Feedback Messages

### Message 1: Toggle blocked
```
🚫 "You need tokens to use Direct Barcode Generation"
💡 "You have 0 tokens. Buy tokens to continue."
[Buy Tokens]
```

### Message 2: Insufficient tokens on upload
```
⚠️ "Insufficient Tokens"
📊 "Your Excel file has 20 rows but you only have 15 tokens"
📉 "Missing: 5 tokens (UGX 2,500)"
[Buy 5 Tokens] [Buy More] [Cancel]
```

### Message 3: Successful generation
```
✅ "Successfully generated 20 barcodes"
🪙 "20 tokens used, 5 remaining"
📥 [Download Barcodes]
```

### Message 4: Low balance warning
```
⚠️ "Low token balance: 2 tokens remaining"
💡 "Buy more tokens to continue generating barcodes"
[Buy Tokens]
```

---

## ✅ Implementation Checklist

### Frontend:
- [ ] Add token check to toggle button click handler
- [ ] Block toggle if balance === 0
- [ ] Show alert/toast when blocking toggle
- [ ] Count Excel rows after file selection
- [ ] Compare rows vs tokens before API call
- [ ] Show InsufficientTokensModal if needed
- [ ] Only call API if tokens sufficient
- [ ] Update balance display after generation
- [ ] Show remaining tokens in success message

### Backend:
- [x] Check tokens in `/api/barcodes/upload-excel` ✅ Already done!
- [x] Return 402 if insufficient ✅ Already done!
- [x] Deduct tokens after successful generation ✅ Already done!
- [x] Return updated balance in response ✅ Already done!

---

## 🤔 Questions for Clarification

1. **When to deduct tokens?**
   - Before generation starts?
   - OR After successful generation? ← RECOMMENDED

2. **Toggle behavior:**
   - Should toggle be disabled (grayed out) when tokens = 0?
   - OR should it be clickable but show error?

3. **Excel preview:**
   - Should user see row count BEFORE uploading?
   - OR count rows after file selection?

4. **Multiple attempts:**
   - If user uploads insufficient tokens, fixes it, can they retry immediately?
   - OR do they need to refresh?

5. **Token display:**
   - Should token balance be visible ON the upload component?
   - OR only in the dashboard widget?

---

## 📝 Summary

**I understand the logic as:**

1. **Toggle Check**: 
   - If tokens = 0 → Block toggle + Show alert
   - If tokens > 0 → Allow toggle

2. **Excel Upload Check**:
   - Count rows in Excel
   - Compare with user tokens
   - If tokens < rows → Block + Show "Buy Tokens" modal
   - If tokens >= rows → Generate + Deduct tokens + Update balance

3. **Token Deduction**:
   - New balance = Old balance - Rows generated
   - Show remaining balance in success message

**Is this correct?** 

Please confirm and I'll implement this exact logic!

