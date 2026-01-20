// Track tab history for "switch to previous tab" feature
// Store as map of windowId -> array of tabIds (most recent at end)
// Uses chrome.storage.session to persist across service worker restarts
let tabHistoryByWindow = {};
let historyLoaded = false;
const MAX_HISTORY_PER_WINDOW = 50;

// Load history from storage (ensures we only load once)
async function ensureHistoryLoaded() {
  if (historyLoaded) return;
  try {
    const result = await chrome.storage.session.get('tabHistoryByWindow');
    if (result.tabHistoryByWindow) {
      tabHistoryByWindow = result.tabHistoryByWindow;
    }
    historyLoaded = true;
  } catch (e) {
    console.error('Failed to load tab history:', e);
    historyLoaded = true; // Prevent repeated failures
  }
}

// Save history to storage
async function saveHistory() {
  await chrome.storage.session.set({ tabHistoryByWindow });
}

// Add a tab to history for its window (called when tab becomes active)
async function addToHistory(tabId, windowId) {
  await ensureHistoryLoaded();
  if (!tabHistoryByWindow[windowId]) {
    tabHistoryByWindow[windowId] = [];
  }
  const history = tabHistoryByWindow[windowId];
  // Remove this tab if it's already in this window's history
  const index = history.indexOf(tabId);
  if (index !== -1) {
    history.splice(index, 1);
  }
  // Add to end (most recent)
  history.push(tabId);
  // Trim if too long
  if (history.length > MAX_HISTORY_PER_WINDOW) {
    tabHistoryByWindow[windowId] = history.slice(-MAX_HISTORY_PER_WINDOW);
  }
  await saveHistory();
}

// Remove a tab from history (called when tab is closed)
async function removeFromHistory(tabId, windowId) {
  await ensureHistoryLoaded();
  if (windowId && tabHistoryByWindow[windowId]) {
    const history = tabHistoryByWindow[windowId];
    const index = history.indexOf(tabId);
    if (index !== -1) {
      history.splice(index, 1);
      await saveHistory();
    }
  } else {
    // If windowId not provided, search all windows
    for (const wid of Object.keys(tabHistoryByWindow)) {
      const history = tabHistoryByWindow[wid];
      const index = history.indexOf(tabId);
      if (index !== -1) {
        history.splice(index, 1);
        await saveHistory();
        break;
      }
    }
  }
}

// Get the previous tab for a specific window
async function getPreviousTabForWindow(windowId) {
  await ensureHistoryLoaded();
  const history = tabHistoryByWindow[windowId];
  if (!history || history.length < 2) return null;
  return history[history.length - 2];
}

// Clean up history for closed windows
async function cleanupClosedWindow(windowId) {
  await ensureHistoryLoaded();
  if (tabHistoryByWindow[windowId]) {
    delete tabHistoryByWindow[windowId];
    await saveHistory();
  }
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  addToHistory(activeInfo.tabId, activeInfo.windowId);
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  removeFromHistory(tabId, removeInfo.windowId);
});

// Listen for window removal to clean up history
chrome.windows.onRemoved.addListener((windowId) => {
  cleanupClosedWindow(windowId);
});

// Initialize on install: add current active tabs to history
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const windows = await chrome.windows.getAll({ populate: true });
    for (const win of windows) {
      const activeTab = win.tabs?.find(t => t.active);
      if (activeTab) {
        await addToHistory(activeTab.id, win.id);
      }
    }
  } catch (e) {
    console.error('Failed to initialize tab history:', e);
  }
});

// Handle commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "copy-url") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (url) => {
          navigator.clipboard.writeText(url);

          // Remove any existing toast
          const existing = document.getElementById("copy-url-toast");
          if (existing) existing.remove();

          // Create toast
          const toast = document.createElement("div");
          toast.id = "copy-url-toast";
          toast.textContent = "URL copied!";
          toast.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            background: #333;
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.2s, transform 0.2s;
          `;
          document.body.appendChild(toast);

          // Animate in
          requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
          });

          // Animate out and remove
          setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-10px)";
            setTimeout(() => toast.remove(), 200);
          }, 2000);
        },
        args: [tab.url]
      });
    }
  }

  if (command === "switch-to-previous-tab") {
    // Get the current window to find its previous tab
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!currentTab) return;

    const previousTabId = await getPreviousTabForWindow(currentTab.windowId);
    if (previousTabId) {
      try {
        // Verify the tab still exists before switching
        await chrome.tabs.get(previousTabId);
        // Switch to the tab (stays in same window)
        await chrome.tabs.update(previousTabId, { active: true });
      } catch (e) {
        // Tab no longer exists, remove it from history
        await removeFromHistory(previousTabId, currentTab.windowId);
      }
    }
  }
});
