# Bug Report - Tick-It Application

## Summary
This document outlines bugs discovered and resolved during the development and testing phase of the Tick-It application. All listed bugs have been identified, reproduced, and successfully fixed.

---

## 🔧 Fixed Bugs

### 1. **Offline Settings Sync Issue**
- **Severity:** High
- **Category:** Data Persistence
- **Description:** When users went offline and changed notification settings, the changes were lost when going back online due to old Firestore data overwriting newer local changes.
- **Steps to Reproduce:**
  1. Toggle app to offline mode
  2. Change notification frequency (e.g., from "none" to "once")
  3. Navigate back to Settings screen
  4. Toggle back to online mode
  5. Settings would revert to old values
- **Root Cause:** The `loadNotificationSettings()` function unconditionally loaded from Firestore, overwriting newer AsyncStorage data with stale cloud data.
- **Fix Applied:** Added `pendingSync` flag to prevent Firestore loads when local changes are pending sync. Implemented proper sync priority: local changes always take precedence over cloud data.
- **Files Modified:** `screens/NotificationSettingsScreen.tsx`, `contexts/AccessibilityContext.tsx`

### 2. **Settings Screen Not Updating After Navigation**
- **Severity:** Medium
- **Category:** UI State Management
- **Description:** When users changed notification settings and navigated back to the Settings screen, the displayed values didn't reflect the changes.
- **Steps to Reproduce:**
  1. Go to Notification Settings
  2. Change frequency setting
  3. Navigate back to Settings screen
  4. Old frequency value still displayed
- **Root Cause:** Settings screen wasn't reloading data when coming back into focus.
- **Fix Applied:** Added `useFocusEffect` hook to reload settings from AsyncStorage when the screen gains focus. Added logic to prioritize local changes over cloud data when pending sync exists.
- **Files Modified:** `screens/SettingsScreen.tsx`

### 3. **Draft Auto-Save Data Loss on App Crash**
- **Severity:** High
- **Category:** Data Loss Prevention
- **Description:** Users would lose all entered data if the app crashed while adding/editing todos or expenses.
- **Steps to Reproduce:**
  1. Start adding a new todo/expense
  2. Enter title, description, and other details
  3. Force close the app before saving
  4. Reopen app - all data lost
- **Root Cause:** No auto-save mechanism for form data during entry.
- **Fix Applied:** Implemented debounced auto-save (1-second delay) to AsyncStorage for both todo and expense forms. Added draft restoration prompts with "Restore" or "Discard" options. Added visual draft indicators in modal headers.
- **Files Modified:** `screens/TodoScreen.tsx`, `screens/ExpenseScreen.tsx`

### 4. **Manual Offline Mode Missing**
- **Severity:** Medium
- **Category:** User Control
- **Description:** Users had no way to manually control offline mode for testing or when they wanted to work offline despite having internet connection.
- **Steps to Reproduce:**
  1. Have internet connection
  2. Want to work offline for testing or preference
  3. No manual toggle available
- **Root Cause:** Only automatic network detection existed, no user preference control.
- **Fix Applied:** Added manual offline mode toggle in Settings screen with visual indicators (green for online, orange for offline mode, red for no connection). Added user preference persistence in AsyncStorage.
- **Files Modified:** `screens/SettingsScreen.tsx`, `contexts/AccessibilityContext.tsx`

### 5. **Expense Validation Too Restrictive**
- **Severity:** Medium
- **Category:** Business Logic
- **Description:** Users were forced to add at least one person when creating expenses, preventing personal expense tracking.
- **Steps to Reproduce:**
  1. Try to add a personal expense
  2. Leave participants list empty
  3. Get error: "Please add at least one person who owes money"
  4. Cannot save personal expenses
- **Root Cause:** Validation required at least one participant for all expenses.
- **Fix Applied:** Removed validation requiring participants. Made participants truly optional. Updated "This Month" to "Spent This Month" for clarity. Allowed removal of all participants from expense forms.
- **Files Modified:** `screens/ExpenseScreen.tsx`

### 6. **Notification Settings Day Buttons Inconsistent Size**
- **Severity:** Low
- **Category:** UI Consistency
- **Description:** In weekly notification settings, the "Saturday" button appeared larger than other day buttons, breaking visual consistency.
- **Steps to Reproduce:**
  1. Go to Notification Settings
  2. Select "Weekly" frequency
  3. Observe day buttons (Mon-Sun)
  4. Saturday button noticeably larger
