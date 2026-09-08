package com.ems.config;

import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.Statement;

@Component
public class NotificationSchemaInitializer {
    private final DataSource dataSource;

    public NotificationSchemaInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void initialize() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {

            statement.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_status boolean");

            statement.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'notifications'
                          AND column_name = 'read'
                    ) THEN
                        UPDATE notifications
                        SET read_status = COALESCE(read_status, "read", false)
                        WHERE read_status IS NULL;
                    ELSE
                        UPDATE notifications
                        SET read_status = false
                        WHERE read_status IS NULL;
                    END IF;
                END $$;
                """);

            statement.execute("ALTER TABLE notifications ALTER COLUMN read_status SET DEFAULT false");
            statement.execute("ALTER TABLE notifications ALTER COLUMN read_status SET NOT NULL");

            // Remove the legacy column. Keeping it NOT NULL without a default makes
            // Hibernate inserts fail because Notification maps only read_status.
            statement.execute("ALTER TABLE notifications DROP COLUMN IF EXISTS \"read\"");

        } catch (Exception ex) {
            throw new IllegalStateException("Notification schema migration failed", ex);
        }
    }
}
