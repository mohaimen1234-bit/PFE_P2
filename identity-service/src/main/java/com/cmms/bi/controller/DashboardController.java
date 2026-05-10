package com.cmms.bi.controller;

import com.cmms.bi.dto.DashboardActivityItem;
import com.cmms.bi.dto.DashboardStatsResponse;
import com.cmms.bi.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Consolidated operational hub")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Get high-level dashboard metrics")
    public DashboardStatsResponse getStats() {
        return dashboardService.getStats();
    }

    @GetMapping("/activity")
    @Operation(summary = "Get unified recent activity feed")
    public List<DashboardActivityItem> getActivity() {
        return dashboardService.getRecentActivity();
    }
}
