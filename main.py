# Import necessary modules from FastAPI and httpx (an HTTP client for making API requests)
from fastapi import FastAPI, Query
import httpx

# Import CORS middleware to allow cross-origin requests
from fastapi.middleware.cors import CORSMiddleware

# Create a FastAPI app instance — this is what handles all incoming requests
app = FastAPI()

# Add CORS middleware to allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.realestate.com.au"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Home page endpoint
# ---------------------------
# This is the default route, just to check if your API is running.
# When someone visits the root URL ("/"), it will return a simple message.
@app.get("/")
def root():
    return {"message": "Home Free API is working"}


# ---------------------------------------------------
# Accessibility Data from Overpass API (OSM)
# ---------------------------------------------------
# This route lets you check for accessibility features around a location.
# You provide latitude (lat) and longitude (lon) as query parameters in the URL.
# The API will search for nearby toilets, wheelchair-accessible locations, and buildings with ramps.
# The search radius is 500 meters around the provided coordinates.
# The results are fetched from the Overpass API, which is a read-only API for OpenStreetMap data.
# The response includes a list of accessible elements found within the search radius.
# If no accessible elements are found, the list will be empty.
# If there's an error (e.g., invalid coordinates), the API will return an error message with details.

# To access copy and paste this URL in a new tab: https://5145f266-a838-466f-ad64-71e0143d10c2-00-1ohv6j7rjecxx.pike.replit.dev/accessibility?lat=-33.8688&lon=151.2093
# Replace the lat and lon with the location you want to check.
# The coordinates provided are for the Sydney Opera House.
# The API will return a list of accessible elements found within 500 meters of the Sydney Opera House.
# If no accessible elements are found, the list will be empty.

# Example response:
"""
{
  "accessible_features_found": [
    {
      "type": "count",
      "id": 0,
      "tags": {
        "nodes": "171",
        "ways": "0",
        "relations": "0",
        "total": "171"
      }
    }
  ]
}
"""
# Total matches: 171 accessible features (toilets, ramps, wheelchair entries) within 500 meters of the Sydney Opera House"
# If you guys want to return the actual list of features instead of just the count, we can easily change that. We can get:
# Feature names
# Locations (lat/lon)
# Tags like "wheelchair": "yes"


@app.get("/accessibility")
async def get_accessibility(lat: float = Query(...), lon: float = Query(...)):
    # This is the Overpass API URL (from OpenStreetMap)
    overpass_url = "https://overpass-api.de/api/interpreter"

    # This is the query that fetches nearby features:
    # - Toilets (amenity=toilets)
    # - Wheelchair-accessible locations (wheelchair=yes)
    # - Buildings or paths with ramps (ramp=yes)
    # The search is done within 500 meters around the provided coordinates
    query = f"""
    [out:json];
    (
      node["amenity"="toilets"](around:500,{lat},{lon});
      node["wheelchair"="yes"](around:500,{lat},{lon});
      node["ramp"="yes"](around:500,{lat},{lon});
    );
    out count;
    """

    # Create an async HTTP client to make the request to Overpass API
    async with httpx.AsyncClient() as client:
        res = await client.post(overpass_url, data=query)  # Send the request

    # Parse the response into JSON format
    data = res.json()

    # Return the list of accessible elements found
# Construct a consistent response structure
    return {
        "accessible_features_found": [
            {
                "type": "count",
                "id": 0,
                "tags": {
                    "nodes": str(data.get("nodes", 0)),
                    "ways": str(data.get("ways", 0)),
                    "relations": str(data.get("relations", 0)),
                    "total": str(len(data.get('elements', [])))
                }
            }
        ]
    }


# --------------------------------------------------------------------
# Mobility Context from Melbourne Open Data Toilets Dataset
# --------------------------------------------------------------------
# This route fetches public toilet data from the City of Melbourne's open dataset.
# The dataset includes information about whether toilets are accessible by wheelchair users
# To access, copy and paste this URL in a new tab: https://5145f266-a838-466f-ad64-71e0143d10c2-00-1ohv6j7rjecxx.pike.replit.dev/mobility
# Click on Pretty-print to see the data in a more readable format.

@app.get("/mobility")
async def get_mobility():
    # URL for the Melbourne public toilet dataset (JSON format)
    url = "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/public-toilets/exports/json"

    # Create an async HTTP client to fetch the data
    async with httpx.AsyncClient() as client:
        try:
            # Attempt to make the GET request to the dataset API
            res = await client.get(url)
            res.raise_for_status()  # If the request fails (e.g., 404), this will raise an error
        except Exception as e:
            # If there's an error, return a readable error message with details
            return {"error": "Failed to fetch mobility data", "details": str(e)}

    # If the request was successful, return the mobility data
    return {"mobility_data": res.json()}
    
