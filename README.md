# Brent Oil Price Change-Point Analysis

A complete time-series analysis and interactive dashboard for detecting structural changes in historical Brent crude oil prices using Bayesian change-point modeling.

**Client context:** Birhan Energies  
**Prepared by:** Rediet Shewarega  
**Data coverage:** 20 May 1987 – 30 September 2022  
**Technologies:** Python, PyMC, ArviZ, Pandas, Flask, React, Vite and Recharts

---

## Project Overview

Brent crude oil prices are influenced by global demand, supply constraints, geopolitical conflicts, economic shocks, international sanctions and OPEC policy decisions.

This project investigates historical Brent oil prices to:

- Identify a statistically significant structural change in the price series.
- Estimate when the structural change occurred.
- Quantify the difference between the price regimes before and after the change.
- Compare the detected change with researched oil-market events.
- Communicate the results through an interactive Flask and React dashboard.

The analysis is intended to support investors, policymakers, energy companies and risk analysts who require clear evidence about long-term changes in oil-market behaviour.

---

## Business Objective

The primary objective is to identify and quantify an important structural shift in historical Brent crude oil prices.

The project addresses the following questions:

1. Does the Brent oil price series contain a major structural break?
2. When did the change most likely occur?
3. How different were average prices before and after the change?
4. Is the detected change closely associated with a major researched market event?
5. How can the findings be communicated through an accessible interactive dashboard?

---

## Key Results

The Bayesian single-change-point model produced the following results:

| Metric | Result |
|---|---:|
| Most probable change date | 23 February 2005 |
| Approximate 95% credible date interval | 15 February 2005 – 7 March 2005 |
| Mean price before change | $21.42 per barrel |
| Mean price after change | $75.48 per barrel |
| Absolute mean difference | $54.06 per barrel |
| Percentage difference | 252.35% |
| Posterior probability of an increase | Approximately 100% |
| Clean observations used | 8,980 |
| Maximum R-hat | 1.003 |
| Minimum bulk ESS | 1,329 |
| Minimum tail ESS | 1,153 |
| Sampling divergences | 0 |

### Interpretation

The model estimates that observations after the detected structural break belonged to a substantially higher average-price regime.

The 252.35% estimate compares the average across the complete period before the detected change with the average across the complete period after it. It does **not** mean that Brent oil prices increased by 252.35% on a single day.

The closest event in the researched event dataset was the beginning of the Iraq War on 20 March 2003, approximately 706 days before the detected change point. This distance represents a weak temporal association and does not provide evidence that the event directly caused the structural break.

---

## Analytical Workflow

The project was completed in three main tasks.

### Task 1: Data Understanding and Exploratory Analysis

Task 1 established the analytical foundation:

- Loaded and inspected the historical Brent oil price data.
- Parsed the `Date` field into datetime format.
- Converted `Price` into a numeric variable.
- Sorted records chronologically.
- Checked missing values, invalid records and duplicate dates.
- Calculated daily log returns.
- Examined price trends, stationarity and volatility.
- Created a structured dataset containing major oil-market events.
- Documented modeling assumptions and limitations.

The log return was calculated as:

\[
r_t = \log(P_t)-\log(P_{t-1})
\]

where:

- \(P_t\) is the Brent price at time \(t\).
- \(P_{t-1}\) is the previous observed price.
- \(r_t\) is the corresponding log return.

### Task 2: Bayesian Change-Point Modeling

A Bayesian model was implemented with PyMC to identify one unknown structural break.

The model assumes:

\[
\tau \sim \text{DiscreteUniform}(0,T-1)
\]

\[
\mu_{\text{before}},\mu_{\text{after}}
\sim \text{Normal}(\mu_0,\sigma_\mu)
\]

\[
\sigma \sim \text{HalfNormal}(\sigma_0)
\]

The expected price at time \(t\) is:

\[
\mu_t =
\begin{cases}
\mu_{\text{before}}, & t < \tau \\
\mu_{\text{after}}, & t \geq \tau
\end{cases}
\]

The observed price is modeled as:

\[
P_t \sim \text{Normal}(\mu_t,\sigma)
\]

The model estimates:

- The posterior distribution of the change-point index \(\tau\).
- The corresponding calendar date.
- The average price before the change.
- The average price after the change.
- The uncertainty associated with the estimates.
- The probability that the second regime has a higher mean.

### MCMC Sampling

The model used:

- Four MCMC chains.
- 1,500 tuning iterations per chain.
- 1,500 retained posterior draws per chain.
- Metropolis sampling for the discrete change-point parameter.
- NUTS sampling for continuous parameters.
- A fixed random seed for reproducibility.

The convergence results showed R-hat values close to 1, satisfactory effective sample sizes and zero divergences.

### Task 3: Interactive Dashboard

