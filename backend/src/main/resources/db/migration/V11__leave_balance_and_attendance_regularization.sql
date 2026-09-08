-- Enterprise leave entitlement and attendance correction workflow.
ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS balance_applied BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS leave_balances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_year INTEGER NOT NULL,
    leave_type VARCHAR(40) NOT NULL,
    allocated_days INTEGER NOT NULL DEFAULT 0 CHECK (allocated_days >= 0),
    used_days INTEGER NOT NULL DEFAULT 0 CHECK (used_days >= 0),
    CONSTRAINT uq_leave_balance_employee_year_type UNIQUE(employee_id, leave_year, leave_type)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, leave_year);

CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_id BIGINT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    requested_check_in TIMESTAMP NULL,
    requested_check_out TIMESTAMP NULL,
    reason VARCHAR(2000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP NULL,
    review_reason VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_attendance_reg_status CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_reg_employee ON attendance_regularization_requests(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_reg_status ON attendance_regularization_requests(status, created_at ASC);

INSERT INTO system_settings(setting_key,setting_value)
VALUES
 ('LEAVE_CASUAL_DAYS','12'),
 ('LEAVE_SICK_DAYS','12'),
 ('LEAVE_EARNED_DAYS','15')
ON CONFLICT (setting_key) DO NOTHING;
