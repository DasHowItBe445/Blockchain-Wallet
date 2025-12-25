# Mongoose Pre-Save Hook "next is not a function" Fix

## Problem
Error: `TypeError: next is not a function` at `User.js:57` in the pre-save hook.

## Root Cause
In Mongoose, when using `async` functions for pre-save hooks, you **should NOT** use the `next` callback parameter. Mongoose automatically handles promises from async functions, so passing `next` and trying to call it causes an error because `next` is not provided when using async/await.

## Solution
Removed the `next` parameter from the async pre-save hook. When using async/await, Mongoose will:
- Automatically wait for the promise to resolve
- Handle errors by rejecting the save operation
- No need for the `next` callback

## What Changed

**Before (WRONG for async functions):**
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next(); // ❌ This causes "next is not a function" error
});
```

**After (CORRECT for async functions):**
```javascript
userSchema.pre('save', async function() {
  // Skip if password hasn't been modified
  if (!this.isModified('password')) {
    return;
  }
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // ✅ No next() needed - Mongoose handles the promise
});
```

## Important Notes

### When to use `next`:
- Use `next` callback when using **synchronous** or **callback-based** pre-save hooks
- Example: `userSchema.pre('save', function(next) { ... next(); })`

### When NOT to use `next`:
- Use `async/await` without `next` when using **async** pre-save hooks
- Example: `userSchema.pre('save', async function() { ... })`
- Mongoose automatically handles the promise

## Testing

After this fix:
1. ✅ Registration should work without errors
2. ✅ Password will still be hashed before saving
3. ✅ No "next is not a function" error

## No Restart Needed

Since this is a model file change, you may need to restart the backend server, but often Node.js hot-reloading will pick it up. If you still see the error, restart:

```bash
cd backend
npm run dev
```

