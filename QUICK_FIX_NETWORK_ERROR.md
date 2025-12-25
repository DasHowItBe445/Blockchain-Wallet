# Quick Fix for Network Error

## The Problem
You're seeing: "Network error: Cannot reach backend server. Please check that the backend is running and accessible."

## Backend Status
✅ Your backend IS running on port 5000 (confirmed)

## Quick Solutions (Try in Order)

### Solution 1: Restart Frontend Server (MOST COMMON FIX)
React apps only read `.env` files when they start. If you created or changed the `.env` file after starting the frontend, it won't see the changes.

1. **Stop the frontend server** (Ctrl+C in the terminal where `npm start` is running)
2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```
3. **Make sure `.env` file exists** with this content:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. **Start the frontend again**:
   ```bash
   npm start
   ```

### Solution 2: Verify Backend is Accessible
Test if the backend is actually reachable:

1. Open your browser
2. Go to: http://localhost:5000
3. You should see: `{"message":"NGO Funding Platform API"}`

If this doesn't work, the backend might not actually be running properly.

### Solution 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for the log: `Attempting registration to: http://localhost:5000/api/auth/register`
4. This will show what URL the frontend is trying to use

### Solution 4: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try registering again
4. Look for the `/api/auth/register` request
5. Check:
   - **Request URL**: Should be `http://localhost:5000/api/auth/register`
   - **Status**: Will show the error type
   - **Response**: Will show any error messages

### Solution 5: Verify .env File Location
Make sure the `.env` file is in the **frontend** directory, not the root:

```
web3-wallet-project/
  ├── frontend/
  │   ├── .env          ← Should be here
  │   ├── package.json
  │   └── src/
  └── backend/
```

### Solution 6: Check for Port Conflicts
The backend might be running but not accessible. Check:

1. Open a new terminal
2. Test the backend directly:
   ```powershell
   # PowerShell
   Invoke-WebRequest -Uri http://localhost:5000 -UseBasicParsing
   ```

If this fails, the backend might not be running properly even though port 5000 is in use.

### Solution 7: Clear Browser Cache
Sometimes cached data causes issues:

1. Press Ctrl+Shift+R (hard refresh)
2. Or clear browser cache and reload

## Still Not Working?

Check these:

1. **Is the frontend running?** (Should be on http://localhost:3000)
2. **Are both servers running?**
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm start`
3. **Check the exact error in browser console** - the new error handling will show more details
4. **Try accessing the backend directly**: http://localhost:5000/health

## Expected Behavior After Fix

When you try to register, you should see in the browser console:
```
Attempting registration to: http://localhost:5000/api/auth/register
```

And the Network tab should show a request to that URL with status 200 or 201 (success) or 400 (validation error with message).

