import { useEffect, useState } from "react";

const initialForm = {
  annualSalary: "120000",
  monthlyDebts: "500",
  downPayment: "50000",
  maxDtiPercent: "36",
  interestRatePercent: "6.5",
  termYears: "30",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function dollars(value) {
  return money.format(Number(value));
}

function Field({ id, label, prefix, suffix, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className={`input-wrap${prefix ? " has-prefix" : ""}${suffix ? " has-suffix" : ""}`}>
        {prefix && <span className="input-affix">{prefix}</span>}
        <input id={id} name={id} {...props} />
        {suffix && <span className="input-affix">{suffix}</span>}
      </span>
    </label>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    const response = await fetch("/api/calculations");
    if (!response.ok) {
      throw new Error("Saved calculations could not be loaded.");
    }
    setHistory(await response.json());
  }

  useEffect(() => {
    loadHistory().catch(() => {
      setError("Could not connect to the calculator service. Please try again.");
    });
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function calculate(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            Object.entries(form).map(([key, value]) => [key, Number(value)]),
          ),
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          Object.values(data.errors ?? {}).join(" ") ||
            data.error ||
            "The calculation could not be completed.",
        );
      }

      setResult(data);
      await loadHistory();
    } catch (requestError) {
      setError(requestError.message || "The calculation could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Homewise home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 15.5 16 6l11 9.5V27H5V15.5Z" />
              <path d="M12 27v-8h8v8M3 16l13-11 13 11" />
            </svg>
          </span>
          <span>homewise</span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> Your home-buying starting point</span>
      </header>

      <section className="intro">
        <div className="eyebrow"><span /> KNOW YOUR NUMBERS</div>
        <h1>A home that fits<br />your <span>life,</span> not just your budget.</h1>
        <p>Get a clear, personalized estimate using your income, monthly debts, and the mortgage terms that work for you.</p>
      </section>

      <section className="calculator-layout" aria-label="Mortgage affordability calculator">
        <form className="calculator-card" onSubmit={calculate}>
          <div className="card-heading">
            <div>
              <span className="section-kicker">01 / YOUR FINANCES</span>
              <h2>Let&apos;s run the numbers</h2>
            </div>
            <span className="lock-icon" aria-label="Calculations are saved">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            </span>
          </div>

          <div className="field-grid">
            <Field
              id="annualSalary"
              label="Annual gross income"
              prefix="$"
              type="number"
              min="1"
              max="100000000"
              step="1000"
              required
              value={form.annualSalary}
              onChange={updateField}
            />
            <Field
              id="monthlyDebts"
              label="Monthly debt payments"
              prefix="$"
              type="number"
              min="0"
              max="1000000"
              step="50"
              required
              value={form.monthlyDebts}
              onChange={updateField}
            />
            <Field
              id="downPayment"
              label="Down payment"
              prefix="$"
              type="number"
              min="0"
              max="100000000"
              step="1000"
              required
              value={form.downPayment}
              onChange={updateField}
            />
            <Field
              id="maxDtiPercent"
              label="Max debt-to-income ratio"
              type="number"
              min="1"
              max="50"
              step="0.5"
              suffix="%"
              required
              value={form.maxDtiPercent}
              onChange={updateField}
            />
            <Field
              id="interestRatePercent"
              label="Annual interest rate"
              type="number"
              min="0"
              max="25"
              step="0.125"
              suffix="%"
              required
              value={form.interestRatePercent}
              onChange={updateField}
            />
            <Field
              id="termYears"
              label="Mortgage term"
              type="number"
              min="1"
              max="50"
              step="1"
              suffix="years"
              required
              value={form.termYears}
              onChange={updateField}
            />
          </div>

          <div className="field-hint">
            Include monthly minimum payments for credit cards, auto loans, student loans, and other debt.
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}

          <button className="calculate-button" type="submit" disabled={loading}>
            {loading ? "Calculating..." : "Calculate my estimate"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
          <p className="form-disclaimer">Your estimates are saved to this app&apos;s shared calculation history. Don&apos;t enter sensitive personal information.</p>
        </form>

        <aside className={`result-card${result ? " has-result" : ""}`} aria-live="polite">
          <div className="result-topline">
            <span className="section-kicker">02 / YOUR ESTIMATE</span>
            <span className="result-sparkle" aria-hidden="true">✳</span>
          </div>
          {result ? (
            <>
              <p className="result-label">Estimated maximum home price</p>
              <p className="result-amount">{dollars(result.maxHomePrice)}</p>
              <div className="result-divider" />
              <div className="result-row">
                <span>Estimated loan amount</span>
                <strong>{dollars(result.maxLoanAmount)}</strong>
              </div>
              <div className="result-row">
                <span>Monthly principal &amp; interest</span>
                <strong>{dollars(result.monthlyPaymentBudget)}<small>/mo</small></strong>
              </div>
              <p className="result-note">Based on your selected DTI limit, rate, and term.</p>
            </>
          ) : (
            <div className="empty-result">
              <div className="home-illustration" aria-hidden="true">
                <svg viewBox="0 0 168 126" fill="none">
                  <path d="M20 61 84 14l64 47v48H20V61Z" fill="#E4EEE5" />
                  <path d="m11 65 73-54 73 54" stroke="#38785A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M47 109V70h30v39M98 71h29v23H98z" fill="#F5F7F4" stroke="#38785A" strokeWidth="4" strokeLinejoin="round" />
                  <path d="M109 46h11" stroke="#A3C4A7" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="142" cy="27" r="13" fill="#F2D38C" />
                  <path d="M8 112h152" stroke="#B6C7B5" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Your next chapter starts here.</h3>
              <p>Enter your numbers to see a home price that aligns with your monthly budget.</p>
            </div>
          )}
          <div className="assumptions">
            <span className="assumptions-icon" aria-hidden="true">i</span>
            <p>This estimate includes principal &amp; interest only. Property taxes, homeowners insurance, HOA fees, PMI, and closing costs are not included.</p>
          </div>
        </aside>
      </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="history-heading">
          <div>
            <span className="section-kicker">YOUR RECENT ESTIMATES</span>
            <h2 id="history-title">A little perspective</h2>
          </div>
          <span className="history-count">{history.length} {history.length === 1 ? "estimate" : "estimates"}</span>
        </div>
        {history.length ? (
          <div className="history-list">
            {history.map((item) => (
              <article className="history-item" key={item.id}>
                <div>
                  <span className="history-date">{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  <strong>{dollars(item.max_home_price)}</strong>
                </div>
                <span>{item.term_years}-year term · {Number(item.interest_rate_percent).toFixed(2)}% rate · {Number(item.max_dti_percent)}% DTI</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="history-empty">Your saved estimates will appear here after your first calculation.</p>
        )}
      </section>

      <footer className="page-footer">
        <span>homewise <span className="footer-dot">·</span> A clearer path to your next home</span>
        <span>Estimates are for educational purposes only and are not a loan offer.</span>
      </footer>
    </main>
  );
}
