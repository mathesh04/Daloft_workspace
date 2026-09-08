-- Leave-management integrity and predictable organization calendar defaults.
-- The application supports custom working days, but the production baseline is Monday-Friday.
INSERT INTO system_settings(setting_key, setting_value, description)
VALUES ('WORKING_DAYS','MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY','Comma separated working days')
ON CONFLICT (setting_key) DO NOTHING;

-- Repair legacy/test deployments where the setting was accidentally reduced to a single day.
UPDATE system_settings
SET setting_value='MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY'
WHERE setting_key='WORKING_DAYS'
  AND (setting_value IS NULL OR trim(setting_value)='' OR upper(trim(setting_value)) IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'));

ALTER TABLE leave_balances
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
