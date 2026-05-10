package com.cmms.bi.controller;

import com.cmms.bi.dto.KpiResponse;
import com.cmms.bi.service.KpiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/kpi")
@PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'FINANCE_MANAGER')")
@RequiredArgsConstructor
@Tag(name = "KPI", description = "Key Performance Indicators and BI metrics")
@SecurityRequirement(name = "bearerAuth")
public class KpiController {

    private final KpiService kpiService;

    @GetMapping
    @Operation(summary = "Get global KPIs")
    public KpiResponse getKpis() {
        return kpiService.getKpis();
    }
}
