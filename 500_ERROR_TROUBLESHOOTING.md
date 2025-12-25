# 500 Error Troubleshooting Guide

## Problem
Getting a 500 Internal Server Error when trying to register.

## Most Common Causes

### 1. Missing JWT_SECRET Environment Variable
**Symptoms**: Error when generating JWT token

**Solution**:
1. Check if `backend/.env` file exists
2. Ensure it contains:
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```
3. **Restart the backend server** after adding/updating `.env`

### 2. MongoDB Not Connected
**Symptoms**: Database operations fail

**Solution**:
1. Check if MongoDB is running:
   - Local MongoDB: Start MongoDB service
   - MongoDB Atlas: Check connection string
2. Verify `backend/.env` has correct `MONGODB_URI`:
   ```
   MONGODB_URI=mongodb://localhost:27017/trustfund-dao
   ```
3. Check backend terminal for MongoDB connection messages:
   - ✅ Should see: `✅ MongoDB Connected: ...`
   - ❌ If you see: `❌ MongoDB Connection Failed: ...`

### 3. Missing Environment Variables
**Symptoms**: Various server errors

**Required in `backend/.env`:**
```
MONGODB_URI=mongodb://localhost:27017/trustfund-dao
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

## How to Diagnose

### Step 1: Check Backend Terminal Logs
Look at the terminal where the backend is running. You should see detailed error logs:
- `Registration error: ...`
- `Error stack: ...`
- `Error name: ...`
- `Error code: ...`

### Step 2: Check Browser Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Click on the failed `/api/auth/register` request
4. Check the Response tab - it should show the error message

### Step 3: Verify Environment Variables
Run this in backend directory (PowerShell):
```powershell
# Check if .env file exists
Test-Path .env

# View .env contents (if not sensitive)
Get-Content .env
```

## Quick Fix Checklist

1. ✅ **Backend `.env` file exists** in `backend/` directory
2. ✅ **JWT_SECRET is set** in `.env` file
3. ✅ **MONGODB_URI is set** in `.env` file
4. ✅ **MongoDB is running** (check backend terminal for connection message)
5. ✅ **Backend server restarted** after `.env` changes
6. ✅ **Check backend terminal** for specific error messages

## Common Error Messages

### "JWT_SECRET is not configured"
- **Fix**: Add `JWT_SECRET=...` to `backend/.env`
- **Restart**: Backend server

### "MongoDB Connection Failed"
- **Fix**: Start MongoDB or fix connection string
- **Check**: MongoDB service is running

### "ValidationError"
- **Fix**: Check form data - all required fields filled correctly
- **Check**: Email format, password length (min 6 chars)

### "E11000 duplicate key error"
- **Fix**: Email already exists - use different email or login instead

## Testing After Fix

1. **Check backend terminal** - should see no errors
2. **Try registering** - should get 201 status (success) or 400 (validation error with message)
3. **Check browser console** - should see success or specific error message

## Still Getting 500 Error?

1. **Copy the exact error message** from backend terminal
2. **Check the Response** in browser Network tab
3. **Verify all environment variables** are set correctly
4. **Restart backend server** completely (stop and start again)

The improved error handling will now show more specific error messages to help identify the exact issue.

