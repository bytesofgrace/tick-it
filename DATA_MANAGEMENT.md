# Data Management & Auto-Cleanup Documentation

## Overview
Tick-It includes a powerful data management system that automatically cleans up old completed tasks and expenses based on user preferences.

## Features

### 1. **Automatic Cleanup**
- **Completed Tasks**: Auto-delete after 24 hours (default)
- **Old Expenses**: Auto-delete after 30 days (optional, off by default)
- Runs automatically every 6 hours when app is active
- Runs on app startup/login

### 2. **User-Configurable Settings**
Users can customize:
- Enable/disable auto-cleanup for tasks and expenses
- Set retention period for completed tasks (12h, 24h, 48h, 1 week)
- Set retention period for expenses (7, 30, 60, 90 days)
- View current data statistics

### 3. **Bulk Cleanup Actions**
- Delete all completed tasks at once
- Delete old expenses by age (choose retention period)
- Manual cleanup trigger button
- See count of items before deletion

### 4. **Completion Timestamps**
- Tasks now store `completedAt` timestamp when marked as complete
- Used to calculate accurate deletion timing
- Automatically removed when task is uncompleted

## How It Works

### For Users:
1. Go to **Settings → Data Management**
2. Toggle auto-cleanup options on/off
3. Adjust retention periods as needed
4. Use bulk actions for immediate cleanup
5. Monitor current data statistics

### Automatic Cleanup Flow:
1. App checks if 6+ hours have passed since last cleanup
2. If auto-delete is enabled for tasks:
   - Finds all completed tasks with `completedAt` timestamp
   - Deletes tasks older than retention period (default 24h)
3. If auto-delete is enabled for expenses:
   - Finds all expenses older than retention period (default 30 days)
   - Deletes matching expenses
4. Updates last cleanup timestamp

### Manual Cleanup:
- Users can trigger cleanup anytime via "Run Cleanup Now" button
- Bulk actions bypass retention periods for immediate deletion
- Confirmation dialogs prevent accidental deletions

## Technical Implementation

### CleanupService Methods:

```typescript
// Get/save user preferences
CleanupService.getCleanupSettings()
CleanupService.saveCleanupSettings(settings)

// Automatic cleanup
CleanupService.runAutoCleanup(userId)

// Specific cleanup actions
CleanupService.cleanupCompletedTasks(userId, retentionHours)
CleanupService.cleanupOldExpenses(userId, retentionDays)

// Bulk actions
CleanupService.bulkDeleteAllCompletedTasks(userId)
CleanupService.bulkDeleteOldExpenses(userId, olderThanDays)

// Statistics
CleanupService.getCleanupStats(userId)
```

### Data Model Changes:

**Todo Document:**
```javascript
{
  title: string,
  description: string,
  completed: boolean,
  completedAt: Timestamp | null,  // NEW: Set when task completed
  createdAt: Timestamp,
  updatedAt: Timestamp,
  userId: string,
  priority: boolean,
  dueDate?: Timestamp
}
```

**Expense Document:**
```javascript
{
  title: string,
  amount: number,
  people: Array,
  createdAt: Timestamp,  // Used for age-based cleanup
  userId: string
}
```

### Settings Storage:

Settings are stored in AsyncStorage (local to device):
```javascript
{
  autoDeleteCompletedTasks: boolean,    // Default: true
  taskRetentionHours: number,           // Default: 24
  autoDeleteOldExpenses: boolean,       // Default: false
  expenseRetentionDays: number,         // Default: 30
  lastCleanupDate: string               // ISO date string
}
```

## User Interface

### Data Management Screen Sections:

1. **Current Data**
   - Shows count of completed tasks
   - Shows count of old expenses (30+ days)

2. **Automatic Cleanup**
   - Toggle switches for tasks and expenses
   - Retention period adjustment buttons
   - "Run Cleanup Now" manual trigger

3. **Bulk Actions**
   - Delete all completed tasks
   - Delete old expenses (choose age)
   - Shows item counts before deletion

4. **Info Section**
   - Explains cleanup frequency
   - Warns about permanent deletion

## Safety Features

- **Confirmation Dialogs**: All bulk actions require confirmation
- **Item Counts**: Shows exactly how many items will be deleted
- **Granular Control**: Separate toggles for tasks vs expenses
- **Adjustable Periods**: Users choose their own retention times
- **Manual Override**: Can disable auto-cleanup entirely
- **Undo Protection**: Once deleted, items cannot be recovered (by design)

## Default Behavior

Out of the box:
- ✅ Auto-delete completed tasks: **ENABLED** (24 hours)
- ❌ Auto-delete expenses: **DISABLED**
- 🔄 Cleanup frequency: Every 6 hours
- 🚀 Runs on: App startup + periodic checks

## Examples

### Example 1: Task Cleanup
1. User completes a task at 2:00 PM on Monday
2. Task gets `completedAt = Monday 2:00 PM`
3. Next cleanup runs Tuesday 2:00 PM (24h later)
4. Task is automatically deleted

### Example 2: Expense Cleanup
1. User creates expense on Jan 1st
2. User enables auto-delete for expenses (30 days)
3. Next cleanup after Jan 31st
4. Expense is automatically deleted

### Example 3: Bulk Cleanup
1. User has 50 completed tasks
2. Goes to Data Management → Bulk Actions
3. Taps "Delete all completed tasks"
4. Confirms dialog
5. All 50 tasks deleted immediately

## Migration Notes

For existing tasks without `completedAt`:
- System will not auto-delete them (safe mode)
- When user toggles task completion, `completedAt` is set
- After that, they become eligible for auto-cleanup

## Troubleshooting

**Q: My completed tasks aren't being deleted**
- Check if auto-delete is enabled in Data Management
- Verify task has `completedAt` timestamp (complete it again if needed)
- Check if retention period has passed
- Try "Run Cleanup Now" button

**Q: Can I recover deleted items?**
- No, deletion is permanent
- This is by design to free up storage
- Adjust retention periods before enabling auto-delete

**Q: How do I disable auto-cleanup?**
- Go to Settings → Data Management
- Toggle off "Auto-delete completed tasks"
- Toggle off "Auto-delete old expenses"

## Files Modified/Created:

1. ✅ `services/CleanupService.ts` - Core cleanup logic
2. ✅ `screens/DataManagementScreen.tsx` - Settings UI
3. ✅ `screens/SettingsScreen.tsx` - Added Data Management link
4. ✅ `screens/TodoScreen.tsx` - Added `completedAt` timestamp
5. ✅ `App.tsx` - Integrated auto-cleanup on startup
6. ✅ `README.md` - Added cleanup features

## Future Enhancements

- [ ] Archive feature instead of delete
- [ ] Export data before deletion
- [ ] Custom cleanup schedules (specific times)
- [ ] Email notifications before auto-delete
- [ ] Restore recently deleted items (undo window)
- [ ] Cloud backup integration
