# Network Error Troubleshooting Guide

## Common Network Error Causes

### 1. Backend Server Not Running
**Symptoms**: "Network error: Cannot reach backend server" or "Cannot connect to backend server"

**Solution**:
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Start the backend server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

3. You should see: `🚀 Server running on port 5000`

4. Verify the server is running by opening: http://localhost:5000
   - Should see: `{"message":"NGO Funding Platform API"}`

### 2. Backend Running on Different Port
**Symptoms**: Connection refused errors

**Solution**:
1. Check what port the backend is actually running on (look at terminal output)
2. Update `frontend/.env` file:
   ```
   REACT_APP_API_URL=http://localhost:YOUR_PORT/api
   ```
3. Restart the frontend development server

### 3. Frontend API URL Misconfigured
**Symptoms**: Network errors or CORS errors

**Solution**:
1. Create or check `frontend/.env` file exists
2. Ensure it contains:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```
3. **Important**: Restart the frontend dev server after changing `.env` files
   ```bash
   cd frontend
   npm start
   ```

### 4. MongoDB Connection Issues
**Symptoms**: Backend starts but registration fails with database errors

**Solution**:
1. Ensure MongoDB is running:
   - If using local MongoDB: Start MongoDB service
   - If using MongoDB Atlas: Check connection string

2. Check `backend/.env` file has correct `MONGODB_URI`:
   ```
   MONGODB_URI=mongodb://localhost:27017/trustfund-dao
   ```
   or for MongoDB Atlas:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trustfund-dao
   ```

### 5. CORS Configuration
**Symptoms**: CORS errors in browser console

**Solution**:
- The backend CORS is configured for `http://localhost:3000`
- If frontend runs on a different port, update `backend/server.js`:
  ```javascript
  app.use(cors({
    origin: 'http://localhost:YOUR_FRONTEND_PORT',
    credentials: true
  }));
  ```

## Step-by-Step Startup Checklist

### Backend Setup:
1. ✅ Navigate to backend directory: `cd backend`
2. ✅ Install dependencies (if not done): `npm install`
3. ✅ Create `.env` file with:
   ```
   MONGODB_URI=mongodb://localhost:27017/trustfund-dao
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=5000
   NODE_ENV=development
   ```
4. ✅ Start backend: `npm run dev`
5. ✅ Verify backend is running: Open http://localhost:5000 in browser

### Frontend Setup:
1. ✅ Navigate to frontend directory: `cd frontend`
2. ✅ Install dependencies (if not done): `npm install`
3. ✅ Create `.env` file with:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_CONTRACT_ADDRESS=
   REACT_APP_SEPOLIA_CHAIN_ID=11155111
   ```
4. ✅ Start frontend: `npm start`
5. ✅ Verify frontend opens: http://localhost:3000

## Testing the Connection

### Test 1: Backend Health Check
Open browser or use curl:
```bash
curl http://localhost:5000
```
Expected response:
```json
{"message":"NGO Funding Platform API"}
```

### Test 2: Registration Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"funder"}'
```

Expected response (success):
```json
{"_id":"...","name":"Test User","email":"test@example.com","role":"funder","token":"..."}
```

Expected response (error - user exists):
```json
{"message":"User with this email already exists"}
```

## Browser Console Checks

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try registering
4. Look for the `/api/auth/register` request:
   - **Status 200/201**: Success (but might have validation errors)
   - **Status 400**: Bad request (validation errors - check response)
   - **Status 500**: Server error (check backend logs)
   - **Failed/ERR_CONNECTION_REFUSED**: Backend not running
   - **CORS error**: CORS configuration issue

## Quick Fix Commands

### Windows:
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Check if port 3000 is in use
netstat -ano | findstr :3000
```

### Mac/Linux:
```bash
# Check if port 5000 is in use
lsof -i :5000

# Check if port 3000 is in use
lsof -i :3000
```

## Still Having Issues?

1. **Check backend terminal** for error messages
2. **Check browser console** for detailed error messages
3. **Check Network tab** in browser DevTools to see the actual request/response
4. **Verify MongoDB is running** (if using local MongoDB)
5. **Restart both servers** after making configuration changes
6. **Clear browser cache** and try again

