package com.cmms.identity.config;

import com.cmms.identity.entity.User;
import com.cmms.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class BootstrapAdminRunner implements CommandLineRunner {

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (!properties.isEnabled()) {
            return;
        }

        String email = properties.getEmail();
        String password = properties.getPassword();

        if (email == null || email.isBlank()) {
            log.warn("Bootstrap admin password reset enabled, but email is blank; skipping.");
            return;
        }

        if (password == null || password.isBlank()) {
            log.warn("Bootstrap admin password reset enabled for {}, but no password provided; skipping.", email);
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.warn("Bootstrap admin password reset enabled, but no user found with email {}; skipping.", email);
            return;
        }

        if (!properties.isForce() && passwordEncoder.matches(password, user.getPasswordHash())) {
            log.info("Bootstrap admin password reset: password already matches for {}; no changes applied.", email);
            return;
        }

        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(user);

        log.info("Bootstrap admin password reset: updated password hash for {} (userId={}).", email, user.getUserId());
    }
}
