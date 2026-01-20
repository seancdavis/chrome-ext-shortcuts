// Track tab history for "switch to previous tab" feature
// Store as array of {tabId, windowId} with most recent at the end
let tabHistory = [];
const MAX_HISTORY = 50;

// Add a tab to history (called when tab becomes active)
function addToHistory(tabId, windowId) {
  // Remove this tab if it's already in history
  tabHistory = tabHistory.filter(t => t.tabId !== tabId);
  // Add to end (most recent)
  tabHistory.push({ tabId, windowId });
  // Trim if too long
  if (tabHistory.length > MAX_HISTORY) {
    tabHistory = tabHistory.slice(-MAX_HISTORY);
  }
}

// Remove a tab from history (called when tab is closed)
function removeFromHistory(tabId) {
  tabHistory = tabHistory.filter(t => t.tabId !== tabId);
}

// Get the previous tab (second most recent)
function getPreviousTab() {
  if (tabHistory.length < 2) return null;
  return tabHistory[tabHistory.length - 2];
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  addToHistory(activeInfo.tabId, activeInfo.windowId);
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  removeFromHistory(tabId);
});

// Initialize history with current tabs on extension load
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    addToHistory(tabs[0].id, tabs[0].windowId);
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
    const previousTab = getPreviousTab();
    if (previousTab) {
      try {
        // Verify the tab still exists before switching
        await chrome.tabs.get(previousTab.tabId);
        // Switch to the tab
        await chrome.tabs.update(previousTab.tabId, { active: true });
        // Also focus the window if it's different
        await chrome.windows.update(previousTab.windowId, { focused: true });
      } catch (e) {
        // Tab no longer exists, remove it and try again
        removeFromHistory(previousTab.tabId);
      }
    }
  }
});
