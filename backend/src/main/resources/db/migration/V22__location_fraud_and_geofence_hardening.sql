
CREATE TABLE IF NOT EXISTS location_fraud_logs (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    event_type          VARCHAR(20) NOT NULL,
    fraud_type          VARCHAR(40) NOT NULL,
    severity            VARCHAR(10) NOT NULL,
    gps_latitude        DOUBLE PRECISION,
    gps_longitude       DOUBLE PRECISION,
    gps_accuracy        DOUBLE PRECISION,
    client_ip           VARCHAR(45),
    ip_latitude         DOUBLE PRECISION,
    ip_longitude        DOUBLE PRECISION,
    ip_city             VARCHAR(100),
    ip_country          VARCHAR(100),
    ip_gps_distance_km  DOUBLE PRECISION,
    user_agent          VARCHAR(512),
    details             VARCHAR(1024),
    reviewed            BOOLEAN NOT NULL DEFAULT FALSE,
    admin_notes         VARCHAR(1024),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_log_employee ON location_fraud_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_fraud_log_reviewed ON location_fraud_logs(reviewed);
CREATE INDEX IF NOT EXISTS idx_fraud_log_created  ON location_fraud_logs(created_at DESC);


INSERT INTO system_settings (key, value) VALUES ('GEOFENCE_IP_CHECK_ENABLED', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('MAX_IP_GPS_MISMATCH_KM', '100') ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('GEOFENCE_BLOCK_IP_MISMATCH', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('GEOFENCE_BLOCK_MOCK', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('GEOFENCE_TELEPORTATION_CHECK', 'true') ON CONFLICT (key) DO NOTHING;
