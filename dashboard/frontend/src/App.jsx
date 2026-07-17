import { useEffect, useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getChangePoint,
  getEventCorrelations,
  getHealth,
  getPrices,
  getSummary,
} from "./api";

import "./App.css";

const DEFAULT_FILTERS = {
  startDate: "1987-05-20",
  endDate: "2022-09-30",
  frequency: "monthly",
};

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Not available";
  }

  return `${number.toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatAxisDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00Z`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function offsetDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function findClosestPricePoint(targetDate, priceData) {
  if (!targetDate || priceData.length === 0) {
    return null;
  }

  const targetTime = new Date(
    `${targetDate}T00:00:00Z`,
  ).getTime();

  return priceData.reduce((closest, current) => {
    const closestDifference = Math.abs(
      new Date(`${closest.date}T00:00:00Z`).getTime() -
        targetTime,
    );

    const currentDifference = Math.abs(
      new Date(`${current.date}T00:00:00Z`).getTime() -
        targetTime,
    );

    return currentDifference < closestDifference
      ? current
      : closest;
  });
}

function MetricCard({ label, value, note }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <span>{note}</span>}
    </article>
  );
}

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <span>{formatDate(label)}</span>
      <strong>{formatCurrency(payload[0].value)}</strong>
    </div>
  );
}

