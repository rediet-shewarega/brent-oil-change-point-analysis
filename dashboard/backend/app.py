from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


# -------------------------------------------------------------------
# Project paths
# -------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIRECTORY = PROJECT_ROOT / "data" / "processed"

PRICES_PATH = (
    PROCESSED_DIRECTORY
    / "brent_prices_for_dashboard.csv"
)

CHANGE_POINT_PATH = (
    PROCESSED_DIRECTORY
    / "change_point_results.json"
)

EVENT_CORRELATIONS_PATH = (
    PROCESSED_DIRECTORY
    / "event_correlations.csv"
)


# -------------------------------------------------------------------
# File validation
# -------------------------------------------------------------------

REQUIRED_FILES = [
    PRICES_PATH,
    CHANGE_POINT_PATH,
    EVENT_CORRELATIONS_PATH,
]

missing_files = [
    path
    for path in REQUIRED_FILES
    if not path.exists()
]

if missing_files:
    missing_text = "\n".join(
        f"- {path}"
        for path in missing_files
    )

    raise FileNotFoundError(
        "Required Task 2 output files are missing:\n"
        f"{missing_text}\n\n"
        "Run the Task 2 notebook before starting the API."
    )


# -------------------------------------------------------------------
# Data-loading helpers
# -------------------------------------------------------------------

def normalize_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """Normalize dataframe column names for API use."""

    dataframe = dataframe.copy()

    dataframe.columns = (
        dataframe.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    return dataframe


def load_prices() -> pd.DataFrame:
    """Load and validate dashboard price data."""

    dataframe = pd.read_csv(PRICES_PATH)
    dataframe = normalize_columns(dataframe)

    required_columns = {"date", "price"}

    missing_columns = required_columns.difference(
        dataframe.columns
    )

    if missing_columns:
        raise ValueError(
            "Price data is missing columns: "
            f"{sorted(missing_columns)}"
        )

    dataframe["date"] = pd.to_datetime(
        dataframe["date"],
        errors="coerce",
    )

    dataframe["price"] = pd.to_numeric(
        dataframe["price"],
        errors="coerce",
    )

    dataframe = (
        dataframe
        .dropna(subset=["date", "price"])
        .sort_values("date")
        .reset_index(drop=True)
    )

    return dataframe


def load_events() -> pd.DataFrame:
    """Load and validate event-correlation data."""

    dataframe = pd.read_csv(
        EVENT_CORRELATIONS_PATH
    )

    dataframe = normalize_columns(dataframe)

    if "date" not in dataframe.columns:
        raise ValueError(
            "Event correlation data must contain "
            "a 'date' column."
        )

    dataframe["date"] = pd.to_datetime(
        dataframe["date"],
        errors="coerce",
    )

    dataframe = (
        dataframe
        .dropna(subset=["date"])
        .sort_values("date")
        .reset_index(drop=True)
    )

    if (
        "distance_days" in dataframe.columns
        and "absolute_distance_days"
        not in dataframe.columns
    ):
        dataframe["absolute_distance_days"] = (
            dataframe["distance_days"].abs()
        )

    return dataframe


def load_change_point() -> dict[str, Any]:
    """Load the exported Bayesian model result."""

    with open(
        CHANGE_POINT_PATH,
        "r",
        encoding="utf-8",
    ) as input_file:
        return json.load(input_file)


prices_dataframe = load_prices()
events_dataframe = load_events()
change_point_result = load_change_point()


# -------------------------------------------------------------------
# Serialization and filtering helpers
# -------------------------------------------------------------------

def parse_date_argument(
    argument_name: str,
) -> pd.Timestamp | None:
    """Parse an optional YYYY-MM-DD query parameter."""

    value = request.args.get(argument_name)

    if not value:
        return None

    parsed_value = pd.to_datetime(
        value,
        format="%Y-%m-%d",
        errors="coerce",
    )

    if pd.isna(parsed_value):
        raise ValueError(
            f"{argument_name} must use YYYY-MM-DD format."
        )

    return pd.Timestamp(parsed_value)


def filter_by_date(
    dataframe: pd.DataFrame,
    start_date: pd.Timestamp | None,
    end_date: pd.Timestamp | None,
) -> pd.DataFrame:
    """Filter a dataframe using its date column."""

    filtered = dataframe.copy()

    if start_date is not None:
        filtered = filtered.loc[
            filtered["date"] >= start_date
        ]

    if end_date is not None:
        filtered = filtered.loc[
            filtered["date"] <= end_date
        ]

    return filtered


def dataframe_records(
    dataframe: pd.DataFrame,
) -> list[dict[str, Any]]:
    """Convert a dataframe into JSON-safe records."""

    output = dataframe.copy()

    for column in output.columns:
        if pd.api.types.is_datetime64_any_dtype(
            output[column]
        ):
            output[column] = output[column].dt.strftime(
                "%Y-%m-%d"
            )

    output = output.astype(object).where(
        pd.notna(output),
        None,
    )

    return output.to_dict(orient="records")


# -------------------------------------------------------------------
# Flask application
# -------------------------------------------------------------------

app = Flask(__name__)

frontend_origin = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173",
)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": frontend_origin,
        }
    },
)


# -------------------------------------------------------------------
# Error handling
# -------------------------------------------------------------------

