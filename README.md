# Hantavirus Global Monitor - Situation Room v1.0

## Project Overview
The Hantavirus Global Monitor (HGM) is a high-fidelity data visualization and analysis platform designed for the real-time tracking of hantavirus outbreaks and epidemiological shifts. The system is engineered to provide a comprehensive situational overview by aggregating official health reports and predictive sentiment analysis.

## Methodology: Composite Risk Model (CRM)
Unlike conventional monitoring tools, HGM utilizes a proprietary Composite Risk Model (CRM) to quantify regional and global threats. The index is calculated through the weighted aggregation of three primary data streams:

* **Epidemiological Data (50%):** Direct integration with World Health Organization (WHO), Pan American Health Organization (PAHO), and CDC surveillance reports.
* **Predictive Markets - Polymarket (25%):** Real-time tracking of decentralized prediction market probabilities to assess public and expert sentiment.
* **Forecast Markets - Kalshi (25%):** Incorporation of regulated event contract data to refine the predictive accuracy of the risk index.

## Core Features
* **Tactical Dashboard:** High-contrast, low-latency interface optimized for 24/7 monitoring environments.
* **Geospatial Analysis:** Interactive choropleth mapping utilizing D3.js for visual representation of historical load, case fatality rates (CFR), and weekly variations.
* **OSINT Intelligence Feed:** Automated aggregation of official bulletins and verified news reports regarding viral mutations and localized foci.
* **Infrastructure Redundancy:** Capability for automated data exports to local storage solutions, such as the ARKA digital library, ensuring data preservation during network disruptions.

## Technical Stack
* **Frontend:** React.js / Next.js
* **Styling:** Tailwind CSS (Custom Dark/Tactical Theme)
* **Data Visualization:** D3.js / Simple Maps
* **Backend:** Node.js (Data scraping and API aggregation)
* **Architecture:** Modular design for rapid adaptation to different viral threats.

