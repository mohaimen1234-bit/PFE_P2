package com.cmms.identity.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtTokenProviderTest {

    @Test
    void generateAndValidateToken() {
        String base64Secret = "ZmFsbGJhY2stc2VjcmV0LWtleS1mb3ItY21tcy1pZGVudGl0eS1zZXJ2aWNlLTI1Ng==";
        JwtTokenProvider provider = new JwtTokenProvider(base64Secret, 3600000L, "cmms-test");

        String token = provider.generateToken(42, "user@example.com", java.util.List.of("ADMIN"));

        assertTrue(provider.validateToken(token));
        assertEquals("user@example.com", provider.getEmailFromToken(token));

        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertEquals(42, claims.get("userId", Integer.class));
        assertTrue(((java.util.List<?>) claims.get("roles")).contains("ADMIN"));
        assertEquals("cmms-test", claims.getIssuer());
    }
}
