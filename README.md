# Home Free Accessibility Extension

**Home Free** is a Chrome Extension that displays accessibility scores for real estate listings on sites like [realestate.com.au](https://www.realestate.com.au). It aims to improve housing search experiences for people with mobility or disability-related needs by analyzing listing content and local infrastructure. It was developed as part of a University project by Group 1 in course ITO5002. 

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

The extension reads publicly available listing content on supported real estate sites to calculate accessibility scores.

To generate the Neighbourhood Accessibility Score, the extension sends the listing’s address (no personal user information) to:

Nominatim (OpenStreetMap) — for geocoding the address to coordinates.

Home Free API — a read-only backend that queries open data sources (e.g., Overpass API, City of Melbourne data) to assess local accessibility features.

No personally identifying information, cookies, or browsing history are collected.

Data is used only for generating the on-page scores and is not stored, sold, or shared for any purpose.



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
2. Load the folder into Chrome via `chrome://extensions > Load Unpacked`.
3. Visit a listing on realestate.com.au to test.

Alternatively, you can also install the extension directly from the Google Chrome Web Store.

## Testing

**Prerequisites**
- Python 3.10+ installed
- Run commands from the project root

**Setup**

**Windows:**
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt -r requirements-dev.txt

**MacOS/Linux**
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt -r requirements-dev.txt

**Run tests**
python -m pytest

---

> Created for a university project to support equitable housing choice through accessibility data.