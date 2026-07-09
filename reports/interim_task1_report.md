# Interim Report: Task 1 — Foundation for Brent Oil Change Point Analysis

## 1. Project Objective

The objective of this project is to analyze Brent oil prices and identify major structural changes that may be associated with geopolitical events, OPEC decisions, sanctions, conflicts, and global economic shocks. The analysis is prepared from the perspective of Birhan Energies, a consultancy firm that provides data-driven insights to investors, policymakers, and energy companies.

## 2. Planned Analysis Workflow

The analysis will follow a structured data science workflow:

1. Load the Brent oil price dataset.
2. Convert the Date column into datetime format and clean the Price column.
3. Sort the dataset chronologically and check for missing values.
4. Conduct exploratory data analysis by plotting raw prices, log prices, log returns, and rolling volatility.
5. Test stationarity using the Augmented Dickey-Fuller test.
6. Research major geopolitical, economic, and OPEC-related events that may affect oil prices.
7. Build a structured event dataset with event dates, categories, and expected market effects.
8. In Task 2, build a Bayesian change point model using PyMC.
9. Compare detected change point dates with the researched event dataset.
10. Interpret the results carefully, distinguishing time-based association from proven causality.

## 3. Initial EDA Findings

The raw Brent oil price series shows strong long-term fluctuations, including periods of rapid increases, sharp declines, and crisis-driven volatility. This suggests that Brent oil prices are influenced by major global events and market cycles.

The log return series shows volatility clustering, meaning that large price movements tend to occur close together. This is important because volatility clustering may indicate periods of market stress.

The rolling volatility analysis helps identify periods where the oil market became more unstable. These periods can later be compared with the event dataset to see whether large volatility changes align with major geopolitical or economic events.

## 4. Event Dataset

A structured event dataset was created with major oil-market-related events, including conflicts, OPEC decisions, sanctions, and global economic shocks. This event dataset will be used in Task 2 to compare statistically detected change points with real-world events.

## 5. Assumptions and Limitations

This analysis assumes that major events may be reflected in Brent oil prices as structural breaks. However, a detected change point near an event does not prove causality. Oil prices are influenced by many factors at the same time, including supply, demand, expectations, production policy, sanctions, exchange rates, and macroeconomic conditions.

Therefore, the analysis will use careful language such as “associated with,” “aligned with,” or “may suggest,” instead of claiming that an event directly caused a price change.

## 6. Communication Plan

The results will be communicated through a final report or blog post and an interactive dashboard. The report will explain the methodology, change point results, quantified impacts, limitations, and future work. The dashboard will allow stakeholders to explore Brent oil prices, detected change points, and related events interactively.