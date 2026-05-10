package com.cmms.ai.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {

    // ── Equipment identity ───────────────────────────────────────
    private Integer equipmentId;
    private String equipmentName;
    private String equipmentCode;
    private String location;
    private String departmentName;

    // ── Criticality ──────────────────────────────────────────────
    private String criticality;
    private double criticalityMultiplier;

    // ── Age factor ───────────────────────────────────────────────
    private double ageYears;
    private int ageRisk;               // 0–25

    // ── Failure history factor ───────────────────────────────────
    private int correctiveWoCount;
    private int failureHistoryRisk;    // 0–40

    // ── Meter threshold factor ───────────────────────────────────
    private int meterThresholdRisk;    // 0–20
    private String meterStatusSummary;

    // ── Predictive outcome factor ────────────────────────────────
    private int predictiveOutcomeCredit; // 0-25
    private Integer latestPredictiveWoId;
    private String latestPredictiveWoStatus;
    private String latestPredictiveOutcome;
    private LocalDateTime latestPredictiveValidatedAt;
    private String interventionState;

    // ── Composite scores ─────────────────────────────────────────
    private int pofScore;              // raw sum before multiplier
    private int finalRiskScore;        // 0–100
    private String riskLevel;          // LOW, MEDIUM, HIGH, CRITICAL

    // ── Recommendation & suggested work order ────────────────────
    private String recommendation;
    private String suggestedWorkOrderType;   // PREDICTIVE
    private String suggestedSeverity;
    private String suggestedPriority;        // LOW, MEDIUM, HIGH, CRITICAL
    private boolean shouldSuggestWorkOrder;

    // ── Explainability ───────────────────────────────────────────
    private List<String> reasons;

    // ── Timeline context ─────────────────────────────────────────
    private LocalDateTime lastFailureDate;
    private LocalDateTime lastMaintenanceDate;
}
