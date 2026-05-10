package com.cmms.claims.controller;

import com.cmms.claims.dto.ClaimListItemResponse;
import com.cmms.claims.exception.ClaimsExceptionHandler;
import com.cmms.claims.service.ClaimPhotoService;
import com.cmms.claims.service.ClaimService;
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
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClaimsController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ClaimsExceptionHandler.class)
@ContextConfiguration(classes = {ClaimsControllerTest.TestApplication.class, ClaimsController.class, ClaimsExceptionHandler.class})
class ClaimsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClaimService claimService;

    @MockBean
    private ClaimPhotoService claimPhotoService;

    @Test
    void listClaimsReturnsList() throws Exception {
        ClaimListItemResponse item = ClaimListItemResponse.builder()
                .claimId(1)
                .claimCode("CLM-001")
                .title("Test")
                .description("Desc")
                .equipmentId(10)
                .equipmentName("Equipment")
                .priority("CRITICAL")
                .priorityLabel("Critical")
                .status("OPEN")
                .statusLabel("Open")
                .requesterId(2)
                .requesterName("Requester")
                .createdAt(LocalDateTime.now())
                .photoCount(0L)
                .build();

        when(claimService.listClaims(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(item));

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].claimCode").value("CLM-001"))
                .andExpect(jsonPath("$[0].status").value("OPEN"));
    }

    @Test
    void createClaimValidationErrorsReturnMap() throws Exception {
        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists())
                .andExpect(jsonPath("$.equipmentId").exists())
                .andExpect(jsonPath("$.priority").exists())
                .andExpect(jsonPath("$.description").exists());
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
