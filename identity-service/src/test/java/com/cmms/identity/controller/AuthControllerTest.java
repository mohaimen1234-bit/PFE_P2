package com.cmms.identity.controller;

import com.cmms.identity.dto.LoginResponse;
import com.cmms.identity.dto.UserResponse;
import com.cmms.identity.security.JwtTokenProvider;
import com.cmms.identity.security.UserDetailsServiceImpl;
import com.cmms.identity.service.AuthService;
import com.cmms.identity.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ContextConfiguration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@ContextConfiguration(classes = {AuthControllerTest.TestApplication.class, AuthController.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

        @MockBean
        private JwtTokenProvider jwtTokenProvider;

        @MockBean
        private UserDetailsServiceImpl userDetailsService;

    @Test
    void loginReturnsTokenPayload() throws Exception {
        UserResponse user = UserResponse.builder()
                .userId(1)
                .fullName("Test User")
                .email("user@example.com")
                .roles(java.util.List.of(com.cmms.identity.dto.RoleResponse.builder().roleId(1).roleName("ADMIN").build()))
                .departmentId(2)
                .departmentName("Engineering")
                .isActive(true)
                .build();

        LoginResponse response = LoginResponse.builder()
                .accessToken("jwt-token")
                .tokenType("Bearer")
                .expiresIn(3600000L)
                .user(user)
                .build();

        when(authService.login(any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600000))
                .andExpect(jsonPath("$.user.email").value("user@example.com"))
                .andExpect(jsonPath("$.user.roles[0].roleName").value("ADMIN"));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = {
            DataSourceAutoConfiguration.class,
            HibernateJpaAutoConfiguration.class,
            JpaRepositoriesAutoConfiguration.class
    })
    static class TestApplication {
    }
}
