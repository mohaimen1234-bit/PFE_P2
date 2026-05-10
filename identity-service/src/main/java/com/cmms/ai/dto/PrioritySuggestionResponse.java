package com.cmms.ai.dto;

import com.cmms.ai.entity.AiPriorityDecisionStatus;
import com.cmms.ai.entity.SlaStatus;
import com.cmms.claims.entity.ClaimPriority;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PrioritySuggestionResponse {
    private Integer id;
    private Integer claimId;
    private String claimTitle;
    private ClaimPriority currentPriority;
    private ClaimPriority suggestedPriority;
    private ClaimPriority finalPriority;
    private BigDecimal score;
    private BigDecimal confidence;
    private BigDecimal criticalityScore;
    private BigDecimal serviceImpactScore;
    private BigDecimal severityScore;
    private BigDecimal failureHistoryScore;
    private BigDecimal slaScore;
    private LocalDateTime createdAt;
    private LocalDateTime claimDueDate;
    private LocalDateTime suggestedDueDate;
    private LocalDateTime finalDueDate;
    private SlaStatus slaStatus;
    private AiPriorityDecisionStatus decisionStatus;
    private String reason;
    private String recommendation;
}
