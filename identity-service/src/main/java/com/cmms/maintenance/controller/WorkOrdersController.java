package com.cmms.maintenance.controller;

import com.cmms.maintenance.dto.*;
import com.cmms.maintenance.service.WorkOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
@Tag(name = "Work Orders", description = "Management of maintenance work orders")
@SecurityRequirement(name = "bearerAuth")
public class WorkOrdersController {

    private final WorkOrderService workOrderService;
    private final com.cmms.maintenance.service.TechnicianAvailabilityService technicianAvailabilityService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN', 'FINANCE_MANAGER')")
    @Operation(summary = "List work orders")
    public List<WorkOrderResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer equipmentId,
            @RequestParam(required = false) Integer assignedToUserId
    ) {
        return workOrderService.list(status, type, equipmentId, assignedToUserId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new work order")
    public WorkOrderResponse create(@Valid @RequestBody CreateWorkOrderRequest request) {
        return workOrderService.create(request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN', 'FINANCE_MANAGER')")
    @Operation(summary = "Get work order by ID")
    public WorkOrderResponse get(@PathVariable Integer id) {
        return workOrderService.getById(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Update a work order")
    public WorkOrderResponse update(@PathVariable Integer id, @Valid @RequestBody UpdateWorkOrderRequest request) {
        return workOrderService.update(id, request);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Assign work order")
    public WorkOrderResponse assign(@PathVariable Integer id, @Valid @RequestBody AssignWorkOrderRequest request) {
        return workOrderService.assign(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')")
    @Operation(summary = "Update work order status")
    public WorkOrderResponse updateStatus(@PathVariable Integer id, @Valid @RequestBody WorkOrderStatusUpdateRequest request) {
        return workOrderService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Validate completed work order")
    public WorkOrderResponse validate(@PathVariable Integer id, @Valid @RequestBody ValidateWorkOrderRequest request) {
        return workOrderService.validate(id, request);
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Close validated work order")
    public WorkOrderResponse close(@PathVariable Integer id) {
        return workOrderService.close(id);
    }

    @PatchMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')")
    @Operation(summary = "Reschedule work order")
    public WorkOrderResponse reschedule(@PathVariable Integer id, @Valid @RequestBody ScheduleWorkOrderRequest request) {
        return workOrderService.reschedule(id, request);
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN', 'FINANCE_MANAGER')")
    @Operation(summary = "Get status history of work order")
    public List<WorkOrderStatusHistoryResponse> getHistory(@PathVariable Integer id) {
        return workOrderService.getStatusHistory(id);
    }

    @PatchMapping("/{id}/toggle-follower")
    @Operation(summary = "Toggle being a follower/watcher for this work order")
    public void toggleFollower(@PathVariable Integer id) {
        com.cmms.identity.security.UserPrincipal principal = (com.cmms.identity.security.UserPrincipal) org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        workOrderService.toggleFollower(id, principal.getUserId());
    }

    @GetMapping("/{id}/is-following")
    @Operation(summary = "Check if current user is following this work order")
    public boolean isFollowing(@PathVariable Integer id) {
        com.cmms.identity.security.UserPrincipal principal = (com.cmms.identity.security.UserPrincipal) org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return workOrderService.isFollowing(id, principal.getUserId());
    }

    @GetMapping("/{id}/followers")
    @Operation(summary = "Get all followers for this work order")
    public List<com.cmms.identity.entity.User> getFollowers(@PathVariable Integer id) {
        return workOrderService.getFollowers(id);
    }

    @GetMapping("/delayed")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Get delayed work orders")
    public List<WorkOrderResponse> getDelayed() {
        return workOrderService.getDelayed();
    }

    @GetMapping("/calendar")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN', 'FINANCE_MANAGER')")
    @Operation(summary = "Get work orders for calendar view")
    public List<WorkOrderResponse> getCalendar() {
        return workOrderService.getCalendar();
    }

    @GetMapping("/workload")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Get technician workload")
    public List<WorkloadResponse> getWorkload() {
        return workOrderService.getWorkload();
    }

    @GetMapping("/{id}/recommend-technicians")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Get ranked technician recommendations for assignment")
    public List<TechnicianRecommendationDTO> recommendTechnicians(@PathVariable(required = false) Integer id) {
        return technicianAvailabilityService.getRecommendations(id);
    }
}
