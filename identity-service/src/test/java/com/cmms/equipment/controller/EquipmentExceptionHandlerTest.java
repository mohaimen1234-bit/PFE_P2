package com.cmms.equipment.controller;

import com.cmms.equipment.exception.EquipmentExceptionHandler;
import com.cmms.equipment.exception.ResourceNotFoundException;
import com.cmms.equipment.service.EquipmentService;
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
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EquipmentController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(EquipmentExceptionHandler.class)
@ContextConfiguration(classes = {EquipmentExceptionHandlerTest.TestApplication.class, EquipmentController.class, EquipmentExceptionHandler.class})
class EquipmentExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EquipmentService equipmentService;

    @Test
    void getByIdNotFoundReturnsErrorShape() throws Exception {
        when(equipmentService.getEquipmentById(99))
                .thenThrow(new ResourceNotFoundException("Equipment not found with ID: 99"));

        mockMvc.perform(get("/api/equipment/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Equipment not found with ID: 99"));
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
