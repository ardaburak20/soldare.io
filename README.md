# Soldare.io Backend Server

Multiplayer 2D top-down .io game backend with Socket.io

## Glitch Deployment

1. Go to https://glitch.com
2. Click "New Project" → "Import from GitHub" 
3. Or manually create project and upload these files:
   - server.js
   - package.json
   - config.json (empty: `{}`)
   - users.json (empty: `{}`)
   - highscores.json (empty: `{}`)

## Environment Variables (Optional)

- `PORT` - Server port (default: 3000)

## Features

- Real-time multiplayer gameplay
- Regional pricing with IP detection
- Xsolla payment integration
- Google OAuth login
- High score persistence
- Gold & items system
