# Deployment Guide for Emilash Shipping Site

## Prerequisites

1. **GitHub Repository**: Create a new repository on GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)

## Step 1: Push Code to GitHub

```bash
# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/emilash-shipping-site.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Environment Variables for Render

Set these environment variables in your Render web service:

```env
NODE_ENV=production
SESSION_SECRET=your_secure_session_secret_here
COMPANY_NAME=Emilash Logistics
COMPANY_EMAIL=support@emilashlogistics.com
COMPANY_PHONE=+1-555-EMILASH
COMPANY_ADDRESS=123 Logistics Avenue, Shipping District, City 12345
TIMEZONE=UTC
SITE_BASE_URL=https://your-app-name.onrender.com
```

## Step 3: Database Connection

The PostgreSQL database connection will be automatically configured via the `DATABASE_URL` environment variable that Render provides.

## Step 4: Web Service Configuration

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: 18+
- **Environment**: Node
- **Plan**: Starter (or higher)

## Step 5: Connect Database

In your Render dashboard:
1. Go to your PostgreSQL database
2. Copy the connection details
3. The `DATABASE_URL` will be automatically available to your web service

## Features

- ✅ PostgreSQL database support
- ✅ Admin panel with authentication
- ✅ Shipment management
- ✅ Status tracking
- ✅ Public tracking page
- ✅ Responsive design
- ✅ Email notifications (configure SMTP)

## Default Admin Login

- Email: `admin@emilash.local`
- Password: `admin123`

**⚠️ Change these credentials after first login!**

## Post-Deployment

1. Access your admin panel at `/admin/login`
2. Update admin credentials
3. Configure SMTP settings for email notifications
4. Test the public tracking page
5. Customize company information in settings

## Troubleshooting

- Check Render logs if deployment fails
- Ensure all environment variables are set
- Verify database connection
- Check that the PostgreSQL database is in the same region as your web service
