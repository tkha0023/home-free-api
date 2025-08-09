(function () {
  // Signal readiness to the opener as soon as possible
  try {
    if (window.opener) {
      window.opener.postMessage("HOMEFREE_PRINT_READY", chrome.runtime.getURL("").replace(/\/$/, ""));
    }
  } catch (_) { /* ignore */ }

  // Helper: build the full printable HTML for #report
  function buildPrintableReport({ scores, pageUrl }) {
    const safeProperty = typeof scores.property === "number" ? scores.property : 0;
    const hoodError = !!scores.hoodError;
    const safeHood = !hoodError && typeof scores.hood === "number" ? scores.hood : null;

    const totalText = hoodError
      ? `${safeProperty}/10`
      : `${Math.round(0.6 * safeProperty + 0.4 * safeHood)}/10`;

    const propertyPercent = Math.min(100, (safeProperty / 10) * 50);
    const hoodPercent = hoodError ? 0 : Math.min(100, Math.max(0, safeHood * 10));

    const features = Array.isArray(scores.features) ? scores.features : [];
    const featuresHtml = features.length
      ? features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")
      : `<li>No features detected</li>`;

    // meta
    const metaEl = document.getElementById("meta");
    metaEl.textContent = `Generated for: ${pageUrl || "Unknown page"}`;

    // main
    return `
      <section class="scores">
        <div class="row"><strong>Property Score:</strong> ${safeProperty}/10</div>
        <div class="bar"><div class="fill" style="width:${propertyPercent}%"></div></div>

        ${hoodError
          ? `<div class="row"><strong>Neighbourhood Score:</strong> Not Available</div>`
          : `<div class="row"><strong>Neighbourhood Score:</strong> ${safeHood}/10</div>
             <div class="bar"><div class="fill" style="width:${hoodPercent}%"></div></div>`}

        <div class="row"><strong>Total Score:</strong> <span class="score-big">${totalText}</span></div>
      </section>

      <section>
        <strong>Accessibility Features Found</strong>
        <ul>${featuresHtml}</ul>
      </section>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Render + print + close
  function renderAndPrint(payload) {
    try {
      const container = document.getElementById("report");
      container.innerHTML = buildPrintableReport(payload);

      // Allow layout to settle before printing
      setTimeout(() => {
        const closeSoon = () => setTimeout(() => { try { window.close(); } catch(_) {} }, 150);
        if ("onafterprint" in window) {
          window.addEventListener("afterprint", closeSoon, { once: true });
        } else {
          // Fallback timeout if afterprint isn't fired
          setTimeout(closeSoon, 1000);
        }
        window.focus();
        window.print();
      }, 50);
    } catch (err) {
      console.error("Render/print failed:", err);
      // Still try to print something
      try { window.print(); } catch (_) {}
      setTimeout(() => { try { window.close(); } catch (_) {} }, 300);
    }
  }

  // Primary path: receive data from opener via postMessage
  window.addEventListener("message", (evt) => {
    try {
      const expectedOrigin = chrome.runtime.getURL("").replace(/\/$/, "");
      if (evt.origin !== expectedOrigin) return;
      const data = evt.data || {};
      if (data && data.type === "HOMEFREE_PRINT_DATA" && data.scores) {
        renderAndPrint({ scores: data.scores, pageUrl: data.pageUrl });
      }
    } catch (_) { /* ignore */ }
  });

  try {
    const params = new URLSearchParams(location.search);
    const b64 = params.get("data_b64");
    if (b64) {
      const json = decodeURIComponent(b64);
      const parsed = JSON.parse(decodeURIComponent(escape(atob(json))));
      if (parsed && parsed.s) {
        renderAndPrint({ scores: parsed.s, pageUrl: parsed.u || "" });
      }
    }
  } catch (_) { /* ignore */ }

  // If nothing arrives in a few seconds, show a friendly hint
  setTimeout(() => {
    const report = document.getElementById("report");
    if (!report || report.innerHTML.trim() !== "") return;
    report.innerHTML = `<em>Waiting for report data… If this stays blank, please try again.</em>`;
  }, 2000);
})();