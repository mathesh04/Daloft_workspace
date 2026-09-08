INSERT INTO system_settings(setting_key, setting_value, description) VALUES
('WORK_START_TIME','09:00','Organization office opening time used for attendance late calculations'),
('WORK_END_TIME','18:00','Organization office closing time for display and policy reference')
ON CONFLICT (setting_key) DO NOTHING;
