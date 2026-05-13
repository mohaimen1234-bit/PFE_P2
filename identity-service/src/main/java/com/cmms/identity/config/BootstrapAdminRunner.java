package com.cmms.identity.config;

import com.cmms.identity.entity.Role;
import com.cmms.identity.entity.User;
import com.cmms.identity.repository.RoleRepository;
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
    private final RoleRepository roleRepository;
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
            log.info("Bootstrap admin: User {} not found. Creating new admin user.", email);
            user = new User();
            user.setEmail(email);
        }

        // Always ensure these fields are correct for the bootstrap user
        user.setFullName("System Admin");
        user.setIsActive(true);

        // Ensure the ADMIN role is assigned
        Role adminRole = roleRepository.findByRoleNameIgnoreCase("ADMIN")
                .orElseGet(() -> {
                    log.info("Bootstrap admin: ADMIN role not found. Creating it.");
                    Role newRole = new Role();
                    newRole.setRoleName("ADMIN");
                    return roleRepository.save(newRole);
                });

        if (user.getRoles() == null) {
            user.setRoles(new java.util.HashSet<>());
        }
        if (user.getRoles().stream().noneMatch(r -> r.getRoleName().equalsIgnoreCase("ADMIN"))) {
            user.getRoles().add(adminRole);
        }

        if (!properties.isForce() && user.getPasswordHash() != null && passwordEncoder.matches(password, user.getPasswordHash())) {
            log.info("Bootstrap admin: Password already matches for {}; saving state (active/roles) if changed.", email);
            userRepository.save(user);
            return;
        }

        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(user);

        log.info("Bootstrap admin: Successfully updated/created {} (active=true, roles=[ADMIN]).", email);
    }
}
