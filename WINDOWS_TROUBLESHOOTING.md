# Windows Electron Development Troubleshooting

## Problem: `npm run electron:dev` fails with timeout error

### Quick Fixes (try in order)

#### 1. Check if port 3000 is in use
Open PowerShell and run:
```powershell
netstat -ano | findstr :3000
```

If you see output, another process is using port 3000. Kill it with:
```powershell
# Replace <PID> with the Process ID from the netstat output
taskkill /PID <PID> /F
```

#### 2. Update the dev script for Windows compatibility

The current `scripts/dev.js` might not work on Windows. Replace it with the Windows-compatible version below.

#### 3. Verify database is initialized
```bash
npm run db:setup
```

#### 4. Clean reinstall dependencies
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Rebuild native modules for Electron
npm run rebuild
```

#### 5. Increase timeout or run separately
If the Next.js dev server is slow to start, you can:
- Increase timeout in `package.json`: change `-t 30000` to `-t 60000`
- OR run the processes manually in separate terminals:
  ```bash
  # Terminal 1
  npm run dev

  # Terminal 2 (wait for dev server to be ready, then run)
  npm run electron:compile && electron .
  ```

#### 6. Check for errors in dev server
Try running just the dev server to see the actual error:
```bash
npm run dev
```

Look for error messages about database, dependencies, or port conflicts.

## Windows-Specific npm Scripts

If the issue persists, you may need to update `package.json` scripts to use `cross-env` for environment variables or adjust the spawn commands in `scripts/dev.js`.
