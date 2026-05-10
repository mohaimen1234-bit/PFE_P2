package com.cmms.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PriorityDashboardResponse {
    private long totalAnalyzedClaims;
    private long pendingManagerDecisions;
    private long claimsWithoutDueDate;
    private long slaAtRisk;
    private long slaBreached;
    private long criticalSuggestions;
    private long highSuggestions;
    private BigDecimal acceptanceRate;
    private BigDecimal averagePriorityScore;
}
