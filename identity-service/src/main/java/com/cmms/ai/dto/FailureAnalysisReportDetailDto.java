package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisReportDetailDto {
    private String id;
    private String type;
    private String title;
    private String severity;

    private FailureAnalysisPeriodDto period;
    private FailureAnalysisScopeDto scope;
    private FailureAnalysisSummaryDto summary;
    private FailureAnalysisMetricsDto metrics;
    
    private List<String> detectionExplanation;
    private List<FailureAnalysisAffectedEquipmentDto> affectedEquipment;
    private List<FailureAnalysisClaimDto> claims;
    private List<FailureAnalysisWorkOrderDto> workOrders;
    private List<FailureAnalysisTimelineEventDto> timeline;
}
