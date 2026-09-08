-- Safe Phase 4 migration for databases already created by Hibernate.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address VARCHAR(1000);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1000);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date DATE;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expiry_time TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);