The final dashboard was developed using:

- Flask for the REST API.
- React for the user interface.
- Vite for frontend development and production builds.
- Recharts for interactive visualizations.

The dashboard enables users to:

- Explore historical Brent oil prices.
- Select custom start and end dates.
- Switch between daily, weekly and monthly frequencies.
- View the detected Bayesian change point.
- View researched historical-event markers.
- Select events and inspect event information.
- Focus the chart on a six-month event window.
- Review price and volatility summary metrics.
- Explore the chart using an interactive brush.
- Use the dashboard on desktop, tablet and mobile layouts.

---

## Dashboard Architecture

```text
Brent price data + Historical event data
                    │
                    ▼
        Data cleaning and EDA notebooks
                    │
                    ▼
          Bayesian PyMC model
                    │
                    ▼
        Processed CSV and JSON outputs
                    │
                    ▼
              Flask REST API
                    │
                    ▼
       React + Vite + Recharts dashboard
```

The notebooks generate processed outputs that are loaded by the Flask backend. The React frontend requests the data through the REST API and displays it as interactive charts, metrics and event details.

---

## Dashboard Screenshots

### Full Historical Dashboard

![Full historical Brent oil dashboard](reports/dashboard_screenshots/task3_dashboard_desktop.png)

### Filtered Change-Point View

![Filtered change-point dashboard](reports/dashboard_screenshots/task3_dashboard_filtered_change_point.png)

### Historical Event Drill-Down

![Historical event drill-down](reports/dashboard_screenshots/task3_dashboard_event_drilldown.png)

### Mobile Dashboard

![Responsive mobile dashboard](reports/dashboard_screenshots/task3_dashboard_mobile.png)

---

## API Endpoints

The Flask backend provides the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns API and dataset status |
| GET | `/api/prices` | Returns historical Brent price observations |
| GET | `/api/change-point` | Returns Bayesian change-point results |
| GET | `/api/events` | Returns the historical event dataset |
| GET | `/api/event-correlations` | Returns event proximity information |
| GET | `/api/summary` | Returns price and volatility summary metrics |

### Price Query Parameters

`/api/prices` accepts the following optional parameters:

| Parameter | Example | Description |
|---|---|---|
| `start_date` | `2004-01-01` | Beginning of selected period |
| `end_date` | `2006-12-31` | End of selected period |
| `frequency` | `monthly` | `daily`, `weekly` or `monthly` |

Example:

```text
http://127.0.0.1:5000/api/prices?start_date=2004-01-01&end_date=2006-12-31&frequency=monthly
```

---

## Project Structure

```text
brent-oil-change-point-analysis/
│
├── .github/
│   └── workflows/
│       └── unittests.yml
│
├── dashboard/
│   ├── backend/
│   │   ├── app.py
│   │   └── requirements.txt
│   │
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── assets/
│       │   ├── api.js
│       │   ├── App.jsx
│       │   ├── App.css
│       │   ├── index.css
│       │   └── main.jsx
│       ├── .env.example
│       ├── eslint.config.js
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       └── vite.config.js
│
├── data/
│   ├── raw/
│   │   └── BrentOilPrices.csv
│   ├── events/
│   │   └── oil_market_events.csv
│   └── processed/
│       ├── brent_oil_prices_cleaned.csv
│       ├── brent_prices_for_dashboard.csv
│       ├── change_point_results.json
│       └── event_correlations.csv
│
├── notebooks/
│   ├── __init__.py
│   ├── 01_task1_foundation_eda.ipynb
│   └── 02_task2_bayesian_change_point.ipynb
│
├── reports/
│   ├── figures/
│   ├── dashboard_screenshots/
│   ├── interim_task1_report.md
│   └── task1_assumptions_limitations.md
│
├── scripts/
│   └── __init__.py
│
├── src/
│   └── __init__.py
│
├── tests/
│   └── __init__.py
│
├── .gitignore
├── README.md
└── requirements.txt
```

After the final PDF is created, it should be added as:

```text
reports/final_report.pdf
```

The README can then include:

```markdown
## Final Report

The complete analytical report is available here:

[View the final report](reports/final_report.pdf)
```

---

## Dataset

The dataset contains historical daily Brent crude oil prices.

| Field | Description |
|---|---|
| `Date` | Date of the price observation |
| `Price` | Brent crude oil price in US dollars per barrel |

### Data Coverage

- Start date: 20 May 1987
- End date: 30 September 2022
- Clean observations used by the model: 8,980

