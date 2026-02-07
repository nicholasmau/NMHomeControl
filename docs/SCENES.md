# Scene Control Feature

## Overview

The Scene Control feature allows users to execute SmartThings scenes directly from the Home Control dashboard. Scenes enable you to control multiple devices simultaneously with a single action.

## Architecture

### Backend Components

#### SmartThings Service (`smartthings.service.ts`)

**Scene Interface:**
```typescript
export interface Scene {
  sceneId: string;
  sceneName: string;
  sceneIcon?: string;        // Icon identifier for UI
  sceneColor?: string;       // Color identifier for UI
  locationId: string;
  createdBy: string;
  createdDate: string;
  lastUpdatedDate: string;
  lastExecutedDate?: string; // When scene was last executed
}
```

**Methods:**
- `getScenes(): Promise<Scene[]>` - Fetches all scenes from SmartThings API
  - Retrieves location ID from `/locations` endpoint
  - Queries `/scenes` endpoint with locationId parameter
  - Returns array of Scene objects
  - Includes telemetry tracking

- `executeScene(sceneId: string): Promise<void>` - Executes a specific scene
  - POST to `/scenes/{sceneId}/execute` endpoint
  - Logs execution with audit and telemetry
  - Error handling and logging

#### Scene Routes (`scene.routes.ts`)

**Endpoints:**

1. `GET /api/scenes` - Get all scenes
   - Authentication required
   - First login check required
   - Returns: `{ scenes: Scene[] }`
   - Demo mode: Returns demo scenes from demo data

2. `POST /api/scenes/:sceneId/execute` - Execute a scene
   - Authentication required
   - First login check required
   - Parameters: `sceneId` in URL
   - Returns: `{ success: true }`
   - Demo mode: Simulates execution without API call
   - Includes audit logging and telemetry

### Frontend Components

#### Scene API (`lib/api.ts`)

```typescript
export const sceneAPI = {
  getScenes: async () => {
    // Checks demo mode
    // Calls GET /api/scenes
    // Returns { scenes: Scene[] }
  },
  
  executeScene: async (sceneId: string) => {
    // Checks demo mode
    // Calls POST /api/scenes/{sceneId}/execute
    // Returns { success: true }
  }
}
```

#### SceneCard Component (`components/SceneCard.tsx`)

Displays individual scene as an interactive card with:
- Scene name
- Icon (based on sceneIcon field)
- Color theme (based on sceneColor field)
- Last executed timestamp
- Execute button with loading state
- Success feedback animation

**Supported Icons:**
- `sunrise` - Good Morning scenes
- `moon` - Good Night scenes
- `tv` - Entertainment/Movie scenes
- `lock` - Security/Away scenes
- `home` - Welcome Home scenes

**Color Themes:**
- `amber` - Morning/sunrise
- `indigo` - Night/sleep
- `purple` - Entertainment
- `red` - Security/alert
- `green` - Home/welcome
- `blue` - General
- `gray` - Default

#### Dashboard Integration (`pages/DashboardPage.tsx`)

- New "Scenes" tab (first tab)
- Scene count display: `Scenes (5)`
- Grid layout for scene cards
- Empty state message when no scenes available
- Integrated with React Query for caching
- Optimistic updates for instant feedback

### Demo Mode

#### Demo Data (`lib/demoData.ts`)

Provides 5 sample scenes for testing:
1. **Good Morning** - amber/sunrise
2. **Good Night** - indigo/moon
3. **Movie Time** - purple/tv
4. **Away Mode** - red/lock
5. **Welcome Home** - green/home

Demo scenes include realistic metadata (timestamps, IDs, etc.) for accurate UI testing.

## SmartThings API Integration

### Scenes Endpoint

**Base URL:** `https://api.smartthings.com/v1`

**Authentication:** Bearer token with `x:scenes:*` scope

**Get Scenes:**
```
GET /scenes?locationId={locationId}
```

Response:
```json
{
  "items": [
    {
      "sceneId": "uuid",
      "sceneName": "Good Morning",
      "sceneIcon": "sunrise",
      "sceneColor": "amber",
      "locationId": "uuid",
      "createdBy": "user-id",
      "createdDate": "2024-01-01T00:00:00.000Z",
      "lastUpdatedDate": "2024-01-01T00:00:00.000Z",
      "lastExecutedDate": "2024-01-15T07:00:00.000Z"
    }
  ]
}
```

