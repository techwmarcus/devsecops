import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useAuthenticator } from "@aws-amplify/ui-react";

const initialForm = {
  annualSalary: "",
  homePrice: "",
  downPaymentPercent: "20",
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
  const { user, signOut } = useAuthenticator((context) => [
    context.user,
    context.signOut,
  ]);
  const [calculationType, setCalculationType] = useState("salary-to-price");
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    const response = await authenticatedFetch("/api/calculations");
    if (!response.ok) {
      throw new Error("Saved calculations could not be loaded.");
    }
    setHistory(await response.json());
  }

  async function authenticatedFetch(url, options = {}) {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken.toString();
    if (!accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
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
      const response = await authenticatedFetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          {
            calculationType,
            ...(calculationType === "salary-to-price"
              ? { annualSalary: Number(form.annualSalary) }
              : { homePrice: Number(form.homePrice) }),
            downPaymentPercent: Number(form.downPaymentPercent),
            interestRatePercent: Number(form.interestRatePercent),
            termYears: Number(form.termYears),
          },
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

  function changeCalculationType(type) {
    setCalculationType(type);
    setResult(null);
    setError("");
  }

  const isSalaryToPrice = calculationType === "salary-to-price";

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
        <div className="account-actions">
          <span className="topbar-note"><span className="status-dot" /> {user?.signInDetails?.loginId ?? user?.username}</span>
          <button className="sign-out-button" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="intro">
        <div className="eyebrow"><span /> KNOW YOUR NUMBERS</div>
        <h1>A home that fits<br />your <span>life,</span> not just your budget.</h1>
        <p>Explore a home price based on your income, or find the income you&apos;d need for a home you have in mind.</p>
      </section>

      <section className="calculator-layout" aria-label="Mortgage affordability calculator">
        <form className="calculator-card" onSubmit={calculate}>
          <div className="card-heading">
            <div>
              <span className="section-kicker">01 / YOUR FINANCES</span>
              <h2>{isSalaryToPrice ? "How much home can I afford?" : "What income do I need?"}</h2>
            </div>
            <span className="lock-icon" aria-label="Calculations are saved">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            </span>
          </div>

          <div className="mode-selector" role="group" aria-label="Choose a calculation">
            <button
              className={isSalaryToPrice ? "mode-button active" : "mode-button"}
              type="button"
              aria-pressed={isSalaryToPrice}
              onClick={() => changeCalculationType("salary-to-price")}
            >
              I know my salary
            </button>
            <button
              className={!isSalaryToPrice ? "mode-button active" : "mode-button"}
              type="button"
              aria-pressed={!isSalaryToPrice}
              onClick={() => changeCalculationType("price-to-salary")}
            >
              I know the home price
            </button>
          </div>

          <div className="field-grid">
            {isSalaryToPrice ? (
              <Field
                id="annualSalary"
                label="Annual gross salary"
                prefix="$"
                type="number"
                min="1"
                max="100000000"
                step="1"
                required
                value={form.annualSalary}
                onChange={updateField}
              />
            ) : (
              <Field
                id="homePrice"
                label="Home price"
                prefix="$"
                type="number"
                min="1"
                max="100000000"
                step="1"
                required
                value={form.homePrice}
                onChange={updateField}
              />
            )}
            <label className="field slider-field" htmlFor="downPaymentPercent">
              <span className="slider-label">
                <span className="field-label">Down payment</span>
                <output htmlFor="downPaymentPercent">{form.downPaymentPercent}%</output>
              </span>
              <input
                id="downPaymentPercent"
                name="downPaymentPercent"
                type="range"
                min="0"
                max="95"
                step="1"
                value={form.downPaymentPercent}
                onChange={updateField}
              />
              <span className="slider-range"><span>0%</span><span>95%</span></span>
            </label>
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
            {isSalaryToPrice
              ? "Uses 28% of gross monthly salary as a fixed principal-and-interest budgeting guideline."
              : "Estimates the annual gross salary needed to cover principal and interest using the same 28% guideline."}
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}

          <button className="calculate-button" type="submit" disabled={loading}>
            {loading ? "Calculating..." : isSalaryToPrice ? "Calculate my home price" : "Calculate required salary"}
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
              <p className="result-label">
                {isSalaryToPrice ? "Estimated maximum home price" : "Estimated annual gross salary needed"}
              </p>
              <p className="result-amount">{dollars(isSalaryToPrice ? result.maxHomePrice : result.annualSalary)}</p>
              <div className="result-divider" />
              <div className="result-row">
                <span>Estimated mortgage amount</span>
                <strong>{dollars(result.maxLoanAmount)}</strong>
              </div>
              <div className="result-row">
                <span>Monthly principal &amp; interest</span>
                <strong>{dollars(result.monthlyPayment)}<small>/mo</small></strong>
              </div>
              <div className="result-row">
                <span>Down payment ({form.downPaymentPercent}%)</span>
                <strong>{dollars(result.downPaymentAmount)}</strong>
              </div>
              <p className="result-note">Based on a 28% salary guideline, your rate, and {form.termYears}-year term.</p>
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
              <p>{isSalaryToPrice
                ? "Enter your salary to estimate a home price that fits your monthly budget."
                : "Enter a home price to estimate the salary needed for the mortgage."}</p>
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
                  <strong>{dollars(item.calculation_type === "price-to-salary" ? item.annual_salary : item.max_home_price)}</strong>
                </div>
                <span>
                  {item.calculation_type === "price-to-salary" ? "Income needed" : "Affordable home"}
                  {" · "}{item.term_years}-year term · {Number(item.interest_rate_percent).toFixed(2)}% rate · {Number(item.down_payment_percent)}% down
                </span>
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
