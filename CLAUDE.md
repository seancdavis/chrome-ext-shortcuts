# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Project Overview

This is a Chrome Extension (Manifest V3) that provides custom keyboard shortcuts for enhanced browser control:
- **Cmd+Shift+C** - Copy current tab URL to clipboard
- **Alt+Space** - Switch to previously used tab (MRU tab switching)

## File Structure

- `manifest.json` - Extension configuration, permissions, and keyboard shortcuts
- `background.js` - Service worker handling commands, tab history tracking, and clipboard/toast logic

## Key Technical Details

- Uses Chrome's `commands` API for keyboard shortcuts
- Uses `chrome.scripting.executeScript` to run clipboard and toast code in the active tab's context
- Toast uses `z-index: 2147483647` (max 32-bit int) to ensure visibility above all page content
- Tab history is tracked via `chrome.tabs.onActivated` and `chrome.tabs.onRemoved` listeners
- History is stored in memory (resets on extension reload/browser restart)

## Testing Changes

After making changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card, or click "Load unpacked" again

## Common Tasks

### Changing the keyboard shortcut default
Edit the `commands` section in `manifest.json`. Note that `MacCtrl` maps to the Cmd key on Mac.

### Modifying toast appearance
The toast styles are inline in `background.js` within the `executeScript` function.

### Adding new keyboard shortcuts
1. Add command entry in `manifest.json` under `commands`
2. Add handler in `background.js` in the `chrome.commands.onCommand` listener

## Limitations

- Chrome extensions cannot override built-in Chrome shortcuts (e.g., Ctrl+Tab)
- Tab switching won't work until you've visited at least 2 tabs after extension load
- History resets when the service worker restarts
