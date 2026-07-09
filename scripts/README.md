# Brent Oil Change Point Analysis

## Project Overview

This project analyzes historical Brent oil prices to identify structural changes and associate them with major geopolitical, economic, and OPEC-related events. The project is prepared for Birhan Energies, a consultancy firm that provides data-driven insights to stakeholders in the energy sector.

## Business Objective

The goal is to help investors, policymakers, and energy companies understand how major events may be associated with changes in Brent oil prices. The analysis uses time series exploration and Bayesian change point modeling.

## Task 1 Scope

The interim submission focuses on Task 1:

- Defining the analysis workflow
- Loading and understanding Brent oil price data
- Conducting initial EDA
- Researching major oil market events
- Creating a structured event dataset
- Documenting assumptions and limitations

## Project Structure

- `data/raw/`: Original Brent oil price dataset
- `data/processed/`: Cleaned Brent oil data
- `data/events/`: Structured event dataset
- `notebooks/`: Jupyter notebooks
- `reports/`: Interim report and EDA visualizations
- `src/`: Source code
- `tests/`: Test files
- `scripts/`: Utility scripts

## How to Run

Install dependencies:

```bash
pip install -r requirements.txt