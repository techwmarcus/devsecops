CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(36) NOT NULL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calculations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  annual_salary DECIMAL(12, 2) NOT NULL,
  monthly_debts DECIMAL(12, 2) NOT NULL DEFAULT 0,
  down_payment DECIMAL(12, 2) NOT NULL,
  max_dti_percent DECIMAL(5, 2) NOT NULL DEFAULT 28,
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
);
