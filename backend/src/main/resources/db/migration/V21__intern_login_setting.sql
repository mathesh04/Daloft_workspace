INSERT INTO system_settings(setting_key, setting_value, description)
VALUES ('INTERN_LOGIN_ENABLED', 'true', 'Intern login access')
ON CONFLICT (setting_key) DO NOTHING;
