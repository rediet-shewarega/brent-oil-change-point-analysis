import { useEffect, useState } from "react";
import { getHealth } from "./api";
import "./App.css";

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const response = await getHealth();
        setHealth(response);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadHealth();
  }, []);

  return (
    <main className="connection-page">
      <section className="connection-card">
        <p className="eyebrow">Birhan Energies</p>
        <h1>Brent Oil Intelligence Dashboard</h1>

        {isLoading && <p>Connecting to the Flask API...</p>}

        {error && (
          <div className="error-message">
            <strong>Connection failed</strong>
            <p>{error}</p>
          </div>
        )}

        {health && (
          <div className="success-message">
            <strong>Backend connection successful</strong>

            <dl>
              <div>
                <dt>Status</dt>
                <dd>{health.status}</dd>
              </div>

              <div>
                <dt>Price records</dt>
                <dd>{health.price_records.toLocaleString()}</dd>
              </div>

              <div>
                <dt>Event records</dt>
                <dd>{health.event_records}</dd>
              </div>

              <div>
                <dt>Data period</dt>
                <dd>
                  {health.data_start} to {health.data_end}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;