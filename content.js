(() => {
  const logoPath = chrome.runtime.getURL("logo.png");
  let lastUrl = location.href;

  const isListingPage = () => {
    return location.href.includes("realestate.com.au/property");
  };
  const getPropertyScore = () => {
    const textContent = document.body.innerText.toLowerCase();

  
  
  let scoreRaw = 0;
  let foundFeatures = [];

  //updated to use new scoring system
const featureWeights = [
  { label: "Step-free entry / single-storey", weight: 3.0, keywords: ["step-free", "step free", "level access", "no steps", "ramp entry", "accessible entry", "wheelchair entry", "single storey", "single-storey", "single story", "single level", "one level", "no stairs", "no internal stairs"] },
  { label: "Wide doorways / hallways", weight: 2.0, keywords: ["wide doorway", "wide doorways", "wide doors", "widened doors", "door width", "wheelchair door"] },
  { label: "Accessible bathroom (grab bars, etc.)", weight: 2.0, keywords: ["grab rails", "grab bars", "hand rails", "support rails", "bathroom rails", "safety rails", "toilet rail", "accessible bathroom"] },
  { label: "Internal stairs with railing/elevator", weight: 1.5, keywords: ["elevator", "lift", "lift access", "accessible lift", "internal lift", "internal stairs", "staircase"] },
  { label: "Lever handles / smart locks", weight: 0.5, keywords: ["lever handles", "lever door", "smart lock", "automated door", "voice-controlled", "smart control"] },
  { label: "Non-slip or smooth flooring", weight: 0.5, keywords: ["non-slip", "slip resistant", "smooth flooring", "vinyl flooring", "laminate flooring"] },
  { label: "Visual/auditory features", weight: 0.5, keywords: ["visual alarm", "auditory alert", "flashing light", "hearing loop", "doorbell light"] }
];

for (const feature of featureWeights) {
  for (const keyword of feature.keywords) {
    if (textContent.includes(keyword)) {
      scoreRaw += feature.weight;
      foundFeatures.push(feature.label);
      break;
    }
  }
}

let clampedScore = Math.min(scoreRaw, 10);
if (clampedScore <= 1.0 && foundFeatures.length <= 2) {
  clampedScore = Math.min(clampedScore, 2); // or even 1
}

return {
  property: Math.round(clampedScore),
  features: [...new Set(foundFeatures)] 
};

  };
  

  const fetchHoodScore = async () => {
    console.log("fetchHoodScore() called");
  
    let lat, lon;
    let geocodingFailed = false;
  
    const jsonLdTag = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdTag) {
      try {
        const parsed = JSON.parse(jsonLdTag.textContent);
        const data = Array.isArray(parsed)
          ? parsed.find(obj => obj['@type'] === 'Residence')
          : parsed;
  
        if (data?.address?.streetAddress && data?.address?.addressLocality) {
          const fullAddress = `${data.address.streetAddress}, ${data.address.addressLocality}, Australia`;
          console.log("Full address for geocoding:", fullAddress);
  
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
          );
          const geoData = await geoRes.json();
  
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
            console.log(`Geocoded coordinates: lat=${lat}, lon=${lon}`);
          } else {
            console.warn("Full address geocoding returned no results. Trying suburb only...");
          
            if (data?.address?.addressLocality) {
              const suburbOnly = `${data.address.addressLocality}, Australia`;
              const retryRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(suburbOnly)}`
              );
              const retryData = await retryRes.json();
          
              if (retryData.length > 0) {
                lat = parseFloat(retryData[0].lat);
                lon = parseFloat(retryData[0].lon);
                console.log(`Fallback suburb geocoding succeeded: lat=${lat}, lon=${lon}`);
                geocodingFailed = false;
              } else {
                console.warn("Fallback suburb geocoding also failed.");
                geocodingFailed = true;
              }
            } else {
              console.warn("No suburb found to use for fallback geocoding.");
              geocodingFailed = true;
            }
          }
          
        } else {
          console.warn("Incomplete address in JSON-LD");
          geocodingFailed = true;
        }
      } catch (err) {
        console.warn("Geocoding error:", err);
        geocodingFailed = true;
      }
    } else {
      geocodingFailed = true;
    }
  
    if (geocodingFailed || lat == null || lon == null) {
      console.warn("Geocoding failed completely — skipping hood score");
      return { hood: null, error: true };
    }
  
  
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
  
      const hoodScore = Math.round((overpassScore + mobilityScore) / 2);
      return { hood: hoodScore, error: false };
          } catch (error) {
      console.error("Failed to fetch neighborhood or mobility score:", error);
      return { hood: null, error: true };

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
      bar.style.background = "#005999";
      bar.style.height = "100%";
      bar.style.transition = "width 0.3s";
  
      barContainer.appendChild(bar);
      wrapper.appendChild(labelDiv);
      wrapper.appendChild(barContainer);
      return wrapper;
    };
  
  // Bars
   // Property Accessibility bar
   const propertyPercent = Math.min(100, (scores.property / 10) * 50);
   content.appendChild(createBar("Property Accessibility", propertyPercent));
   
// Neighbourhood Accessibility
if (scores.hoodError) {
  const hoodMessage = document.createElement("div");
hoodMessage.style.display = "flex";
hoodMessage.style.alignItems = "center";
hoodMessage.style.gap = "8px";
hoodMessage.style.color = "#A80000";
hoodMessage.style.fontSize = "15px";
hoodMessage.style.fontWeight = "bold";
hoodMessage.style.marginBottom = "12px";

// Icon
const exclamation = document.createElement("span");
exclamation.textContent = "❗"; // Unicode red exclamation
exclamation.style.fontSize = "18px";

// Text
const message = document.createElement("span");
message.textContent = "Neighbourhood data unavailable for this property";

hoodMessage.appendChild(exclamation);
hoodMessage.appendChild(message);
content.appendChild(hoodMessage);

} else {
  const hoodPercent = Math.min(100, Math.max(0, scores.hood * 10));
  content.appendChild(createBar("Neighbourhood Accessibility", hoodPercent));
  }

// Total Score
const totalScore = document.createElement("div");
if (scores.hoodError) {
  totalScore.textContent = `Total Score: ${scores.property} / 10`;
} else {
  const safeProperty = typeof scores.property === 'number' ? scores.property : 0;
  const safeHood = typeof scores.hood === 'number' ? scores.hood : 0;
  const total = Math.round((safeProperty + safeHood) / 2);
  totalScore.textContent = `Total Score: ${total} / 10`;
}
totalScore.style.marginTop = "16px";
totalScore.style.fontSize = "18px";
totalScore.style.fontWeight = "bold";
totalScore.style.color = "#005999";
content.appendChild(totalScore);
  }

    

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
      border: 2px solid #005999;
      box-shadow: 0 6px 16px rgba(0, 119, 204, 0.2);
      font-family: 'Segoe UI', sans-serif;
      z-index: 9999;
      overflow: hidden;
      transition: width 0.3s ease, height 0.3s ease;
    `;

    panel.innerHTML = `
      <div id="homefree-header" style="display: flex; align-items: center; gap: 10px; padding: 12px; cursor: pointer;">
        <img id="homefree-logo" src="${logoPath}" alt="HomeFree Logo" style="width: 40px; height: 40px; border-radius: 8px;" />
        <div id="homefree-title" style="font-size: 18px; font-weight: bold; color: #005999;">HomeFree</div>
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
            <div data-tab="overview" style="flex: 1; padding: 8px; text-align: center; background: #005999; color: white;">Overview</div>
            <div data-tab="features" style="flex: 1; padding: 8px; text-align: center; color: #005999;">Features</div>
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
            el.style.color = "#005999";
          });
          btn.style.background = "#005999";
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
      const hoodResult = await fetchHoodScore();
      
      const scores = {
        ...property,
        hood: hoodResult.hood,
        hoodError: hoodResult.error
      };
      
      createPanel(scores);
  
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
