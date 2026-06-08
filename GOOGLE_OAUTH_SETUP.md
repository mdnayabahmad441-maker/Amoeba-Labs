# 🔐 Google OAuth Setup Guide

Google OAuth is now integrated into Amoeba Labs! Here's how to enable it:

---

## **Step 1: Create Google OAuth Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Go to **APIs & Services** → **Credentials**
4. Click **+ Create Credentials** → **OAuth 2.0 Client IDs**
5. If prompted, configure the OAuth consent screen first:
   - User Type: **External**
   - App name: **Amoeba Labs**
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes: **email, profile, openid** (default)
6. Back to Credentials → **OAuth 2.0 Client IDs** → **Web Application**
7. Add authorized redirect URIs:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```
8. Copy your **Client ID** and **Client Secret**

---

## **Step 2: Enable Google in Supabase**

1. Go to [Supabase Dashboard](https://supabase.com) → Your Project
2. Navigate to **Authentication** → **Providers**
3. Find **Google** provider
4. Toggle it **ON**
5. Paste your **Client ID** and **Client Secret** from Google Cloud
6. Click **Save**

---

## **Step 3: Configure Redirect URLs in Supabase**

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: `https://your-production-domain.com`
3. Add **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```
4. Save

---

## **Step 4: Test It**

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/auth/login`
3. Click **"Continue with Google"**
4. You should be redirected to Google login
5. After login, you'll be redirected to `/portal`

---

## **How It Works**

### **Login/Signup Flow**
1. User clicks **"Continue with Google"** button
2. Redirected to Google login screen
3. User authorizes the app
4. Google redirects to `/auth/callback` with code
5. Your app exchanges code for session with Supabase
6. User redirected to `/portal` dashboard

### **Files Changed**
- ✅ `lib/auth.ts` - Added `signInWithGoogle()` function
- ✅ `app/auth/login/page.tsx` - Added Google sign-in button
- ✅ `app/auth/signup/page.tsx` - Added Google sign-up button
- ✅ `app/auth/callback/route.ts` - OAuth callback handler (NEW)

---

## **Troubleshooting**

### **"Redirect URI mismatch" error**
- Check that redirect URI in Google Cloud Console matches Supabase settings
- Make sure `http://localhost:3000/auth/callback` is added in both places

### **"Client ID not found" error**
- Verify Client ID and Secret are correct in Supabase
- Make sure Google provider is toggled ON

### **"Invalid code" error**
- Try clearing browser cookies
- Restart dev server
- Create new OAuth credentials

### **User not logged in after redirect**
- Check browser console for errors
- Verify Supabase project URL and Key are correct
- Make sure Auth is enabled in Supabase

---

## **Security Notes**

✅ OAuth flow uses Supabase's secure token exchange
✅ No passwords transmitted to Google
✅ User email and profile automatically synced
✅ Sessions managed by Supabase middleware

---

## **Optional: Fine-tune Google OAuth**

### **Get User Info from Google**

Add scopes in Supabase → Authentication → Providers → Google:
```
openid email profile
```

This gives you access to:
- Email
- First/Last Name
- Profile picture
- And more

### **Auto-fill User Profile**

After OAuth, user data is automatically saved in Supabase `auth.users` table with metadata.

---

## **What Users See**

**Before**: Only email/password login
**Now**: 
- Email/password option
- "Continue with Google" button
- Same seamless experience

---

**Google OAuth is now live! Your users can sign in with a single click.** 🚀
