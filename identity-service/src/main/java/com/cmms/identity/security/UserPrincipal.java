package com.cmms.identity.security;

import com.cmms.identity.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adapter that wraps our User entity and implements Spring Security's UserDetails.
 * This allows Spring Security to work with your existing User entity without modifying it.
 */
public class UserPrincipal implements UserDetails {

    @Getter
    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    public Integer getUserId() {
        return user.getUserId();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getRoleName().toUpperCase()))
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public String getPassword() {
        // Maps your password_hash column to Spring Security's password field
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        // Uses email as the unique username identifier
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Checks your is_active column — disabled users cannot authenticate
        return Boolean.TRUE.equals(user.getIsActive());
    }
}
