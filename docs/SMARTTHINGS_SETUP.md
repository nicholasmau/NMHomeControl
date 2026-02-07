# Getting Your SmartThings Personal Access Token

This guide will walk you through creating a Personal Access Token (PAT) for SmartThings API access.

## Prerequisites

- A Samsung account
- At least one SmartThings hub or device

## Steps

### 1. Log into SmartThings

Go to [https://account.smartthings.com/login](https://account.smartthings.com/login) and sign in with your Samsung account.

### 2. Navigate to Personal Access Tokens

Once logged in, go to: [https://account.smartthings.com/tokens](https://account.smartthings.com/tokens)

Or navigate manually:
1. Click on your profile icon in the top right
2. Select "Personal Access Tokens"

### 3. Generate New Token

1. Click "Generate new token" button
2. Fill in the token details:
   - **Token name**: `Home Control App` (or any name you prefer)
   - **Authorized scopes**: Select the following:
     - ✅ `r:devices:*` - Read devices
     - ✅ `x:devices:*` - Execute device commands
     - ✅ `r:locations:*` - Read locations (for rooms)
     - ✅ `r:scenes:*` - Read scenes (optional, for future use)
     - ✅ `x:scenes:*` - Execute scenes (optional, for future use)

### 4. Copy Your Token

**IMPORTANT**: After clicking "Generate token", you will see your token **only once**.

1. Copy the token immediately
2. Save it in a secure location (password manager recommended)
3. The token will look like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 5. Add Token to Your Application

1. Open your `.env` file in the project root
2. Find the line: `SMARTTHINGS_TOKEN=your_personal_access_token_here`
3. Replace `your_personal_access_token_here` with your actual token:
   ```
   SMARTTHINGS_TOKEN=12345678-1234-1234-1234-123456789abc
   ```
4. Save the file

## Verify Connection

After adding your token, start the application:

```bash
npm run dev
```

Check the console output for:
```
✓ SmartThings API connection successful
```

If you see a warning about connection failure, verify:
1. Token is correctly copied (no extra spaces)
2. Token has the required scopes
3. Your SmartThings account has active devices

## Security Notes

⚠️ **Never share your Personal Access Token**
- Treat it like a password
- Don't commit it to git (it's already in `.gitignore`)
- Don't share screenshots containing the token
- If compromised, revoke it immediately and generate a new one

## Revoking a Token

If you need to revoke a token:

1. Go to [https://account.smartthings.com/tokens](https://account.smartthings.com/tokens)
2. Find your token in the list
3. Click the trash icon next to it
4. Confirm revocation

After revoking, generate a new token and update your `.env` file.

## Troubleshooting

### "SmartThings connection test failed"

- **Check token format**: Ensure no extra spaces or characters
- **Verify scopes**: Token must have device read/execute permissions
- **Check network**: Ensure your computer can reach api.smartthings.com
- **Token expiration**: Tokens don't expire by default, but check if it was revoked

### "No devices found"

- Ensure you have devices added to your SmartThings account
- Check that devices are online in the SmartThings mobile app
- Verify your location/hub is active

### "Failed to execute command"

- Device may be offline
- Check device battery if battery-powered
- Verify the device supports the capability you're trying to control

## Supported Device Capabilities

The application supports any SmartThings device with these capabilities:

- **switch**: On/off control (lights, switches, plugs)
- **switchLevel**: Dimming control
- **colorControl**: Color changing (RGB lights)
- **colorTemperature**: White temperature (warm/cool)
- **thermostatMode**: Thermostat mode control
- **thermostatSetpoint**: Temperature setpoints
- **lock**: Lock/unlock
- **motionSensor**: Motion detection (read-only)
- **contactSensor**: Door/window sensors (read-only)
- **temperatureMeasurement**: Temperature reading (read-only)
- And many more...

For a complete list, see [SmartThings Capabilities Documentation](https://developer.smartthings.com/docs/devices/capabilities/capabilities-reference).
