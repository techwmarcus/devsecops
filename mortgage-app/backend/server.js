import express from "express";
import helmet from "helmet";
import mysql from "mysql2/promise";
import { calculateAffordability } from "./calculator.js";

const port = Number(process.env.PORT ?? 3306);
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "terraform-20261104032023668800000008.c1wke22u2wo0.us-west-1.rds.amazonaws.com",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE ?? "mortgage",
  user: process.env.MYSQL_USER ?? "admin",
  password: process.env.MYSQL_PASSWORD ?? "admin123",
  waitForConnections: true,
  connectionLimit: 10,
});

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

await pool.execute(`
  CREATE TABLE IF NOT EXISTS calculations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    annual_salary DECIMAL(12, 2) NOT NULL,
    monthly_debts DECIMAL(12, 2) NOT NULL,
    down_payment DECIMAL(12, 2) NOT NULL,
    max_dti_percent DECIMAL(5, 2) NOT NULL,
    interest_rate_percent DECIMAL(5, 3) NOT NULL,
    term_years SMALLINT UNSIGNED NOT NULL,
    monthly_payment_budget DECIMAL(14, 2) NOT NULL,
    max_loan_amount DECIMAL(14, 2) NOT NULL,
    max_home_price DECIMAL(14, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_calculations_created_at (created_at)
  )
`);

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.get("/api/calculations", async (_request, response, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, annual_salary, monthly_debts, down_payment,
             max_dti_percent, interest_rate_percent, term_years,
             monthly_payment_budget, max_loan_amount, max_home_price, created_at
      FROM calculations
      ORDER BY created_at DESC, id DESC
      LIMIT 10
    `);
    response.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/calculations", async (request, response, next) => {
  try {
    const { result, errors } = calculateAffordability(request.body ?? {});
    if (errors) {
      response.status(400).json({ errors });
      return;
    }

    const input = request.body;
    const [insertResult] = await pool.execute(
      `INSERT INTO calculations
        (annual_salary, monthly_debts, down_payment, max_dti_percent,
         interest_rate_percent, term_years, monthly_payment_budget,
         max_loan_amount, max_home_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.annualSalary,
        input.monthlyDebts,
        input.downPayment,
        input.maxDtiPercent,
        input.interestRatePercent,
        input.termYears,
        result.monthlyPaymentBudget,
        result.maxLoanAmount,
        result.maxHomePrice,
      ],
    );

    response.status(201).json({
      id: insertResult.insertId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error("Request failed:", error);
  response.status(500).json({ error: "The request could not be completed." });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Mortgage calculator API listening on port ${port}`);
});

function shutDown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
