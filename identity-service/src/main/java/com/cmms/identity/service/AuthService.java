package com.cmms.identity.service;

import com.cmms.identity.dto.LoginRequest;
import com.cmms.identity.dto.LoginResponse;
import com.cmms.identity.dto.UserResponse;
import com.cmms.identity.exception.AuthenticationFailedException;
import com.cmms.identity.mapper.UserMapper;
import com.cmms.identity.security.JwtTokenProvider;
import com.cmms.identity.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final AuditLogService auditLogService;
    private final com.cmms.identity.repository.UserRepository userRepository;

    @org.springframework.transaction.annotation.Transactional
    public LoginResponse login(LoginRequest request) {
        log.info("Attempting to authenticate user: {}", request.getEmail());

        // Track last login attempt
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            user.setLastLogin(java.time.LocalDateTime.now());
            userRepository.save(user);
        });

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            java.util.List<String> roleNames = userPrincipal.getUser().getRoles().stream()
                    .map(com.cmms.identity.entity.Role::getRoleName)
                    .collect(java.util.stream.Collectors.toList());

            String token = jwtTokenProvider.generateToken(
                    userPrincipal.getUser().getUserId(),
                    userPrincipal.getUser().getEmail(),
                    roleNames
            );

            UserResponse userResponse = userMapper.toResponse(userPrincipal.getUser());

            log.info("Successfully authenticated user: {}", request.getEmail());

            // Log successful login
            auditLogService.log(
                    userPrincipal.getUser().getUserId(),
                    userPrincipal.getUser().getFullName(),
                    "LOGIN",
                    "auth",
                    userPrincipal.getUser().getUserId(),
                    "User logged in"
            );

            return LoginResponse.builder()
                    .accessToken(token)
                    .tokenType("Bearer")
                    .expiresIn(jwtTokenProvider.getExpirationMs())
                    .user(userResponse)
                    .build();

        } catch (BadCredentialsException ex) {
            log.error("Authentication failed for {}: Bad credentials", request.getEmail());
            // Log failed login
            auditLogService.log(
                    null,
                    request.getEmail(),
                    "LOGIN_FAILED",
                    "auth",
                    null,
                    "Login failed: Bad credentials"
            );
            throw ex;
        } catch (DisabledException ex) {
            log.error("Authentication failed for {}: Account is disabled", request.getEmail());
            // Log disabled account login attempt
            auditLogService.log(
                    null,
                    request.getEmail(),
                    "LOGIN_FAILED",
                    "auth",
                    null,
                    "Login failed: Account is disabled"
            );
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected authentication error for {}", request.getEmail(), ex);
            throw new AuthenticationFailedException("An unexpected error occurred during authentication.");
        }
    }
}
