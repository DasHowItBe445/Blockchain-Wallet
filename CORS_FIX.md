# CORS Error Fix

## Problem
You're seeing a CORS error when trying to register. The error shows up in the browser console/network tab.

## Root Cause
CORS (Cross-Origin Resource Sharing) middleware needs to be placed **BEFORE** body parsing middleware to properly handle preflight OPTIONS requests.

## Fix Applied
1. ✅ Moved CORS middleware to the very top (before body parsers)
2. ✅ Made CORS more permissive for development (allows all origins)
3. ✅ Added proper headers and methods
4. ✅ Set `optionsSuccessStatus: 200` for better browser compatibility

## Important: Restart Backend Server

**You MUST restart the backend server for this change to take effect:**

1. Stop the backend server (Ctrl+C in the terminal where it's running)
2. Start it again:
   ```bash
   cd backend
   npm run dev
   ```
3. Try registering again

## What Changed

**Before:**
```javascript
// Body parser first (WRONG)
app.use(express.json());
app.use(cors({ ... }));
```

**After:**
```javascript
// CORS first (CORRECT)
app.use(cors({ ... }));
app.use(express.json());
```

## Why This Matters

When a browser makes a cross-origin request, it first sends an OPTIONS request (preflight) to check if the server allows the request. The CORS middleware needs to handle this OPTIONS request **before** body parsers try to parse it, otherwise the preflight fails.

## Testing

After restarting the backend:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try registering
4. You should see:
   - **OPTIONS** request to `/api/auth/register` with status 200
   - **POST** request to `/api/auth/register` with status 201 or 400
   - No CORS errors

## If Still Getting CORS Errors

1. **Verify backend restarted**: Check the terminal shows server restarted
2. **Clear browser cache**: Press Ctrl+Shift+R (hard refresh)
3. **Check browser console**: Look for the exact CORS error message
4. **Verify frontend URL**: Should be `http://localhost:3000` (or whatever port React is using)

## Alternative: Check Actual Origin

If you're running the frontend on a different port, you can check what origin the browser is sending:

1. Open browser DevTools → Network tab
2. Click on the failed request
3. Look at Request Headers → `Origin: http://localhost:XXXX`
4. Make sure that origin is allowed in CORS config

For development, the current config allows all origins, so this shouldn't be an issue.