**Execute Scene:**
```
POST /scenes/{sceneId}/execute
```

Response:
```json
{
  "status": "success"
}
```

## Features

### Scene Discovery
- Automatically fetches scenes from SmartThings account
- Displays all available scenes in dashboard
- Real-time updates via React Query

### Scene Execution
- One-click execution from dashboard
- Loading states during execution
- Success/error feedback
- Audit logging of all executions
- Telemetry for performance monitoring

### Visual Design
- Color-coded scene cards for quick identification
- Icon support for common scene types
- Last executed timestamp
- Responsive grid layout

### Security & Auditing
- All scene executions logged in audit log
- User authentication required
- First login password change enforcement
- Session-based access control

## User Guide

### Viewing Scenes

1. Log into the dashboard
2. Click the "Scenes" tab (first tab)
3. View all available scenes as cards
4. Each card shows:
   - Scene name
   - Icon and color theme
   - Last execution time
   - Execute button

### Executing a Scene

1. Navigate to the "Scenes" tab
2. Find the desired scene
3. Click the "Execute Scene" button
4. Wait for confirmation:
   - Loading spinner during execution
   - Green checkmark on success
   - Error message on failure

### Creating Scenes

Scenes must be created in the SmartThings mobile app or web interface. Once created, they will automatically appear in the Home Control dashboard.

## Technical Details

### Telemetry

Scene executions are tracked with:
- `metric: 'scene.execute'`
- `sceneId`: Scene identifier
- `responseTime`: Execution duration (ms)
- `success`: true/false

### Audit Logging

All scene executions create audit log entries:
```typescript
{
  action: 'scene.execute',
  user: username,
  sceneId: sceneId,
  success: true/false,
  ip: client IP address,
  timestamp: ISO 8601 datetime
}
```

### Error Handling

- Network errors: Displayed to user with retry option
- Authentication errors: Redirect to login
- SmartThings API errors: Logged and reported to user
- Demo mode: Simulates successful execution

## Future Enhancements

Potential features for future releases:

1. **Scene Creation**
   - Create scenes from Home Control UI
   - Configure devices and actions
   - Set icons and colors

2. **Scene Scheduling**
   - Schedule scenes to run at specific times
   - Recurring scene execution
   - Sunrise/sunset triggers

3. **Scene Favorites**
   - Mark frequently used scenes
   - Quick access toolbar
   - Custom scene ordering

4. **Scene Groups**
   - Organize scenes into categories
   - Filter by room or purpose
   - Custom grouping options

5. **Advanced Execution**
   - Scene execution history
   - Undo last scene execution
   - Chain multiple scenes

## Troubleshooting

### Scenes Not Appearing

**Issue:** No scenes displayed in dashboard

**Solutions:**
1. Verify SmartThings token has `x:scenes:*` scope
2. Check scenes exist in SmartThings account
3. Review backend logs for API errors
4. Ensure location ID is correct

### Scene Execution Fails

**Issue:** Scene execution returns error

**Solutions:**
1. Check SmartThings API connectivity
2. Verify scene still exists (may have been deleted)
3. Review audit logs for error details
4. Check SmartThings token permissions

### Demo Mode Issues

**Issue:** Demo scenes not working

**Solutions:**
1. Verify demo mode is enabled (`localStorage.demoMode = 'true'`)
2. Check browser console for errors
3. Refresh page to reload demo data

## API Reference

### Frontend

```typescript
// Get all scenes
const { data, isLoading } = useQuery({
  queryKey: ['scenes'],
  queryFn: sceneAPI.getScenes,
});

// Execute a scene
const handleExecute = async (sceneId: string) => {
  await sceneAPI.executeScene(sceneId);
};
```

### Backend

```typescript
// SmartThings Service
const scenes = await smartThingsService.getScenes();
await smartThingsService.executeScene(sceneId);
```

## Security Considerations

1. **Authentication:** All scene endpoints require valid session
2. **Authorization:** First login password change enforced
3. **Audit Trail:** All executions logged with user and timestamp
4. **Rate Limiting:** Inherited from Fastify rate limit middleware
5. **Token Security:** SmartThings token stored securely in environment

## Performance

- Scene listing cached by React Query
- Optimistic updates for instant UI feedback
- Telemetry tracking for response times
- Efficient grid rendering with React memoization
