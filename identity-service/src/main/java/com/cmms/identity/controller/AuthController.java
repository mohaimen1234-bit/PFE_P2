package com.cmms.identity.controller;

import com.cmms.identity.dto.LoginRequest;
import com.cmms.identity.dto.LoginResponse;
import com.cmms.identity.dto.UserResponse;
import com.cmms.identity.service.AuthService;
import com.cmms.identity.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for login and obtaining JWTs")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate a user and return a JWT")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/hash")
    @Operation(summary = "Temporary endpoint to generate BCrypt hash")
    public ResponseEntity<String> hashPassword(@RequestParam String password) {
        return ResponseEntity.ok(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password));
    }

    @GetMapping("/me")
    @Operation(summary = "Get the current authenticated user's profile", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        // Here we could add a method to find by email if needed, 
        // but for now, let's reuse the authentication principal's details or fetch by ID if attached
        com.cmms.identity.security.UserPrincipal principal = (com.cmms.identity.security.UserPrincipal) authentication.getPrincipal();
        UserResponse user = userService.getUserById(principal.getUser().getUserId());
        return ResponseEntity.ok(user);
    }
}
