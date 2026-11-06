# Homewise mortgage affordability calculator

A three-tier application with a React frontend, Express API, and MySQL database. AWS Cognito provides sign-up, email verification, sign-in, and session management through AWS Amplify. Each Cognito user has a MySQL `users` row keyed by the verified Cognito `sub`; saved estimates reference that user and are only visible to their owner. Choose between estimating a maximum home price from annual gross salary or estimating the annual gross salary needed for a home price. Both calculations use a down-payment percentage slider, a 6.5% default interest rate, and a 30-year default mortgage term.

## Configure Cognito

The Terraform in `../modules/auth.tf` creates a Cognito user pool and public app client. The `modules` Terraform root also manages existing AWS resources; review its full plan and apply only when you intend to change that stack. From the repository root, initialize and review the plan:

```sh
terraform -chdir=modules init
terraform -chdir=modules plan
```

After applying an approved plan, get the Cognito settings:

```sh
terraform -chdir=modules output mortgage_cognito_region
terraform -chdir=modules output mortgage_cognito_user_pool_id
terraform -chdir=modules output mortgage_cognito_user_pool_client_id
```

In the `mortgage-app` directory, copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`) and set those three output values. `.env` is ignored by Git. The Amplify browser client ID and pool ID are public identifiers, not credentials.

## Run locally with Docker Compose

After configuring `.env`, run from this directory:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080), create an account using an email address, and complete email verification. Stop the app with `Ctrl+C`; run `docker compose down` to stop and remove its containers. The named database volume is retained. To also erase local users and calculation history, remove that volume with `docker compose down -v`.

The Compose database password and database service are for local development only. Do not expose this setup to the public internet.

## Run and test the API without Docker

The backend requires a reachable MySQL 8 database. From this directory:

```sh
cd backend
npm ci
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_DATABASE = "mortgage"
$env:MYSQL_USER = "mortgage"
$env:MYSQL_PASSWORD = "<your-local-database-password>"
npm start
```

Set `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID`, and `MYSQL_PASSWORD` for the API before starting it. The API creates the `users` and `calculations` tables and migrates existing tables on startup. See `backend/schema.sql` for the fresh database schema. Legacy calculation rows without an owner stay unassigned and are not shown to signed-in users. The API listens on port `3001` by default.

Run the calculator unit tests from the backend directory:

```sh
npm test
```

## Calculation and API

- `POST /api/calculations` accepts `calculationType` (`salary-to-price` or `price-to-salary`), the relevant `annualSalary` or `homePrice`, `downPaymentPercent`, `interestRatePercent`, and whole-number `termYears`.
- `GET /api/calculations` returns the ten most recent saved estimates.
- `GET /api/health` checks API and database connectivity.

All `/api/calculations` requests require a valid Cognito access token in the `Authorization: Bearer ...` header. The API verifies token signature, user pool, client, and token use; it takes the owner ID from the verified token rather than trusting a user ID supplied by the browser.

Both calculations use 28% of gross monthly income as a fixed budgeting guideline for principal and interest; there is no debt-to-income calculator or user-entered debt ratio. The salary-to-price calculation estimates the mortgage affordable at that monthly payment and adds the selected percentage down payment to estimate a home price. The price-to-salary calculation applies the down-payment percentage to the entered home price, calculates the mortgage payment, and estimates the gross salary needed under the same guideline. The standard fixed-rate amortization formula supports zero interest. Property taxes, homeowners insurance, HOA dues, PMI, closing costs, other debts, and lender-specific qualification rules are not included.

## Kubernetes / EKS

Build and push the `backend` and `frontend` images to a container registry, then replace the image names in `k8s/app.yaml`. Pass the three `.env` settings as `VITE_AWS_REGION`, `VITE_COGNITO_USER_POOL_ID`, and `VITE_COGNITO_USER_POOL_CLIENT_ID` build arguments when building the frontend image. Set the matching values in the `mortgage-auth` ConfigMap in `k8s/app.yaml`. Create a Kubernetes Secret named `mortgage-db` in the deployment namespace with keys `db_host`, `db_port`, `db_name`, `db_user`, and `db_password`, pointed at a MySQL database. The database user must be allowed to create and alter the `users` and `calculations` tables. Apply `k8s/app.yaml`; the frontend service is internal, so expose it through your existing ingress or a port-forward:

```sh
kubectl port-forward service/mortgage-frontend 8080:8080
```

Use HTTPS in production and protect database credentials using managed secret handling. Each signed-in user can see only their own saved estimates; salary and home-price data should still be treated as sensitive personal information.
