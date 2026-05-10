package com.cmms.identity.controller;

import com.cmms.identity.dto.RoleResponse;
import com.cmms.identity.exception.ConflictException;
import com.cmms.identity.exception.GlobalExceptionHandler;
import com.cmms.identity.service.RoleService;
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

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoleController.class)
@AutoConfigureMockMvc(addFilters = false)
@ContextConfiguration(classes = {RoleControllerTest.TestApplication.class, RoleController.class})
@Import(GlobalExceptionHandler.class)
class RoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RoleService roleService;

    @Test
    void getAllRolesReturnsList() throws Exception {
        RoleResponse role = RoleResponse.builder()
                .roleId(1)
                .roleName("ADMIN")
                .build();

        when(roleService.getAllRoles()).thenReturn(List.of(role));

        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].roleName").value("ADMIN"));
    }

    @Test
    void deleteRoleReturnsConflictWhenInUse() throws Exception {
        int roleId = 7;

        doThrow(new ConflictException("Role is assigned to users"))
                .when(roleService).deleteRole(roleId);

        mockMvc.perform(delete("/api/roles/{id}", roleId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Role is assigned to users"));
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