- **Root Cause:** CSS flexbox with `flex: 1` and `minWidth: 13%` caused uneven distribution with the last button taking extra space.
- **Fix Applied:** Changed to equal width distribution using `flex: 1` with proper spacing. Removed flexWrap to keep all buttons on same line. Applied consistent `marginHorizontal: 2` for uniform spacing.
- **Files Modified:** `screens/NotificationSettingsScreen.tsx`

### 7. **UI Layout Issues in Notification Settings**
- **Severity:** Low
- **Category:** User Experience
- **Description:** "Repeat On" section appeared after "Reminder Time", which was counterintuitive for user flow.
- **Steps to Reproduce:**
  1. Go to Notification Settings
  2. Select "Weekly" frequency
  3. See "Reminder Time" before "Repeat On"
- **Root Cause:** Illogical order of form sections.
- **Fix Applied:** Reordered sections so "Repeat On" appears before "Reminder Time" for better user flow.
- **Files Modified:** `screens/NotificationSettingsScreen.tsx`

### 8. **Login Screen Layout Inconsistency**
- **Severity:** Low
- **Category:** UI Consistency
- **Description:** "Forgot Password?" link appeared disconnected from the password field, reducing usability.
- **Steps to Reproduce:**
  1. Go to Login screen
  2. Notice "Forgot Password?" link positioned away from password input
  3. Less intuitive user flow
- **Root Cause:** Link was positioned as separate element outside password input container.
- **Fix Applied:** Moved "Forgot Password?" link to left bottom of password input field for better visual association and user experience.
- **Files Modified:** `screens/LoginScreen.tsx`

### 9. **Logout Confirmation Style Inconsistency**
- **Severity:** Low
- **Category:** UI Consistency
- **Description:** Logout confirmation dialog had different formatting than other confirmation dialogs (delete task, delete expense).
- **Steps to Reproduce:**
  1. Compare logout confirmation with delete task confirmation
  2. Notice formatting differences in button structure
- **Root Cause:** Inconsistent code formatting in Alert.alert button arrays.
- **Fix Applied:** Standardized logout confirmation formatting to match other confirmation dialogs with consistent indentation and structure.
- **Files Modified:** `screens/SettingsScreen.tsx`

---

## 🧪 Testing Coverage

### Test Scenarios Covered:
1. **Offline Workflow Testing:**
   - Go offline → Change settings → Go online → Verify sync
   - Draft data persistence during offline state
   - Network state transition handling

2. **Data Persistence Testing:**
   - App crash during form entry
   - Navigation between screens with unsaved data
   - AsyncStorage vs Firestore data priority

3. **UI Consistency Testing:**
   - Cross-screen confirmation dialog patterns
   - Form layout and visual consistency
   - Responsive design across different screen sizes

4. **User Flow Testing:**
   - Complete expense creation without participants
   - Manual offline mode toggle functionality
   - Notification settings with different frequencies

---

## 📈 Impact Assessment

### Performance Improvements:
- Reduced unnecessary Firestore reads when offline changes exist
- Optimized AsyncStorage usage with proper cleanup
- Better memory management with debounced auto-save

### User Experience Improvements:
- Zero data loss with draft auto-save feature
- Intuitive manual offline control
- Consistent UI patterns across the application
- More flexible expense tracking options

### Code Quality Improvements:
- Consistent error handling patterns
- Proper separation of online/offline logic
- Better state management with pending sync flags
- Standardized confirmation dialog patterns

---

## 🔍 Bug Prevention Measures

### Implemented:
1. **Comprehensive AsyncStorage caching** for all user settings
2. **Pending sync flag system** to prevent data overwrites
3. **useFocusEffect hooks** for screen state updates
4. **Debounced auto-save** for form data protection
5. **Consistent UI patterns** across all confirmation dialogs

### Recommended for Future:
1. Unit tests for critical sync logic
2. Integration tests for offline/online transitions
3. UI consistency linting rules
4. Automated testing for data persistence scenarios

---

**Report Generated:** December 2, 2025  
**Status:** All bugs resolved and tested  
**Next Steps:** Stage and commit to repository for documentation