chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes("github.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const panel = document.getElementById("anchor-panel");
        if (panel) panel.classList.toggle("open");
      }
    });
  }
});
