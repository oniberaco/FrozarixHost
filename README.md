ZerionHost demo API + frontend

Quick start (PowerShell):

1. Install dependencies

```powershell
npm install
```

2. Run server

```powershell
npm start
# or
node server.js
```

3. Open the site in your browser:

- http://localhost:3000/login.html — login/register UI
- http://localhost:3000/dashboard.html — dashboard (requires login)

Notes:
- This is a demo. Do not use this setup in production.
- The server stores users in `users.json` and uses a simple JWT token (secret from `ZH_JWT_SECRET` env var if set).
- Passwords are hashed with `bcryptjs`.
