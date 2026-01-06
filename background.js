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
});
