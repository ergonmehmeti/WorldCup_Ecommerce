# Backend Scripts

Utility scripts for database management and testing.

---

## 🗑️ deleteAllUsers.js

Delete all test users from the database.

### ⚠️ WARNING
This script will **permanently delete ALL users and payments** from the database. Use only for testing purposes!

### Usage

From the backend directory:

```bash
cd backend
node scripts/deleteAllUsers.js
```

This script:
- Shows count of users and payments before deletion
- Waits 3 seconds before executing (you can cancel with Ctrl+C)
- Uses transactions for safe deletion
- Shows confirmation after completion
- Uses the credentials from your `.env` file

---

## 🧪 testOttProvisioning.js

Test OTT provisioning without going through the full signup/payment flow.

### What it does
1. Creates a test user in database (or updates if exists)
2. Marks email as verified
3. Marks payment as completed
4. Calls OTT provisioning (real API in production, mock in development)
5. Saves credentials and subscriber_id
6. **Skips email sending**
7. Displays detailed results

### Usage

**Basic (with defaults):**
```bash
node scripts/testOttProvisioning.js
```

**Custom user data:**
```bash
node scripts/testOttProvisioning.js "John" "Doe" "test@example.com"
```

**Delete user after test:**
```bash
node scripts/testOttProvisioning.js --delete
```

**Force mock mode (skip real OTT API):**
```bash
node scripts/testOttProvisioning.js --mock
```

**Combined:**
```bash
node scripts/testOttProvisioning.js "Jane" "Smith" "jane@test.com" --delete --mock
```

### Output Example

```
🚀 ════════════════════════════════════════════════
🚀  OTT PROVISIONING TEST SCRIPT
🚀 ════════════════════════════════════════════════

👤 ══════════════════════════════════════
👤  Creating Test User
👤 ══════════════════════════════════════
👤  Name: John Doe
👤  Email: test@example.com
👤  Phone: +38349123456
✅ Test user ready (ID: 123)
👤 ══════════════════════════════════════

📺 ══════════════════════════════════════
📺  Testing OTT Provisioning
📺 ══════════════════════════════════════
📺  Mode: PRODUCTION (Real OTT API)
📺  Username: testjohndoeFIFA
📺  Password: 123456
📺  Subscriber created with ID: 456
✅ Package <id> assigned successfully   (🔒 real OTT package IDs hidden)
✅ Package <id> assigned successfully
✅ OTT Provisioning successful!

📊 ══════════════════════════════════════
📊  Results
📊 ══════════════════════════════════════
📊  Username:      testjohndoeFIFA
📊  Password:      123456
📊  Subscriber ID: 456
📊  Packages:      All assigned ✅
📊 ══════════════════════════════════════

🔍 ══════════════════════════════════════
🔍  Database Verification
🔍 ══════════════════════════════════════
🔍  Email Verified:  ✅
🔍  Payment Status:  paid ✅
🔍  OTT Provisioned: ✅
🔍  OTT Username:    testjohndoeFIFA
🔍  OTT Password:    123456
🔍  Subscriber ID:   456
🔍 ══════════════════════════════════════

💡 Tip: Run with --delete flag to remove test user automatically

✨ Test completed successfully!
```

### On Server

```bash
# SSH into server
ssh useradmin@fifaserver

# Navigate to backend
cd /var/www/WorldCupValaTV/backend

# Run test (production mode - real OTT API)
node scripts/testOttProvisioning.js

# Run and auto-delete
node scripts/testOttProvisioning.js --delete
```

---

## 📝 deleteAllUsers.sql

Direct SQL script to delete all users.

### Usage

```bash
psql -U <db_user> -d worldcup_ecommerce -f scripts/deleteAllUsers.sql
```

Or from within psql:

```sql
\i scripts/deleteAllUsers.sql
```

---

## 💡 Tips

### Testing Workflow

1. **Test OTT integration:**
   ```bash
   node scripts/testOttProvisioning.js --delete
   ```

2. **Create multiple test users:**
   ```bash
   node scripts/testOttProvisioning.js "User" "One" "user1@test.com"
   node scripts/testOttProvisioning.js "User" "Two" "user2@test.com"
   node scripts/testOttProvisioning.js "User" "Three" "user3@test.com"
   ```

3. **Clean up all test users:**
   ```bash
   node scripts/deleteAllUsers.js
   ```

### Production Testing

When testing on the production server, the script will:
- Use real OTT API credentials from `.env`
- Create real subscribers in OTT system
- Assign real packages

**Remember:** Test users created in production will exist in the real OTT system!