function App() {
  const [health, setHealth] = useState(null);
  const [changePoint, setChangePoint] = useState(null);
  const [events, setEvents] = useState([]);
  const [prices, setPrices] = useState([]);
  const [summary, setSummary] = useState(null);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState(DEFAULT_FILTERS);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRange(nextFilters) {
    setIsLoading(true);
    setError("");

    try {
      const [priceResponse, summaryResponse] =
        await Promise.all([
          getPrices(nextFilters),
          getSummary(nextFilters),
        ]);

      setPrices(priceResponse.data);
      setSummary(summaryResponse);
      setAppliedFilters(nextFilters);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [
          healthResponse,
          changePointResponse,
          eventsResponse,
        ] = await Promise.all([
          getHealth(),
          getChangePoint(),
          getEventCorrelations(),
        ]);

        if (ignore) {
          return;
        }

        const initialFilters = {
          startDate: healthResponse.data_start,
          endDate: healthResponse.data_end,
          frequency: "monthly",
        };

        const [priceResponse, summaryResponse] =
          await Promise.all([
            getPrices(initialFilters),
            getSummary(initialFilters),
          ]);

        if (ignore) {
          return;
        }

        setHealth(healthResponse);
        setChangePoint(changePointResponse);
        setEvents(eventsResponse.data);
        setPrices(priceResponse.data);
        setSummary(summaryResponse);
        setFilters(initialFilters);
        setAppliedFilters(initialFilters);
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    return events.filter(
      (event) =>
        event.date >= appliedFilters.startDate &&
        event.date <= appliedFilters.endDate,
    );
  }, [events, appliedFilters]);

  const eventMarkers = useMemo(() => {
    return visibleEvents
      .map((event) => {
        const point = findClosestPricePoint(
          event.date,
          prices,
        );

        if (!point) {
          return null;
        }

        return {
          ...event,
          markerDate: point.date,
          markerPrice: point.price,
        };
      })
      .filter(Boolean);
  }, [visibleEvents, prices]);

  const changePointMarker = useMemo(() => {
    if (!changePoint) {
      return null;
    }

    return findClosestPricePoint(
      changePoint.change_point_date,
      prices,
    );
  }, [changePoint, prices]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  async function handleFilterSubmit(event) {
    event.preventDefault();

    if (filters.startDate > filters.endDate) {
      setError(
        "The start date cannot be after the end date.",
      );
      return;
    }

    await loadRange(filters);
  }

  async function resetDashboard() {
    if (!health) {
      return;
    }

    const nextFilters = {
      startDate: health.data_start,
      endDate: health.data_end,
      frequency: "monthly",
    };

    setFilters(nextFilters);
    setSelectedEvent(null);

    await loadRange(nextFilters);
  }

  async function focusOnEvent(event) {
    if (!health) {
      return;
    }

    const calculatedStart = offsetDate(event.date, -180);
    const calculatedEnd = offsetDate(event.date, 180);

    const nextFilters = {
      startDate:
        calculatedStart < health.data_start
          ? health.data_start
          : calculatedStart,
      endDate:
        calculatedEnd > health.data_end
          ? health.data_end
          : calculatedEnd,
      frequency: "daily",
    };

    setSelectedEvent(event);
    setFilters(nextFilters);

    await loadRange(nextFilters);
  }

  const associationStrength =
    changePoint?.event_association_strength || "unknown";

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">BO</div>

          <div>
            <strong>Brent Oil Intelligence</strong>
            <span>Bayesian change-point dashboard</span>
          </div>
        </div>

        <div
          className={`service-status ${
            health ? "online" : "offline"
          }`}
        >
          <span />
          {health ? "API connected" : "API disconnected"}
        </div>
      </header>

      <main className="dashboard-main">
        <section className="hero">
          <div>
            <p className="eyebrow">Market regime analysis</p>

            <h1>
              Explore structural shifts in historical
              Brent oil prices
            </h1>

            <p className="hero-description">
              Analyze price trends, volatility, major
              events, and the Bayesian structural break
              detected in February 2005.
            </p>
          </div>

          {changePoint && (
            <article className="hero-insight">
              <span>Detected structural change</span>

              <strong>
                {formatDate(
                  changePoint.change_point_date,
                )}
              </strong>

              <p>
                Mean price increased from{" "}
                {formatCurrency(
                  changePoint.mean_before,
                )}{" "}
                to{" "}
                {formatCurrency(
                  changePoint.mean_after,
                )}
                .
              </p>
            </article>
          )}
        </section>

        <form
          className="filter-panel"
          onSubmit={handleFilterSubmit}
        >
          <label>
            <span>Start date</span>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              min={health?.data_start}
              max={health?.data_end}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            <span>End date</span>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              min={health?.data_start}
              max={health?.data_end}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            <span>Frequency</span>
            <select
              name="frequency"
              value={filters.frequency}
              onChange={handleFilterChange}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <div className="filter-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isLoading}
            >
              Apply filters
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={resetDashboard}
              disabled={isLoading}
            >
              Reset
            </button>
          </div>
        </form>

        {error && (
          <div className="error-banner">
            <strong>Dashboard error</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="metric-grid">
          <MetricCard
            label="Average price"
            value={formatCurrency(
              summary?.average_price,
            )}
            note="Selected period"
          />

          <MetricCard
            label="Period change"
            value={formatPercent(
              summary?.period_change_percent,
            )}
            note="First to last observation"
          />

          <MetricCard
            label="Annualized volatility"
            value={formatPercent(
              summary?.annualized_volatility_percent,
            )}
            note="Based on log returns"
          />

          <MetricCard
            label="Model regime shift"
            value={formatPercent(
              changePoint?.percentage_change,
            )}
            note="Posterior mean increase"
          />

          <MetricCard
            label="Displayed observations"
            value={prices.length.toLocaleString()}
            note={`${appliedFilters.frequency} chart points`}
          />
        </section>

        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">
                Historical prices
              </p>
              <h2>Brent price trend and market events</h2>
            </div>

            <span className="frequency-badge">
              {appliedFilters.frequency}
            </span>
          </div>

          <p className="panel-description">
            Event dots can be selected for more details.
            Use the lower brush to inspect a smaller section
            of the timeline.
          </p>

          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-state">
                Loading market data...
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={prices}
                  margin={{
                    top: 20,
                    right: 24,
                    left: 8,
                    bottom: 18,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    minTickGap={42}
                    tickFormatter={formatAxisDate}
                  />

                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    width={58}
                  />

                  <Tooltip content={<PriceTooltip />} />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Brent price"
                    stroke="#126e82"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />

                  {changePointMarker && (
                    <ReferenceLine
                      x={changePointMarker.date}
                      stroke="#d55d2d"
                      strokeWidth={2}
                      strokeDasharray="6 5"
                      label={{
                        value: `Change point: ${formatDate(
                          changePoint.change_point_date,
                        )}`,
                        position: "insideTopRight",
                        fill: "#9e3f1b",
                        fontSize: 12,
                      }}
                    />
                  )}

                  {eventMarkers.map((event) => {
                    const isSelected =
                      selectedEvent?.date === event.date &&
                      selectedEvent?.event === event.event;

                    return (
                      <ReferenceDot
                        key={`${event.date}-${event.event}`}
                        x={event.markerDate}
                        y={event.markerPrice}
                        r={isSelected ? 8 : 5}
                        fill={
                          isSelected
                            ? "#d55d2d"
                            : "#f2b134"
                        }
                        stroke="#ffffff"
                        strokeWidth={2}
                        cursor="pointer"
                        ifOverflow="visible"
                        onClick={() =>
                          setSelectedEvent(event)
                        }
                      />
                    );
                  })}

                  <Brush
                    dataKey="date"
                    height={28}
                    travellerWidth={9}
                    tickFormatter={formatAxisDate}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-legend-note">
            <span className="legend-change">
              Structural change
            </span>
            <span className="legend-event">
              Researched event
            </span>
          </div>
        </section>

        <section className="insight-grid">
          <article className="panel model-panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  Bayesian model
                </p>
                <h2>Change-point interpretation</h2>
              </div>

              <span
                className={`association-badge ${associationStrength}`}
              >
                {associationStrength} event association
              </span>
            </div>

            {changePoint && (
              <>
                <div className="model-values">
                  <div>
                    <span>Change date</span>
                    <strong>
                      {formatDate(
                        changePoint.change_point_date,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>95% interval</span>
                    <strong>
                      {formatDate(
                        changePoint.credible_date_lower,
                      )}{" "}
                      to{" "}
                      {formatDate(
                        changePoint.credible_date_upper,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Mean before</span>
                    <strong>
                      {formatCurrency(
                        changePoint.mean_before,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Mean after</span>
                    <strong>
                      {formatCurrency(
                        changePoint.mean_after,
                      )}
                    </strong>
                  </div>
                </div>

                <p className="insight-text">
                  The model estimates an absolute mean
                  increase of{" "}
                  <strong>
                    {formatCurrency(
                      changePoint.absolute_change,
                    )}
                  </strong>
                  , equivalent to{" "}
                  <strong>
                    {formatPercent(
                      changePoint.percentage_change,
                    )}
                  </strong>
                  .
                </p>

                <div className="association-note">
                  <strong>
                    Nearest researched event:{" "}
                    {changePoint.nearest_event_name}
                  </strong>

                  <p>
                    {changePoint.event_association_note}
                  </p>
                </div>
              </>
            )}
          </article>

          <article className="panel selected-event-panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  Event drill-down
                </p>
                <h2>Selected event</h2>
              </div>
            </div>

            {selectedEvent ? (
              <div className="selected-event-content">
                <span className="event-category">
                  {selectedEvent.category}
                </span>

                <h3>{selectedEvent.event}</h3>

                <time>{formatDate(selectedEvent.date)}</time>

                <p>{selectedEvent.notes}</p>

                <dl className="event-details">
                  <div>
                    <dt>Expected market effect</dt>
                    <dd>
                      {
                        selectedEvent.expected_market_effect
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Distance from change point</dt>
                    <dd>
                      {selectedEvent.absolute_distance_days}{" "}
                      days
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    focusOnEvent(selectedEvent)
                  }
                >
                  Focus on six-month window
                </button>
              </div>
            ) : (
              <div className="empty-state">
                Select an event marker or event card to
                inspect its details.
              </div>
            )}
          </article>
        </section>

        <section className="panel event-panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">
                Market context
              </p>
              <h2>Events in the selected period</h2>
            </div>

            <span className="event-count">
              {visibleEvents.length} events
            </span>
          </div>

          {visibleEvents.length > 0 ? (
            <div className="event-list">
              {visibleEvents.map((event) => {
                const isSelected =
                  selectedEvent?.date === event.date &&
                  selectedEvent?.event === event.event;

                return (
                  <button
                    type="button"
                    key={`${event.date}-${event.event}`}
                    className={`event-row ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedEvent(event)
                    }
                  >
                    <div>
                      <span>{formatDate(event.date)}</span>
                      <strong>{event.event}</strong>
                    </div>

                    <div>
                      <span>{event.category}</span>
                      <strong>
                        {event.expected_market_effect}
                      </strong>
                    </div>

                    <div>
                      <span>Change-point distance</span>
                      <strong>
                        {event.absolute_distance_days} days
                      </strong>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              No researched events fall within this date
              range.
            </div>
          )}
        </section>
      </main>

      <footer>
        Brent Oil Change-Point Analysis · Data through{" "}
        {health?.data_end || "2022-09-30"}
      </footer>
    </div>
  );
}

export default App;