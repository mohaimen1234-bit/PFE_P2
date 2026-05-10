package com.cmms.identity.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

/**
 * JWT utility that handles token generation and validation.
 * Tokens carry: user_id, email, and role as claims.
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final long expirationMs;
    private final String issuer;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String base64Secret,
            @Value("${jwt.expiration-ms}") long expirationMs,
            @Value("${jwt.issuer}") String issuer) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        this.expirationMs = expirationMs;
        this.issuer = issuer;
    }

    /**
     * Generates a signed JWT token for the authenticated user.
     *
     * @param userId  the user's primary key
     * @param email   used as the JWT subject (username)
     * @param role    the user's role name (e.g. "ADMIN")
     */
    public String generateToken(Integer userId, String email, java.util.Collection<String> roles) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(email)
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiryDate)
                .claims(Map.of(
                        "userId", userId,
                        "roles", roles
                ))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Extracts the email (subject) from a valid JWT token.
     */
    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Validates the JWT token — checks signature, expiry, and structure.
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("JWT token is unsupported: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("JWT token is malformed: {}", e.getMessage());
        } catch (JwtException e) {
            log.warn("JWT validation error: {}", e.getMessage());
        }
        return false;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
