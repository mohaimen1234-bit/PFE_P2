package com.cmms.equipment.controller;

import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.entity.EquipmentStatus;
import com.cmms.equipment.service.EquipmentService;
import com.cmms.identity.security.JwtTokenProvider;
import com.cmms.identity.security.UserDetailsServiceImpl;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EquipmentController.class)
@AutoConfigureMockMvc(addFilters = false)
@ContextConfiguration(classes = {EquipmentControllerTest.TestApplication.class, EquipmentController.class})
class EquipmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EquipmentService equipmentService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void getAllReturnsEquipmentList() throws Exception {
        Equipment equipment = Equipment.builder()
                .equipmentId(10)
                .name("Pump A")
                .serialNumber("SN-001")
                .status(EquipmentStatus.OPERATIONAL)
                .location("Basement")
                .departmentId(3)
                .createdAt(LocalDateTime.parse("2024-01-01T10:00:00"))
                .build();

        when(equipmentService.getAllEquipment()).thenReturn(List.of(equipment));

        mockMvc.perform(get("/api/equipment")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].equipmentId").value(10))
                .andExpect(jsonPath("$[0].name").value("Pump A"))
                .andExpect(jsonPath("$[0].serialNumber").value("SN-001"))
                .andExpect(jsonPath("$[0].status").value("OPERATIONAL"));
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
