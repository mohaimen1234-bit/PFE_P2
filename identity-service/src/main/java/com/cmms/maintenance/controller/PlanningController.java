package com.cmms.maintenance.controller;

import com.cmms.maintenance.dto.CreateMaintenancePlanRequest;
import com.cmms.maintenance.entity.MaintenancePlan;
import com.cmms.maintenance.service.MaintenancePlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/planning")
@RequiredArgsConstructor
@Tag(name = "Planning", description = "Maintenance plans and scheduling")
@SecurityRequirement(name = "bearerAuth")
public class PlanningController {

    private final MaintenancePlanService planningService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "List all maintenance plans")
    public List<MaintenancePlan> list() {
        return planningService.getAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Create a new maintenance plan")
    public MaintenancePlan create(@RequestBody CreateMaintenancePlanRequest request) {
        return planningService.create(request);
    }

    @PostMapping("/generate-now")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Manually trigger work order generation for due plans")
    public void triggerGeneration() {
        planningService.generateScheduledWorkOrders();
    }
}
