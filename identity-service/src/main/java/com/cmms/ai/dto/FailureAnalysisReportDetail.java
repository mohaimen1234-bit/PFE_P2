package com.cmms.ai.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisReportDetail {

    private String id;
    private String type;
    private String title;
    private String severity;

    // Period
    private String periodFrom;
    private String periodTo;
    private int periodDays;

    // Scope
    private Integer scopeDepartmentId;
    private String scopeDepartmentName;
    private String scopeManufacturer;
    private String scopeModel;
    private String scopeCategory;
    private String scopeSupplier;
    private String scopeLabel;

    // Summary
    private String mainFinding;
    private String businessSignal;
    private LocalDateTime generatedAt;

    // Metrics
    private FailureAnalysisMetricsDto metrics;

    // Evidence
    private List<String> detectionExplanation;
    private List<FailureAnalysisAffectedEquipmentDto> affectedEquipment;
    private List<FailureAnalysisClaimDto> claims;
    private List<FailureAnalysisWorkOrderDto> workOrders;
    private List<FailureAnalysisTimelineEventDto> timeline;
}
