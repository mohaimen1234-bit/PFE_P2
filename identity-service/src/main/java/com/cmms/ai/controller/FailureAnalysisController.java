package com.cmms.ai.controller;

import com.cmms.ai.dto.FailureAnalysisReportDetailDto;
import com.cmms.ai.dto.FailureAnalysisReportSummaryDto;
import com.cmms.ai.service.FailureAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/ai/failure-analysis")
@RequiredArgsConstructor
public class FailureAnalysisController {

    private final FailureAnalysisService failureAnalysisService;

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','FINANCE_MANAGER')")
    public ResponseEntity<List<FailureAnalysisReportSummaryDto>> getReports(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "90") Integer analysisPeriodDays,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "3") Integer minClaims,
            @RequestParam(defaultValue = "2") Integer minAffectedEquipment) {

        List<FailureAnalysisReportSummaryDto> reports = failureAnalysisService.generateReports(
                fromDate, toDate, analysisPeriodDays, departmentId, severity, minClaims, minAffectedEquipment
        );
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/reports/{reportId}")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','FINANCE_MANAGER')")
    public ResponseEntity<FailureAnalysisReportDetailDto> getReportDetail(
            @PathVariable String reportId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "90") Integer analysisPeriodDays,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "3") Integer minClaims,
            @RequestParam(defaultValue = "2") Integer minAffectedEquipment) {

        FailureAnalysisReportDetailDto detail = failureAnalysisService.getReportDetail(
                reportId, fromDate, toDate, analysisPeriodDays, departmentId, severity, minClaims, minAffectedEquipment
        );
        
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(detail);
    }
}
