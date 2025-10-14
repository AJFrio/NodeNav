# MapBox Setup Guide

## Getting Your MapBox Access Token

To use the Navigation feature, you'll need a MapBox access token. Follow these steps:

### 1. Create a MapBox Account
- Go to [https://account.mapbox.com/auth/signup/](https://account.mapbox.com/auth/signup/)
- Sign up for a free account

### 2. Get Your Access Token
- After signing up, you'll be taken to your account page
- Navigate to the "Access tokens" section
- Copy your default public token, or create a new one

### 3. Create Environment File
- Copy the `env.example` file to `.env` in the root directory:
  
  **On macOS/Linux:**
  ```bash
  cp env.example .env
  ```
  
  **On Windows (PowerShell):**
  ```powershell
  Copy-Item env.example .env
  ```

- Open the `.env` file in your editor
- Replace `your_mapbox_access_token_here` with your actual token

Your `.env` file should look like:
```
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZjB4eHh4eDAwMDAwM28wMDAwMDAwMDAifQ.xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:** 
- The `.env` file is gitignored and won't be committed to version control
- Never commit your access token to git
- In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client

### 4. Install Dependencies
Run the following command to install MapBox GL JS:
```bash
npm install
```

### 5. Restart Development Server
**Important:** After creating or modifying the `.env` file, you must restart the development server for the changes to take effect:
```bash
npm run dev
```
or
```bash
npm run electron-dev
```

## MapBox Features

The MapBox component supports the following props:

- **`center`**: [longitude, latitude] - Map center coordinates
- **`zoom`**: Number (0-22) - Zoom level
- **`bearing`**: Number (0-360) - Map rotation in degrees
- **`pitch`**: Number (0-60) - Map tilt angle in degrees
- **`style`**: String - MapBox style URL
- **`onMapLoad`**: Function - Callback when map finishes loading

## Free Tier Limits

MapBox offers a generous free tier:
- 50,000 map loads per month
- 100,000 requests for static images
- 50,000 directions requests
- More than enough for personal projects!

## Dark Mode Support

The Navigation component automatically switches between MapBox's dark and light styles based on your theme preference:
- **Dark Mode**: Uses `mapbox://styles/mapbox/dark-v11`
- **Light Mode**: Uses `mapbox://styles/mapbox/streets-v12`

## Documentation

For more information, visit the [MapBox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/guides/).