@app.errorhandler(ValueError)
def handle_value_error(
    error: ValueError,
):
    return jsonify(
        {
            "error": str(error),
        }
    ), 400


@app.errorhandler(404)
def handle_not_found(
    _error: Exception,
):
    return jsonify(
        {
            "error": "Endpoint not found.",
        }
    ), 404


# -------------------------------------------------------------------
# API endpoints
# -------------------------------------------------------------------

@app.get("/api/health")
def health():
    """Confirm that the API and data files are available."""

    return jsonify(
        {
            "status": "healthy",
            "service": (
                "Brent Oil Change Point API"
            ),
            "price_records": int(
                len(prices_dataframe)
            ),
            "event_records": int(
                len(events_dataframe)
            ),
            "data_start": (
                prices_dataframe["date"]
                .min()
                .date()
                .isoformat()
            ),
            "data_end": (
                prices_dataframe["date"]
                .max()
                .date()
                .isoformat()
            ),
        }
    )


@app.get("/api/prices")
def prices():
    """
    Return historical price data.

    Query parameters:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - frequency: daily, weekly, or monthly
    """

    start_date = parse_date_argument(
        "start_date"
    )

    end_date = parse_date_argument(
        "end_date"
    )

    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise ValueError(
            "start_date cannot be after end_date."
        )

    frequency = request.args.get(
        "frequency",
        "daily",
    ).lower()

    frequency_rules = {
        "daily": None,
        "weekly": "W-FRI",
        "monthly": "MS",
    }

    if frequency not in frequency_rules:
        raise ValueError(
            "frequency must be daily, weekly, or monthly."
        )

    filtered = filter_by_date(
        prices_dataframe,
        start_date,
        end_date,
    )

    rule = frequency_rules[frequency]

    if rule is not None and not filtered.empty:
        aggregation = {
            "price": "mean",
        }

        if "log_return" in filtered.columns:
            aggregation["log_return"] = "mean"

        filtered = (
            filtered
            .set_index("date")
            .resample(rule)
            .agg(aggregation)
            .dropna(subset=["price"])
            .reset_index()
        )

    filtered["price"] = filtered["price"].round(
        4
    )

    if "log_return" in filtered.columns:
        filtered["log_return"] = (
            filtered["log_return"].round(8)
        )

    return jsonify(
        {
            "frequency": frequency,
            "count": int(len(filtered)),
            "data": dataframe_records(filtered),
        }
    )


@app.get("/api/change-point")
def change_point():
    """Return the Bayesian change-point result."""

    return jsonify(change_point_result)


@app.get("/api/events")
def events():
    """
    Return researched market events.

    Query parameters:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - category: optional event category
    """

    start_date = parse_date_argument(
        "start_date"
    )

    end_date = parse_date_argument(
        "end_date"
    )

    category = request.args.get("category")

    filtered = filter_by_date(
        events_dataframe,
        start_date,
        end_date,
    )

    if category:
        if "category" not in filtered.columns:
            raise ValueError(
                "The event data does not contain "
                "a category column."
            )

        filtered = filtered.loc[
            filtered["category"]
            .str.casefold()
            == category.casefold()
        ]

    return jsonify(
        {
            "count": int(len(filtered)),
            "data": dataframe_records(filtered),
        }
    )


@app.get("/api/event-correlations")
def event_correlations():
    """Return events ordered by change-point proximity."""

    filtered = events_dataframe.copy()

    if "absolute_distance_days" in filtered.columns:
        filtered = filtered.sort_values(
            "absolute_distance_days"
        )

    return jsonify(
        {
            "count": int(len(filtered)),
            "data": dataframe_records(filtered),
        }
    )


@app.get("/api/summary")
def summary():
    """
    Return summary indicators for a selected date range.

    Query parameters:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    """

    start_date = parse_date_argument(
        "start_date"
    )

    end_date = parse_date_argument(
        "end_date"
    )

    filtered = filter_by_date(
        prices_dataframe,
        start_date,
        end_date,
    )

    if filtered.empty:
        raise ValueError(
            "No price data exists for the selected range."
        )

    price_series = filtered["price"]

    log_returns = np.log(
        price_series
    ).diff().dropna()

    annualized_volatility = None

    if len(log_returns) > 1:
        annualized_volatility = (
            float(log_returns.std())
            * np.sqrt(252)
            * 100
        )

    first_price = float(price_series.iloc[0])
    last_price = float(price_series.iloc[-1])

    period_change_percent = (
        ((last_price / first_price) - 1)
        * 100
        if first_price > 0
        else None
    )

    return jsonify(
        {
            "start_date": (
                filtered["date"]
                .min()
                .date()
                .isoformat()
            ),
            "end_date": (
                filtered["date"]
                .max()
                .date()
                .isoformat()
            ),
            "observations": int(len(filtered)),
            "average_price": round(
                float(price_series.mean()),
                2,
            ),
            "minimum_price": round(
                float(price_series.min()),
                2,
            ),
            "maximum_price": round(
                float(price_series.max()),
                2,
            ),
            "period_change_percent": round(
                period_change_percent,
                2,
            ),
            "annualized_volatility_percent": (
                round(
                    annualized_volatility,
                    2,
                )
                if annualized_volatility
                is not None
                else None
            ),
        }
    )


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )