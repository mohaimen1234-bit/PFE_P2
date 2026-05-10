package com.cmms.security;

import com.cmms.bi.controller.KpiController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.cmms.CmmsApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SystemHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "TECHNICIAN")
    void technicianCannotAccessKpiEndpoints() throws Exception {
        mockMvc.perform(get("/api/kpi")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MAINTENANCE_MANAGER")
    void managerCanAccessKpiEndpoints() throws Exception {
        mockMvc.perform(get("/api/kpi")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "TECHNICIAN")
    void technicianCannotAccessInventoryRestockApproval() throws Exception {
        mockMvc.perform(post("/api/inventory/restock/1/approve")
                .param("reviewerId", "1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MAINTENANCE_MANAGER")
    void managerCanAccessDashboardStats() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
