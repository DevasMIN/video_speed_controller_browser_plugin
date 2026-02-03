# SpeedTube - Video Speed Controller ⚡

Chrome extension for controlling video playback speed with customizable presets and keyboard shortcuts.

> **Language support:** 🇷🇺 Русский | 🇺🇸 English | 🇪🇸 Español

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `video_speed_controller` folder

## Icon


You can use any graphic editor or online icon generator.

## Features

- ✅ Speed control through buttons and presets
- ✅ Edit preset cells (click the ✎ icon)
- ✅ Assign keyboard shortcuts for each preset
- ✅ Three application scopes: for tab, domain, or all tabs
- ✅ Enable/disable extension
- ✅ Reset all settings
- ✅ Automatic settings persistence

## Usage

1. Open a page with video
2. Click the extension icon in Chrome toolbar
3. Select speed from presets or use +/- buttons for fine-tuning
4. To edit a preset, hover over the cell and click the ✎ icon
5. In the modal window you can change speed and assign a keyboard shortcut

## Keyboard Shortcuts

After assigning keyboard shortcuts in preset settings, you can use them on any page with video for quick speed switching.

## Application Scopes

- **For this tab** - speed applies only to the current tab
- **For this domain** - speed applies to all tabs on the current domain
- **For all tabs** - speed applies to all tabs with videos

## Technical Information

- **Manifest Version**: 3
- **Permissions**: activeTab, storage, scripting, tabs
- **Host Permissions**: <all_urls>
- **Content Scripts**: Runs on all pages
- **Background Service**: Handles shortcuts and settings

## Notes

- Works with any video on any website
- Supports speeds from 25% to 1600%
- Settings are saved automatically
- Minimal performance impact
