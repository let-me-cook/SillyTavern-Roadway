# No Assistant Mode TODO

## Current Status
- The "no assistant mode" (noAss function) is implemented and **configurable** in the codebase.
- It consolidates the entire chat history into a single prompt, formatting messages as `{{user}}: content` and `{{char}}: content`.
- The prompt position can be set via `formattedRoleplayMessagePosition` (append_top, append_bottom, or replace variable `{{roadwayNoAssMessages}}`).
- **NEW**: The message role is now configurable via settings - users can select whether the single prompt uses 'user' or 'system' role.
- Added "No Assistant Prompt Role" dropdown in the extension settings UI.
- Settings are properly saved and loaded with the new `noAssRole` option.
- The noAss function calls now use `settings.noAssRole` instead of hardcoded values.
- For impersonation, it correctly uses 'system' role (hardcoded as intended).

## Recent Enhancements Completed
1. ✅ **Configurable Message Role**: Added settings UI to allow users to select 'user' or 'system' role for no-assistant prompts.
2. ✅ **Role Selection in Settings**: Added dropdown in `templates/settings.html` with options for 'user' and 'system'.
3. ✅ **Updated Interface**: Added `noAssRole: 'system' | 'user'` to `ExtensionSettings` interface.
4. ✅ **Default Settings**: Set default `noAssRole` to 'user' in `DEFAULT_SETTINGS`.
5. ✅ **UI Handler**: Added change handler in `handleUIChanges()` to bind the new dropdown and update settings.
6. ✅ **Function Updates**: Modified `noAss()` function calls in `src/index.ts` to use `settings.noAssRole`.
7. ✅ **Impersonation**: Confirmed impersonation still uses 'system' role as intended.
8. ✅ **Test Coverage**: Created comprehensive tests in `src/test/noAssMode.test.ts` covering all functionality.
9. ✅ **Edge Cases**: Tested empty chat history, long prompts, role changes, and system message filtering.
10. ✅ **Version Update**: Ready for version bump if needed.

## TODO Items
- [x] Add "No Assistant Prompt Role" dropdown to `templates/settings.html`
- [x] Update `interface ExtensionSettings` to include `noAssRole: 'system' | 'user'`
- [x] Set default `noAssRole` to 'user' in `DEFAULT_SETTINGS`
- [x] Modify UI change handler in `handleUIChanges()` to bind the new dropdown and update settings on change
- [x] Update `noAss()` function calls in `src/index.ts` to use `settings.noAssRole` instead of hardcoded values
- [x] For impersonation, ensure it still uses 'system' or allow separate setting if needed
- [x] Create tests in `src/test/noAssMode.test.ts` for no-assistant mode with different roles
- [x] Test edge cases: empty chat history, long prompts, role changes
- [ ] Update version and changelog if necessary
- [ ] Verify functionality in SillyTavern by generating roadway suggestions with no-assistant mode enabled

## Potential Edge Cases
- What happens when chat history is very long? Ensure it fits within max context.
- Role 'system' vs 'user': Confirm API behavior with different roles.
- Backward compatibility: Ensure existing settings migrate properly.
