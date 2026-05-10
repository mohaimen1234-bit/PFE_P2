package com.cmms.identity.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    private static final String BASE64_SECRET = "ZmFsbGJhY2stc2VjcmV0LWtleS1mb3ItY21tcy1pZGVudGl0eS1zZXJ2aWNlLTI1Ng==";

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    private JwtTokenProvider jwtTokenProvider;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(BASE64_SECRET, 3600000L, "cmms-test");
        jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void setsAuthenticationFromValidToken() throws Exception {
        String token = jwtTokenProvider.generateToken(10, "user@example.com", List.of("ADMIN"));
        UserDetails userDetails = new User(
                "user@example.com",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        when(userDetailsService.loadUserByUsername("user@example.com")).thenReturn(userDetails);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        jwtAuthenticationFilter.doFilter(
                request,
                new MockHttpServletResponse(),
                new MockFilterChain()
        );

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertEquals("user@example.com", authentication.getName());
    }
}
