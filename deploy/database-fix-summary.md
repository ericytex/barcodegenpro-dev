# Database Fix Summary

## Issues Found

1. **Missing `token_settings` table**: The database initialization was failing due to an indentation bug
2. **401 Unauthorized errors**: Likely because database initialization didn't complete, so no users table was created properly

## Root Cause

In `backend/models/database.py`, the code after line 165 was incorrectly indented - it was **outside** the `with sqlite3.connect(self.db_path) as conn:` block. This meant:

- The connection closed after creating only the first 3 tables (barcode_files, generation_sessions, devices)
- All subsequent table creation (including `token_settings`, `users`, etc.) was never executed
- The database was left in an incomplete state

## Fix Applied

Fixed the indentation so ALL table creation code is now inside the database connection block (lines 167-517 are now properly indented).

## Next Steps

1. **On your remote server**, rebuild the backend container to pick up the fix:
   ```bash
   docker compose down
   docker compose build --no-cache backend
   docker compose up -d
   ```

2. **Verify database initialization**:
   ```bash
   # Check if token_settings table exists
   docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db ".tables" | grep token_settings
   
   # Check if users table exists
   docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db ".tables" | grep users
   ```

3. **If database is still missing tables**, you can:
   - Restart the backend container (it will re-run `init_database()`)
   - Or run the fix script: `./deploy/fix-database.sh`

4. **If you still have 401 errors**, you may need to:
   - Check if users exist: `docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;"`
   - If count is 0, create a user via registration or manually

## Database Location

The database is located at:
- **In container**: `/app/data/barcode_generator.db`
- **On host** (via bind mount): `./backend/data/barcode_generator.db`

Make sure this path exists and is writable by the container.



