# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Project Overview

This is a Chrome Extension (Manifest V3) that provides a keyboard shortcut to copy the current tab's URL to the clipboard.

## File Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker handling the keyboard command and clipboard/toast logic

## Key Technical Details

- Uses Chrome's `commands` API for keyboard shortcuts
- Uses `chrome.scripting.executeScript` to run clipboard and toast code in the active tab's context
- Toast uses `z-index: 2147483647` (max 32-bit int) to ensure visibility above all page content

## Testing Changes

After making changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card, or click "Load unpacked" again

## Common Tasks

### Changing the keyboard shortcut default
Edit the `commands` section in `manifest.json`. Note that `MacCtrl` maps to the Cmd key on Mac.

### Modifying toast appearance
The toast styles are inline in `background.js` within the `executeScript` function.
