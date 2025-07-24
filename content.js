(() => {
  const logoPath = chrome.runtime.getURL("logo.png");
  let lastUrl = location.href;

  const isListingPage = () => {
    return location.href.includes("realestate.com.au/property");
  };

const getAccessibilityScores = () => {
  const textContent = document.body.innerText.toLowerCase();
  let propertyScore = 0;
  let features = [];

  // Keyword matches for scoring
  if (textContent.includes("single-level") || textContent.includes("single storey") || textContent.includes("single story")) {
    propertyScore += 10;
    features.push("Single-storey entry");
  }

  // NEW: Check for more accessibility features
  const extraFeatures = {
    "Step-free entry": textContent.includes("step-free entry"),
    "Wide doorways": textContent.includes("wide doorways"),
    "Accessible bathroom": textContent.includes("accessible bathroom"),
    "Roll-in shower": textContent.includes("roll-in shower"),
    "Elevator": textContent.includes("elevator"),
  };

  // Add 2 points per feature found, and record which were found
  for (const [label, found] of Object.entries(extraFeatures)) {
    if (found) {
      propertyScore += 2;
      features.push(label);
    }
  }

  return {
    property: propertyScore,
    hood: 0,
    features: features
  };
};


  const renderAccessibilityBars = (scores) => {
    const content = document.getElementById("homefree-content");
    if (!content) return;

    const makeBar = (label, percent) => `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: bold; margin-bottom: 4px;">${label}</div>
        <div style="background: #eee; border-radius: 6px; overflow: hidden; height: 10px;">
          <div style="width: ${percent}%; background: #0077cc; height: 100%; transition: width 0.3s;"></div>
        </div>
      </div>
    `;

    const total = Math.round((scores.property + scores.hood) / 2);

    content.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Accessibility Breakdown</div>
      ${makeBar("Property Accessibility", scores.property)}
      ${makeBar("Neighbourhood Accessibility", scores.hood)}

      <div style="margin-top: 16px; font-size: 18px; font-weight: bold; color: #0077cc;">
        Total Score: ${total} / 10
      </div>
    `;
  };

  const createPanel = () => {
    const panel = document.createElement("div");
    panel.id = "homefree-panel";
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 280px;
      background: white;
      border-radius: 16px;
      border: 2px solid #0077cc;
      box-shadow: 0 6px 16px rgba(0, 119, 204, 0.2);
      font-family: 'Segoe UI', sans-serif;
      z-index: 9999;
      overflow: hidden;
      transition: width 0.3s ease, height 0.3s ease;
    `;

    panel.innerHTML = `
      <div id="homefree-header" style="display: flex; align-items: center; gap: 10px; padding: 12px; cursor: pointer;">
        <img id="homefree-logo" src="${logoPath}" alt="HomeFree Logo" style="width: 40px; height: 40px; border-radius: 8px;" />
        <div id="homefree-title" style="font-size: 18px; font-weight: bold; color: #0077cc;">HomeFree</div>
      </div>

      <div id="homefree-main">
        <div style="display: flex; justify-content: center; margin: 0 12px 10px;">
          <div id="homefree-toggle" style="
            display: flex;
            width: 100%;
            background: #f0f0f0;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
          ">
            <div data-tab="overview" style="flex: 1; padding: 8px; text-align: center; background: #0077cc; color: white;">Overview</div>
            <div data-tab="features" style="flex: 1; padding: 8px; text-align: center; color: #0077cc;">Features</div>
          </div>
        </div>

        <div id="homefree-body" style="padding: 0 16px 16px;">
          <div id="homefree-content" style="transition: opacity 0.3s ease; font-size: 14px; color: #333;"></div>
        </div>
      </div>
    `;

    document.getElementById("homefree-panel")?.remove();
    document.body.appendChild(panel);

    const logo = panel.querySelector("#homefree-header");
    const title = panel.querySelector("#homefree-title");
    const main = panel.querySelector("#homefree-main");
    const content = panel.querySelector("#homefree-content");

    let isCollapsed = false;
    logo.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      panel.style.width = isCollapsed ? "60px" : "280px";
      title.style.display = isCollapsed ? "none" : "block";
      main.style.display = isCollapsed ? "none" : "block";
    });

    // Tab switching logic
    let currentTab = "overview";
    const scores = getAccessibilityScores();
    renderAccessibilityBars(scores);

    const toggle = panel.querySelector("#homefree-toggle");
    toggle.querySelectorAll("div").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab !== currentTab) {
          currentTab = tab;

          toggle.querySelectorAll("div").forEach(el => {
            el.style.background = "#f0f0f0";
            el.style.color = "#0077cc";
          });
          btn.style.background = "#0077cc";
          btn.style.color = "white";

          content.style.opacity = 0;
          setTimeout(() => {
            if (tab === "overview") {
              renderAccessibilityBars(scores);
            } else {
              content.innerHTML = `
                <div><strong>Found Features:</strong><ul>
                  ${scores.features.length
                    ? scores.features.map(f => `<li>${f}</li>`).join("")
                    : "<li>No features found</li>"}
                </ul></div>
              `;
            }
            content.style.opacity = 1;
          }, 200);
        }
      });
    });
  };

  const scanPage = () => {
    if (isListingPage()) {
      console.log("Listing page detected, injecting panel.");
      createPanel();
    } else {
      console.log(" Not a listing page, removing panel.");
      document.getElementById("homefree-panel")?.remove();
    }
  };

  const observeUrlChanges = () => {
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log(" URL changed:", lastUrl);
        setTimeout(scanPage, 1000);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(scanPage, 1000);
    observeUrlChanges();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(scanPage, 1000);
      observeUrlChanges();
    });
  }
})();
