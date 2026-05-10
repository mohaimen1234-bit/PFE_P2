package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisReportSummaryDto {
    private String id;
    private String type;
    private String title;
    private String severity;
    private String scopeLabel;
    private String mainFinding;
    private int claimCount;
    private int affectedEquipmentCount;
    private int equipmentCount;
    private double baselineMultiplier;
    private LocalDateTime generatedAt;
}
