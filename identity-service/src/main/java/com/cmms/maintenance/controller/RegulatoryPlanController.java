package com.cmms.maintenance.controller;

import com.cmms.maintenance.dto.CreateRegulatoryPlanRequest;
import com.cmms.maintenance.dto.RegulatoryPlanResponse;
import com.cmms.maintenance.dto.UpdateRegulatoryPlanRequest;
import com.cmms.maintenance.service.RegulatoryPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/regulatory-plans")
@RequiredArgsConstructor
public class RegulatoryPlanController {

    private final RegulatoryPlanService planService;
    private final com.cmms.maintenance.service.RegulatoryWorkOrderGenerator workOrderGenerator;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public ResponseEntity<List<RegulatoryPlanResponse>> list() {
        return ResponseEntity.ok(planService.list());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public ResponseEntity<RegulatoryPlanResponse> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(planService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public ResponseEntity<RegulatoryPlanResponse> create(@RequestBody CreateRegulatoryPlanRequest request) {
        return ResponseEntity.ok(planService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public ResponseEntity<RegulatoryPlanResponse> update(@PathVariable Integer id, @RequestBody UpdateRegulatoryPlanRequest request) {
        return ResponseEntity.ok(planService.update(id, request));
    }

    @PostMapping("/{id}/generate-wo")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public ResponseEntity<Void> generateWorkOrder(@PathVariable Integer id) {
        workOrderGenerator.manualGenerate(id);
        return ResponseEntity.ok().build();
    }
}
