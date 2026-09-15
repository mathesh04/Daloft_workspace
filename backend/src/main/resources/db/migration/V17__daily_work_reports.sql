CREATE TABLE IF NOT EXISTS daily_work_reports (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    tasks_completed TEXT NOT NULL,
    blockers TEXT NOT NULL DEFAULT 'None',
    plan_for_tomorrow TEXT NOT NULL,
    equipments_used TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_employee_report_date UNIQUE (employee_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_dwr_employee_date ON daily_work_reports(employee_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_dwr_report_date ON daily_work_reports(report_date DESC);
