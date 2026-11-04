# Homewise mortgage affordability calculator

A three-tier application with a React frontend, Express API, and MySQL database. The API calculates an estimated maximum home price from gross annual income, monthly debt payments, down payment, maximum debt-to-income ratio, interest rate, and mortgage term. The database stores each submitted estimate and the UI displays the ten most recent.

## Run locally with Docker Compose

From this directory, run:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Stop the app with `Ctrl+C`; run `docker compose down` to stop and remove its containers. The named database volume is retained. To also erase local calculation history, remove that volume with `docker compose down -v`.

The Compose database password is for local development only. Do not expose this setup to the public internet.

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

The API creates its `calculations` table on startup. It listens on port `3001` by default.

Run the calculator unit tests from the backend directory:

```sh
npm test
```

## Calculation and API

- `POST /api/calculations` accepts numeric `annualSalary`, `monthlyDebts`, `downPayment`, `maxDtiPercent`, `interestRatePercent`, and whole-number `termYears` fields.
- `GET /api/calculations` returns the ten most recent saved estimates.
- `GET /api/health` checks API and database connectivity.

The calculator treats the DTI limit as the combined monthly debt and principal-and-interest payment divided by gross monthly income. It estimates the maximum principal with the standard fixed-rate amortization formula; a zero interest rate is supported. The down payment is added to that loan amount to estimate a home price. Taxes, homeowners insurance, HOA dues, PMI, closing costs, and lender-specific qualification rules are not included.

## Kubernetes / EKS

Build and push the `backend` and `frontend` images to a container registry, then replace the image names in `k8s/app.yaml`. Create a Kubernetes Secret named `mortgage-db` in the deployment namespace with keys `host`, `port`, `database`, `username`, and `password`, pointed at a MySQL database. The database user must be allowed to create the `calculations` table. Apply `k8s/app.yaml`; the frontend service is internal, so expose it through your existing ingress or a port-forward:

```sh
kubectl port-forward service/mortgage-frontend 8080:8080
```

The app has no user accounts or per-user separation: saved estimates are shared with anyone who can access that deployment. Add authentication, appropriate network restrictions, TLS, and managed secret handling before making it publicly accessible. Avoid entering sensitive personal information.
