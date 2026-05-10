package com.cmms.ai.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisRequest {

    /** Analysis window in days. Default 90. */
    @Builder.Default
    private Integer analysisPeriodDays = 90;

    /** Minimum claims for a group to qualify. Default 3. */
    @Builder.Default
    private Integer minClaims = 3;

    /** Minimum affected equipment for a group to qualify. Default 2. */
    @Builder.Default
    private Integer minAffectedEquipment = 2;

    /** Optional department filter. */
    private Integer departmentId;

    /** Optional severity filter: LOW, MEDIUM, HIGH, CRITICAL. */
    private String severity;
}
