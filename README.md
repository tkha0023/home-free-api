# Home Free Accessibility Extension

**Home Free** is a Chrome Extension that displays accessibility scores for real estate listings on sites like [realestate.com.au](https://www.realestate.com.au). It aims to improve housing search experiences for people with mobility or disability-related needs by analyzing listing content and local infrastructure.

## Features

- **Property Accessibility Score**  
  Analyzes keywords in the property description (e.g., step-free entry, wide doorways, grab rails) and generates a score out of 10.

- **Neighbourhood Accessibility Score**  
  Fetches OpenStreetMap and open data (via backend API) to assess nearby accessible toilets, ramps, terrain, and transit access.

- **Visual Breakdown**  
  Scores are shown as colored bars with an overall total score. You can also toggle to see a list of detected features.

- **Automatic Detection**  
  The extension activates only on listing pages and updates if you navigate between them.

## Privacy & Permissions

- No cookies, tab access, or history permissions are used.
- Only interacts with `realestate.com.au` and a read-only API.
- No user data is collected or transmitted.

## Tech Stack

- **Chrome Extension (Manifest v3)**
- **JavaScript**
- **FastAPI** backend (optional, hosted via Render)

## API

The extension uses a lightweight Python API (FastAPI) for:
- Accessible infrastructure data (via Overpass API / OpenStreetMap)
- Public toilet listings (City of Melbourne Open Data)

### API Endpoints

- `/accessibility?lat=...&lon=...` — Finds ramps, toilets, wheelchair POIs.
- `/mobility` — Returns public toilet data and accessibility status.

See `main.py` for implementation.

## Setup

1. Clone the repo or download as ZIP.
2. Load the `extension/` folder into Chrome via `chrome://extensions > Load Unpacked`.
3. Visit a listing on realestate.com.au to test.

Alternatively, you can also install the extension directly from the Google Chrome Web Store.

## License

This project is licensed under the MIT License

---

> Created for a university project to support equitable housing choice through accessibility data.