The event reference contains 15 geopolitical, economic, sanctions-related and OPEC or OPEC+ events.

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone PASTE_YOUR_GITHUB_REPOSITORY_URL_HERE
cd brent-oil-change-point-analysis
```

Replace `PASTE_YOUR_GITHUB_REPOSITORY_URL_HERE` with the URL of this repository.

### 2. Create a Python Environment

On macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Running the Analysis Notebooks

Start Jupyter:

```bash
jupyter notebook
```

Run the notebooks in this order:

```text
notebooks/01_task1_foundation_eda.ipynb
notebooks/02_task2_bayesian_change_point.ipynb
```

The notebooks generate the processed datasets and model-result files used by the dashboard.

---

## Running the Flask Backend

From the project root:

```bash
source .venv/bin/activate
python dashboard/backend/app.py
```

The backend should run at:

```text
http://127.0.0.1:5000
```

Test the backend:

```bash
curl http://127.0.0.1:5000/api/health
```

---

## Running the React Frontend

Open a second terminal and navigate to the frontend:

```bash
cd dashboard/frontend
```

Install the Node dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env
```

The environment file should contain:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

Start the frontend:

```bash
npm run dev -- --port 5173
```

Open:

```text
http://localhost:5173
```

The Flask backend must remain running while using the dashboard.

---

## Frontend Quality Checks

Run ESLint:

```bash
cd dashboard/frontend
npm run lint
```

Create the production build:

```bash
npm run build
```

A successful build generates:

```text
dashboard/frontend/dist/
```

The `dist` directory is ignored by Git and should not be committed.

---

## Main Output Files

| File | Purpose |
|---|---|
| `brent_oil_prices_cleaned.csv` | Clean historical Brent price dataset |
| `brent_prices_for_dashboard.csv` | Dashboard-ready price observations |
| `change_point_results.json` | Bayesian change-point estimates |
| `event_correlations.csv` | Event proximity and association results |
| `oil_market_events.csv` | Researched historical event reference |
| `final_report.pdf` | Final analytical report after completion |

---

## Assumptions

The analysis assumes that:

- The historical Brent dataset accurately represents the benchmark price series.
- Event dates provide approximate starting points for major developments.
- One major structural break can be represented by a single change-point model.
- Observations within each regime can be summarized by a regime-specific mean.
- A Normal likelihood provides a simplified representation of the price data.

---

## Limitations

- Temporal proximity does not establish causality.
- The model assumes only one structural change.
- Multiple price regimes may exist across the full historical period.
- Oil prices exhibit autocorrelation and time-varying volatility.
- A constant-variance Normal likelihood may not capture extreme movements or heavy tails.
- Event dates and categories involve researcher judgment.
- The model does not directly include production, inventories, inflation, exchange rates, interest rates, GDP or global demand.
- Before-and-after means represent long historical regimes and not an immediate one-day event effect.

For these reasons, event interpretations use terms such as **associated with**, **coincides with** and **may have contributed to**, rather than claiming proven causal impact.

---

## Future Improvements

Potential extensions include:

- Bayesian models with multiple change points.
- Student-t likelihoods for heavy-tailed observations.
- Time-varying volatility models.
- Markov-switching regime models.
- Formal event-study windows.
- Macroeconomic explanatory variables.
- OPEC production and oil inventory data.
- Automated updates using newer Brent price observations.
- Cloud deployment of the Flask API and React dashboard.
- Automated testing for backend endpoints and frontend components.

---

## Technologies Used

### Data Analysis

- Python
- Pandas
- NumPy
- Matplotlib
- Seaborn
- Statsmodels
- Jupyter Notebook

### Bayesian Modeling

- PyMC
- ArviZ
- MCMC
- Metropolis
- NUTS

### Backend

- Flask
- Flask-CORS

### Frontend

- React
- Vite
- Recharts
- JavaScript
- CSS

### Development and Version Control

- Git
- GitHub
- GitHub Actions
- ESLint
- npm

---

## Reproducibility

To reproduce the project:

1. Clone the repository.
2. Create and activate the Python virtual environment.
3. Install the Python dependencies.
4. Run the Task 1 notebook.
5. Run the Task 2 notebook.
6. Start the Flask backend.
7. Start the React frontend.
8. Open the dashboard at `http://localhost:5173`.

All generated dashboard data is stored inside `data/processed`.

---

## Conclusion

The project completed a full workflow from historical price exploration to Bayesian modeling and interactive communication.

The model identified a clear structural break around February 2005. The estimated average Brent price was substantially higher in the period after the detected change. MCMC diagnostics showed satisfactory convergence under the selected model.

No researched event occurred sufficiently close to the detected date to support a strong immediate event association. The result is therefore interpreted as a broader structural market transition rather than proof that one specific event caused the change.

The Flask and React dashboard makes the analysis accessible by allowing users to explore historical prices, aggregation frequencies, change-point estimates and event windows interactively.

---

## Author

**Rediet Shewarega**

Brent Oil Price Change-Point Analysis  
Birhan Energies Data Science Project  
July 2026