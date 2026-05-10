package com.cmms.ai.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisReportSummary {

    private String id;
    private String type;
    private String title;
    private String severity;           // LOW, MEDIUM, HIGH, CRITICAL
    private String scopeLabel;
    private String mainFinding;
    private int claimCount;
    private int affectedEquipmentCount;
    private int equipmentCount;
    private double baselineMultiplier;
    private LocalDateTime generatedAt;
}
