(() => {
  const logoPath = chrome.runtime.getURL("logo.png");
  let lastUrl = location.href;

  const isListingPage = () => {
    return location.href.includes("realestate.com.au/property");
  };

  const getPropertyScore = () => {
    const textContent = document.body.innerText.toLowerCase();
    let score = 0;
    let features = [];

    if (textContent.includes("single-level") || textContent.includes("single storey") || textContent.includes("single level") || textContent.includes("single story")) {
      score += 10;
      features.push("Single-storey");
    }

    const extraFeatures = {
      "Step-free entry": textContent.includes("step-free entry"),
      "Wide doorways": textContent.includes("wide doorways"),
      "Accessible bathroom": textContent.includes("accessible bathroom"),
      "Roll-in shower": textContent.includes("roll-in shower"),
      "Elevator": textContent.includes("elevator"),
    };

    for (const [label, found] of Object.entries(extraFeatures)) {
      if (found) {
        score += 2;
        features.push(label);
      }
    }

    return { property: score, features };
  };

  const fetchHoodScore = async () => {
    console.log(" fetchHoodScore() called");
  
    let lat = -33.8688, lon = 151.2093; // default fallback we should consider better error handling for this at some point
  
    const jsonLdTag = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdTag) {
      try {
        const parsed = JSON.parse(jsonLdTag.textContent);
        const data = Array.isArray(parsed) ? parsed.find(obj => obj['@type'] === 'Residence') : parsed;
  
        if (data?.address?.streetAddress && data?.address?.addressLocality) {
          const fullAddress = `${data.address.streetAddress}, ${data.address.addressLocality}, Australia`;
          console.log("Full address for geocoding:", fullAddress);
  
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
          const geoData = await geoRes.json();
  
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
            console.log(`Geocoded coordinates: lat=${lat}, lon=${lon}`);
          } else {
            console.warn("Geocoding returned no results");
          }
        }
      } catch (err) {
        console.warn("Failed to parse or geocode address:", err);
      }
    }
  
    console.log(`Using coordinates: lat=${lat}, lon=${lon}`);
  
    try {
      // Overpass API
      const resOverpass = await fetch(`https://home-free-api.onrender.com/accessibility?lat=${lat}&lon=${lon}`);
      const dataOverpass = await resOverpass.json();
      const featuresFound = dataOverpass.accessible_features_found?.[0]?.tags?.total || 0;
      const overpassScore = Math.min(10, Math.round((featuresFound / 200) * 10));
  
      // Mobility API
      const resMobility = await fetch(`https://home-free-api.onrender.com/mobility`);
      const dataMobility = await resMobility.json();
      const toilets = dataMobility.mobility_data || [];
      const accessibleToilets = toilets.filter(t => t.accessible?.toLowerCase() === "yes").length;
      const mobilityScore = Math.min(10, Math.round((accessibleToilets / 100) * 10));
  
      // Debugging
      console.log("→ Accessible features found:", featuresFound);
      console.log("→ Overpass Score:", overpassScore);
  
      return Math.round((overpassScore + mobilityScore) / 2);
    } catch (error) {
      console.error("Failed to fetch neighborhood or mobility score:", error);
      return 0;
    }
  };
  

  const renderAccessibilityBars = (scores) => {
    const content = document.getElementById("homefree-content");
    if (!content) return;
  
    content.innerHTML = ""; // Clear previous content
  
    // Title
    const title = document.createElement("div");
    title.textContent = "Accessibility Breakdown";
    title.style.fontSize = "16px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "10px";
    content.appendChild(title);
  
    // Bar builder
    const createBar = (label, percent) => {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "12px";
  
      const labelDiv = document.createElement("div");
      labelDiv.textContent = label;
      labelDiv.style.fontWeight = "bold";
      labelDiv.style.marginBottom = "4px";
  
      const barContainer = document.createElement("div");
      barContainer.style.background = "#eee";
      barContainer.style.borderRadius = "6px";
      barContainer.style.overflow = "hidden";
      barContainer.style.height = "10px";
  
      const bar = document.createElement("div");
      bar.style.width = `${percent}%`;
      bar.style.background = "#0077cc";
      bar.style.height = "100%";
      bar.style.transition = "width 0.3s";
  
      barContainer.appendChild(bar);
      wrapper.appendChild(labelDiv);
      wrapper.appendChild(barContainer);
      return wrapper;
    };
  
    // Bars
    content.appendChild(createBar("Property Accessibility", scores.property));
    content.appendChild(createBar("Neighbourhood Accessibility", scores.hood));
  
    // Total Score
    const total = Math.round((scores.property + scores.hood) / 2);
    const totalScore = document.createElement("div");
    totalScore.textContent = `Total Score: ${total} / 10`;
    totalScore.style.marginTop = "16px";
    totalScore.style.fontSize = "18px";
    totalScore.style.fontWeight = "bold";
    totalScore.style.color = "#0077cc";
    content.appendChild(totalScore);
  };
    

  const createPanel = (scores) => {
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

    let currentTab = "overview";
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
            // Clear existing content, updated for better security 
            content.innerHTML = "";

            // Create a wrapper div
            const wrapper = document.createElement("div");

            // Add heading
            const heading = document.createElement("strong");
            heading.innerText = "Found Features:";
            wrapper.appendChild(heading);

            // Create list
            const ul = document.createElement("ul");

            if (scores.features.length > 0) {
              scores.features.forEach(feature => {
                const li = document.createElement("li");
                li.innerText = feature;
                ul.appendChild(li);
              });
            } else {
              const li = document.createElement("li");
              li.innerText = "No features found";
              ul.appendChild(li);
            }

            wrapper.appendChild(ul);
            content.appendChild(wrapper);

              
            }
            content.style.opacity = 1;
          }, 200);
        }
      });
    });

    renderAccessibilityBars(scores);
  };

  const scanPage = async () => {
    if (isListingPage()) {
      console.log("Listing page detected, injecting panel.");
      const property = getPropertyScore();
      const hood = await fetchHoodScore();
      createPanel({ ...property, hood });
    } else {
      console.log("Not a listing page, removing panel.");
      document.getElementById("homefree-panel")?.remove();
    }
  };

  const observeUrlChanges = () => {
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log("URL changed:", lastUrl);
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
