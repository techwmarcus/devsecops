import express from "express";
import helmet from "helmet";
import mysql from "mysql2/promise";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import {
  affordabilityIncomePercent,
  calculateAffordability,
} from "./calculator.js";

const port = Number(process.env.PORT ?? 3001);
const cognitoRegion = process.env.COGNITO_REGION ?? process.env.AWS_REGION;
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID;
const cognitoClientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
const mysqlPassword = process.env.MYSQL_PASSWORD;

if (!cognitoRegion || !cognitoUserPoolId || !cognitoClientId) {
  throw new Error(
    "Set COGNITO_REGION, COGNITO_USER_POOL_ID, and COGNITO_USER_POOL_CLIENT_ID.",
  );
}
if (!cognitoUserPoolId.startsWith(`${cognitoRegion}_`)) {
  throw new Error("COGNITO_REGION does not match COGNITO_USER_POOL_ID.");
}
if (!mysqlPassword) {
  throw new Error("Set MYSQL_PASSWORD before starting the API.");
}

const accessTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: cognitoUserPoolId,
  tokenUse: "access",
  clientId: cognitoClientId,
});
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE ?? "mortgage",
  user: process.env.MYSQL_USER ?? "mortgage",
  password: mysqlPassword,
  waitForConnections: true,
  connectionLimit: 10,
});

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

await pool.execute(`
  CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS calculations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    annual_salary DECIMAL(12, 2) NOT NULL,
    monthly_debts DECIMAL(12, 2) NOT NULL,
    down_payment DECIMAL(12, 2) NOT NULL,
    max_dti_percent DECIMAL(5, 2) NOT NULL,
    interest_rate_percent DECIMAL(5, 3) NOT NULL,
    term_years SMALLINT UNSIGNED NOT NULL,
    monthly_payment_budget DECIMAL(14, 2) NOT NULL,
    max_loan_amount DECIMAL(14, 2) NOT NULL,
    max_home_price DECIMAL(14, 2) NOT NULL,
    calculation_type VARCHAR(32) NOT NULL DEFAULT 'salary-to-price',
    down_payment_percent DECIMAL(5, 2) NOT NULL DEFAULT 20,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_calculations_created_at (created_at),
    INDEX idx_calculations_user_created (user_id, created_at),
    CONSTRAINT fk_calculations_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
  )
`);

const [calculationColumns] = await pool.execute(
  `SELECT COLUMN_NAME
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'calculations'
     AND COLUMN_NAME IN ('calculation_type', 'down_payment_percent', 'user_id')`,
);
const existingColumns = new Set(calculationColumns.map(({ COLUMN_NAME }) => COLUMN_NAME));

async function addColumnIfMissing(columnName, definition) {
  if (existingColumns.has(columnName)) {
    return;
  }

  try {
    await pool.query(`ALTER TABLE calculations ADD COLUMN ${definition}`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

await addColumnIfMissing("user_id", "user_id VARCHAR(36) NULL");
await addColumnIfMissing(
  "calculation_type",
  "calculation_type VARCHAR(32) NOT NULL DEFAULT 'salary-to-price'",
);
await addColumnIfMissing(
  "down_payment_percent",
  "down_payment_percent DECIMAL(5, 2) NOT NULL DEFAULT 20",
);
if (!existingColumns.has("down_payment_percent")) {
  await pool.execute(`
    UPDATE calculations
    SET down_payment_percent = CASE
      WHEN max_home_price > 0 THEN ROUND(down_payment / max_home_price * 100, 2)
      ELSE 20
    END
  `);
}

const [calculationIndexes] = await pool.execute(
  `SELECT INDEX_NAME FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calculations'
     AND INDEX_NAME = 'idx_calculations_user_created'`,
);
if (calculationIndexes.length === 0) {
  try {
    await pool.query(
      "ALTER TABLE calculations ADD INDEX idx_calculations_user_created (user_id, created_at)",
    );
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      throw error;
    }
  }
}

const [calculationConstraints] = await pool.execute(
  `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calculations'
     AND CONSTRAINT_NAME = 'fk_calculations_user'`,
);
if (calculationConstraints.length === 0) {
  try {
    await pool.query(`
      ALTER TABLE calculations
      ADD CONSTRAINT fk_calculations_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    `);
  } catch (error) {
    if (error.code !== "ER_FK_DUP_NAME") {
      throw error;
    }
  }
}

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});

async function requireAuthentication(request, response, next) {
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ error: "Sign in to access your calculations." });
    return;
  }

  try {
    const claims = await accessTokenVerifier.verify(authorization.slice(7));
    if (typeof claims.sub !== "string" || claims.sub.length > 36) {
      response.status(401).json({ error: "The sign-in token is invalid." });
      return;
    }
    request.authenticatedUserId = claims.sub;
    await pool.execute(
      "INSERT IGNORE INTO users (user_id) VALUES (?)",
      [claims.sub],
    );
    next();
  } catch (error) {
    if (error.name?.includes("Jwt") || error.name?.includes("Cognito")) {
      response.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
      return;
    }
    next(error);
  }
}

app.use("/api/calculations", requireAuthentication);

app.get("/api/calculations", async (request, response, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, annual_salary, down_payment, interest_rate_percent, term_years,
             monthly_payment_budget, max_loan_amount, max_home_price,
             calculation_type, down_payment_percent, created_at
      FROM calculations
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 10
    `, [request.authenticatedUserId]);
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
        (user_id, annual_salary, monthly_debts, down_payment, max_dti_percent,
         interest_rate_percent, term_years, monthly_payment_budget,
         max_loan_amount, max_home_price, calculation_type, down_payment_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.authenticatedUserId,
        result.annualSalary,
        0,
        result.downPaymentAmount,
        affordabilityIncomePercent,
        input.interestRatePercent,
        input.termYears,
        result.monthlyPayment,
        result.maxLoanAmount,
        result.maxHomePrice,
        input.calculationType,
        input.downPaymentPercent,
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
