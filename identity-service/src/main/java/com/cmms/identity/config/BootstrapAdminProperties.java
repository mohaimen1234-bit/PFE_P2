package com.cmms.identity.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Optional, opt-in bootstrap for resetting the admin password.
 *
 * Disabled by default. Enable only for local/dev recovery.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.bootstrap-admin")
public class BootstrapAdminProperties {

    /**
     * When true, the application will attempt to reset the password of the configured email on startup.
     */
    private boolean enabled = false;

    /**
     * Email of the user to reset.
     */
    private String email = "admin@hospital.com";

    /**
     * Plaintext password to set (read from env var / config). Leave blank to no-op.
     */
    private String password;

    /**
     * When true, resets even if the password already matches.
     */
    private boolean force = false;
}
