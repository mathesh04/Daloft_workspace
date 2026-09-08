ALTER TABLE employees ADD COLUMN IF NOT EXISTS login_failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS working_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS organization_holidays (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  holiday_date DATE NOT NULL UNIQUE,
  description VARCHAR(1000),
  type VARCHAR(50) NOT NULL DEFAULT 'PUBLIC',
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_org_holiday_date ON organization_holidays(holiday_date);

INSERT INTO system_settings(setting_key, setting_value, description)
VALUES
('ATTENDANCE_ENABLED','true','Organization attendance availability'),
('CHECK_IN_ENABLED','true','Employee check-in availability'),
('CHECK_OUT_ENABLED','true','Employee check-out availability'),
('GEOFENCE_ENABLED','false','Whether attendance location verification is enabled'),
('GEOFENCE_RADIUS','100','Default geofence radius in meters'),
('LATE_GRACE_MINUTES','10','Late grace period in minutes'),
('MIN_WORK_MINUTES','480','Minimum work duration in minutes'),
('MAX_GPS_ACCURACY','100','Maximum accepted GPS accuracy in meters'),
('MAX_LOGIN_ATTEMPTS','5','Failed attempts before temporary lock'),
('ACCOUNT_LOCK_MINUTES','15','Temporary account lock duration in minutes'),
('SESSION_TIMEOUT_MINUTES','30','JWT session timeout in minutes'),
('MAINTENANCE_MODE','false','Restrict normal application access while allowing Organization Admins'),
('EMPLOYEE_LOGIN_ENABLED','true','Employee login access'),
('MANAGER_LOGIN_ENABLED','true','Manager login access'),
('HR_ADMIN_LOGIN_ENABLED','true','HR Admin login access'),
('TIMEZONE','Asia/Kolkata','Organization timezone'),
('WORKING_DAYS','MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY','Comma separated working days')
ON CONFLICT (setting_key) DO NOTHING;
