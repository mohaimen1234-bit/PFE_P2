package com.cmms.ai.service;

import com.cmms.ai.dto.PredictionResponse;

import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.entity.EquipmentCriticality;
import com.cmms.equipment.entity.Meter;
import com.cmms.equipment.entity.MeterThreshold;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.equipment.repository.MeterRepository;
import com.cmms.equipment.repository.MeterThresholdRepository;
import com.cmms.identity.entity.Department;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final EquipmentRepository equipmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final MeterRepository meterRepository;
    private final MeterThresholdRepository meterThresholdRepository;
    private final DepartmentRepository departmentRepository;

    private static final double EXPECTED_LIFETIME_YEARS = 10.0;

    @Transactional(readOnly = true)
    public List<PredictionResponse> getPredictions() {
        // Pre-load departments for batch resolution
        Map<Integer, String> deptNames = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, Department::getDepartmentName));

        return equipmentRepository.findAll().stream()
                .map(equipment -> {
                    try {
                        return calculateRisk(equipment, deptNames);
                    } catch (Exception e) {
                        log.error("Failed to calculate risk for equipment ID {}: {}",
                                equipment.getEquipmentId(), e.getMessage(), e);
                        return buildErrorResponse(equipment, e);
                    }
                })
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════
    //  CORE SCORING
    // ═══════════════════════════════════════════════════════════════

    private PredictionResponse calculateRisk(Equipment equipment, Map<Integer, String> deptNames) {
        List<String> reasons = new ArrayList<>();

        // ── 1. Age Risk (max 25) ─────────────────────────────────
        double ageYears = computeAgeYears(equipment);
        int ageRisk = computeAgeRisk(ageYears, reasons);

        // ── 2. Failure History Risk (max 40) ─────────────────────
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
        List<WorkOrder> equipmentWos = workOrderRepository.findByEquipmentId(equipment.getEquipmentId());
        if (equipmentWos == null) equipmentWos = List.of();

        List<WorkOrder> correctiveWos = equipmentWos.stream()
                .filter(wo -> wo.getWoType() == WorkOrder.WorkOrderType.CORRECTIVE)
                .filter(wo -> wo.getCreatedAt() != null && wo.getCreatedAt().isAfter(twelveMonthsAgo))
                .collect(Collectors.toList());

        int correctiveWoCount = correctiveWos.size();
        int failureHistoryRisk = computeFailureHistoryRisk(correctiveWoCount, reasons);

        // ── 3. Meter Threshold Risk (max 20) ─────────────────────
        MeterRiskResult meterResult = computeMeterThresholdRisk(equipment.getEquipmentId(), reasons);

        // ── 4. Predictive Outcome Credit ─────────────────────────
        List<WorkOrder> equipmentPredictiveWos = equipmentWos.stream()
                .filter(wo -> wo.getWoType() == WorkOrder.WorkOrderType.PREDICTIVE)
                .collect(Collectors.toList());

        // Check for active predictive WOs
        List<WorkOrder.WorkOrderStatus> activeStatuses = List.of(
                WorkOrder.WorkOrderStatus.CREATED,
                WorkOrder.WorkOrderStatus.ASSIGNED,
                WorkOrder.WorkOrderStatus.SCHEDULED,
                WorkOrder.WorkOrderStatus.IN_PROGRESS,
                WorkOrder.WorkOrderStatus.ON_HOLD,
                WorkOrder.WorkOrderStatus.COMPLETED
        );
        
        boolean hasActivePredictive = equipmentPredictiveWos.stream()
                .anyMatch(wo -> activeStatuses.contains(wo.getStatus()));
                
        boolean isAwaitingValidation = equipmentPredictiveWos.stream()
                .anyMatch(wo -> wo.getStatus() == WorkOrder.WorkOrderStatus.COMPLETED);

        // Get latest validated predictive WO
        WorkOrder latestValidatedPredictive = equipmentPredictiveWos.stream()
                .filter(wo -> wo.getStatus() == WorkOrder.WorkOrderStatus.VALIDATED || wo.getStatus() == WorkOrder.WorkOrderStatus.CLOSED)
                .filter(wo -> wo.getValidatedAt() != null)
                .max(Comparator.comparing(WorkOrder::getValidatedAt))
                .orElse(null);

        int predictiveOutcomeCredit = 0;
        String interventionState = "NO_ACTION";
        
        if (hasActivePredictive) {
            interventionState = isAwaitingValidation ? "AWAITING_VALIDATION" : "WO_OPEN";
        }

        if (latestValidatedPredictive != null) {
            long daysSinceValidation = ChronoUnit.DAYS.between(latestValidatedPredictive.getValidatedAt().toLocalDate(), LocalDate.now());
            WorkOrder.PredictiveOutcome outcome = latestValidatedPredictive.getPredictiveOutcome();
            
            if (outcome == WorkOrder.PredictiveOutcome.NO_ISSUE_FOUND) {
                if (daysSinceValidation <= 30) predictiveOutcomeCredit = 25;
                else if (daysSinceValidation <= 60) predictiveOutcomeCredit = 15;
                else if (daysSinceValidation <= 90) predictiveOutcomeCredit = 8;
                if (!hasActivePredictive && predictiveOutcomeCredit > 0) interventionState = "INSPECTED_HEALTHY";
            } else if (outcome == WorkOrder.PredictiveOutcome.ISSUE_FOUND_RESOLVED) {
                if (daysSinceValidation <= 30) predictiveOutcomeCredit = 20;
                else if (daysSinceValidation <= 60) predictiveOutcomeCredit = 10;
                else if (daysSinceValidation <= 90) predictiveOutcomeCredit = 5;
                if (!hasActivePredictive && predictiveOutcomeCredit > 0) interventionState = "ISSUE_RESOLVED";
            } else if (outcome == WorkOrder.PredictiveOutcome.MONITORING_REQUIRED) {
                if (daysSinceValidation <= 30) predictiveOutcomeCredit = 5;
                if (!hasActivePredictive && predictiveOutcomeCredit > 0) interventionState = "MONITORING";
            } else if (outcome == WorkOrder.PredictiveOutcome.UNCONFIRMED) {
                predictiveOutcomeCredit = 0;
                if (!hasActivePredictive) interventionState = "UNCONFIRMED";
            }
            
            if (predictiveOutcomeCredit > 0) {
                reasons.add(String.format("Latest validated predictive WO (%d days ago) outcome: %s (credit -%d).", 
                    daysSinceValidation, outcome != null ? outcome.name() : "UNKNOWN", predictiveOutcomeCredit));
            }
        }

        // ── 5. Criticality Multiplier ────────────────────────────
        double critMultiplier = mapCriticalityMultiplier(equipment.getCriticality());
        String critLabel = equipment.getCriticality() != null ? equipment.getCriticality().name() : "UNKNOWN";
        if (critMultiplier != 1.0) {
            reasons.add("Equipment criticality " + critLabel + " applies a " + critMultiplier + "x multiplier.");
        }

        // ── 6. Composite Score ───────────────────────────────────
        int pofScore = 10 + ageRisk + failureHistoryRisk + meterResult.risk() - predictiveOutcomeCredit;
        pofScore = Math.max(0, pofScore);
        int finalRiskScore = (int) Math.min(100, Math.round(pofScore * critMultiplier));

        // ── 7. Risk Level ────────────────────────────────────────
        String riskLevel = mapRiskLevel(finalRiskScore);

        // ── 8. Recommendation & Severity ─────────────────────────
        String recommendation = mapRecommendation(riskLevel, interventionState);
        String suggestedSeverity = mapSuggestedSeverity(riskLevel, finalRiskScore, meterResult.risk(), failureHistoryRisk);
        String suggestedPriority = mapSuggestedPriority(riskLevel);
        boolean shouldSuggest = ("HIGH".equals(riskLevel) || "CRITICAL".equals(riskLevel)) && 
                                !("WO_OPEN".equals(interventionState) || "AWAITING_VALIDATION".equals(interventionState));

        // ── 9. Timeline context ──────────────────────────────────
        LocalDateTime lastFailureDate = correctiveWos.stream()
                .map(wo -> wo.getCompletedAt() != null ? wo.getCompletedAt() : wo.getCreatedAt())
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        LocalDateTime lastMaintenanceDate = equipmentWos.stream()
                .filter(wo -> wo.getCompletedAt() != null)
                .map(WorkOrder::getCompletedAt)
                .max(Comparator.naturalOrder())
                .orElse(null);

        // ── 10. Department name ──────────────────────────────────
        String departmentName = equipment.getDepartmentId() == null
                ? null : deptNames.get(equipment.getDepartmentId());

        return PredictionResponse.builder()
                .equipmentId(equipment.getEquipmentId())
                .equipmentName(equipment.getName() != null ? equipment.getName() : "Unknown Equipment")
                .equipmentCode(equipment.getAssetCode())
                .location(equipment.getLocation())
                .departmentName(departmentName)
                .criticality(critLabel)
                .criticalityMultiplier(critMultiplier)
                .ageYears(ageYears)
                .ageRisk(ageRisk)
                .correctiveWoCount(correctiveWoCount)
                .failureHistoryRisk(failureHistoryRisk)
                .meterThresholdRisk(meterResult.risk())
                .meterStatusSummary(meterResult.summary())
                .predictiveOutcomeCredit(predictiveOutcomeCredit)
                .latestPredictiveWoId(latestValidatedPredictive != null ? latestValidatedPredictive.getWoId() : null)
                .latestPredictiveWoStatus(latestValidatedPredictive != null ? latestValidatedPredictive.getStatus().name() : null)
                .latestPredictiveOutcome(latestValidatedPredictive != null && latestValidatedPredictive.getPredictiveOutcome() != null ? latestValidatedPredictive.getPredictiveOutcome().name() : null)
                .latestPredictiveValidatedAt(latestValidatedPredictive != null ? latestValidatedPredictive.getValidatedAt() : null)
                .interventionState(interventionState)
                .pofScore(pofScore)
                .finalRiskScore(finalRiskScore)
                .riskLevel(riskLevel)
                .recommendation(recommendation)
                .suggestedWorkOrderType("PREDICTIVE")
                .suggestedSeverity(suggestedSeverity)
                .suggestedPriority(suggestedPriority)
                .shouldSuggestWorkOrder(shouldSuggest)
                .reasons(reasons)
                .lastFailureDate(lastFailureDate)
                .lastMaintenanceDate(lastMaintenanceDate)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    //  FACTOR CALCULATIONS
    // ═══════════════════════════════════════════════════════════════

    /** Age in years from commissioningDate → purchaseDate fallback. */
    private double computeAgeYears(Equipment equipment) {
        LocalDate ref = null;
        if (equipment.getCommissioningDate() != null) {
            ref = equipment.getCommissioningDate();
        } else if (equipment.getPurchaseDate() != null) {
            ref = equipment.getPurchaseDate();
        }
        if (ref == null) return 0.0;

        long days = ChronoUnit.DAYS.between(ref, LocalDate.now());
        double years = Math.max(days / 365.25, 0.0);
        return Math.round(years * 10.0) / 10.0;
    }

    /** AgeRisk = min((ageYears / expectedLifetime) × 25, 25). Missing date → 0. */
    private int computeAgeRisk(double ageYears, List<String> reasons) {
        if (ageYears <= 0) {
            reasons.add("Equipment age unknown — age risk contribution is 0.");
            return 0;
        }
        int risk = (int) Math.min(Math.round((ageYears / EXPECTED_LIFETIME_YEARS) * 25), 25);
        reasons.add(String.format("Equipment age: %.1f years (risk %d/25).", ageYears, risk));
        return risk;
    }

    /** Failure history: 0→0, 1→10, 2→20, 3→30, 4+→40. */
    private int computeFailureHistoryRisk(int correctiveCount, List<String> reasons) {
        int risk;
        if (correctiveCount == 0) risk = 0;
        else if (correctiveCount == 1) risk = 10;
        else if (correctiveCount == 2) risk = 20;
        else if (correctiveCount == 3) risk = 30;
        else risk = 40;

        if (correctiveCount == 0) {
            reasons.add("No corrective work orders in the last 12 months.");
        } else {
            reasons.add(correctiveCount + " corrective work order(s) in the last 12 months (risk " + risk + "/40).");
        }
        return risk;
    }

    /** Meter threshold risk — highest ratio across all meters. */
    private MeterRiskResult computeMeterThresholdRisk(Integer equipmentId, List<String> reasons) {
        List<Meter> meters = meterRepository.findAllByEquipmentId(equipmentId);
        if (meters == null || meters.isEmpty()) {
            return new MeterRiskResult(0, "No meters configured.");
        }

        int highestRisk = 0;
        int metersAboveThreshold = 0;
        int metersWithThresholds = 0;
        String worstMeterName = null;
        double worstRatio = 0;

        for (Meter meter : meters) {
            List<MeterThreshold> thresholds = meterThresholdRepository.findByMeterId(meter.getMeterId());
            if (thresholds == null || thresholds.isEmpty()) continue;

            metersWithThresholds++;

            for (MeterThreshold threshold : thresholds) {
                if (threshold.getThresholdValue() == null ||
                        threshold.getThresholdValue().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                BigDecimal currentVal = threshold.getCurrentValue() != null ? threshold.getCurrentValue() : BigDecimal.ZERO;
                double ratio = currentVal.doubleValue() / threshold.getThresholdValue().doubleValue();
                int mRisk = mapMeterRatio(ratio);

                if (ratio >= 1.0) metersAboveThreshold++;

                if (mRisk > highestRisk) {
                    highestRisk = mRisk;
                    worstMeterName = meter.getName() != null ? meter.getName() : "Meter #" + meter.getMeterId();
                    worstRatio = ratio;
                }
            }
        }

        String summary;
        if (metersWithThresholds == 0) {
            summary = meters.size() + " meter(s) configured, none with thresholds.";
        } else if (highestRisk == 0) {
            summary = "All meter readings within safe range.";
        } else {
            summary = String.format("%s at %.0f%% of threshold (risk %d/20).",
                    worstMeterName, worstRatio * 100, highestRisk);
            if (metersAboveThreshold > 0) {
                summary += " " + metersAboveThreshold + " meter(s) exceeded threshold.";
            }
        }

        if (highestRisk > 0) {
            reasons.add("Meter threshold risk: " + summary);
        }

        return new MeterRiskResult(highestRisk, summary);
    }

    /** Map meter value/threshold ratio to risk score. */
    private int mapMeterRatio(double ratio) {
        if (ratio >= 1.0) return 20;
        if (ratio >= 0.80) return 15;
        if (ratio >= 0.50) return 10;
        if (ratio >= 0.30) return 5;
        return 0;
    }





    // ═══════════════════════════════════════════════════════════════
    //  MAPPINGS
    // ═══════════════════════════════════════════════════════════════

    private double mapCriticalityMultiplier(EquipmentCriticality criticality) {
        if (criticality == null) return 1.0;
        return switch (criticality) {
            case LOW -> 0.8;
            case MEDIUM -> 1.0;
            case HIGH -> 1.3;
            case CRITICAL -> 1.6;
        };
    }

    /** Risk level: 0–25=LOW, 26–50=MEDIUM, 51–75=HIGH, 76–100=CRITICAL. */
    private String mapRiskLevel(int score) {
        if (score >= 76) return "CRITICAL";
        if (score >= 51) return "HIGH";
        if (score >= 26) return "MEDIUM";
        return "LOW";
    }

    private String mapRecommendation(String riskLevel, String interventionState) {
        if ("WO_OPEN".equals(interventionState) || "AWAITING_VALIDATION".equals(interventionState)) {
            return "Intervention is already in progress.";
        }
        if ("INSPECTED_HEALTHY".equals(interventionState)) {
            return "Recently inspected healthy — temporary risk reduction applied.";
        }
        if ("ISSUE_RESOLVED".equals(interventionState)) {
            return "Issue resolved by predictive work order — temporary risk reduction applied.";
        }
        
        return switch (riskLevel) {
            case "CRITICAL" -> "Create urgent predictive maintenance work order immediately.";
            case "HIGH" -> "Create or schedule a predictive maintenance work order soon.";
            case "MEDIUM" -> "Schedule inspection or monitor during the next maintenance window.";
            default -> "Continue normal preventive maintenance.";
        };
    }

    private String mapSuggestedPriority(String riskLevel) {
        return switch (riskLevel) {
            case "CRITICAL" -> "CRITICAL";
            case "HIGH" -> "HIGH";
            case "MEDIUM" -> "MEDIUM";
            default -> "LOW";
        };
    }

    private String mapSuggestedSeverity(String riskLevel, int finalScore,
                                         int meterRisk,
                                         int failureHistoryRisk) {
        if ("CRITICAL".equals(riskLevel)) {
            boolean strongEvidence = meterRisk == 20 || failureHistoryRisk == 40 || finalScore >= 90;
            return strongEvidence ? "IMMINENT_FAILURE_RISK" : "HIGH_FAILURE_RISK";
        }
        return switch (riskLevel) {
            case "HIGH" -> "DEGRADED_PERFORMANCE";
            case "MEDIUM" -> "EARLY_WARNING";
            default -> "NORMAL_MONITORING";
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //  INTERNAL TYPES
    // ═══════════════════════════════════════════════════════════════

    private record MeterRiskResult(int risk, String summary) {}



    // ═══════════════════════════════════════════════════════════════
    //  ERROR FALLBACK
    // ═══════════════════════════════════════════════════════════════

    private PredictionResponse buildErrorResponse(Equipment equipment, Exception e) {
        return PredictionResponse.builder()
                .equipmentId(equipment.getEquipmentId())
                .equipmentName(equipment.getName() != null ? equipment.getName() : "Unknown Equipment")
                .equipmentCode(equipment.getAssetCode())
                .location(equipment.getLocation())
                .criticality(equipment.getCriticality() != null ? equipment.getCriticality().name() : "UNKNOWN")
                .criticalityMultiplier(1.0)
                .finalRiskScore(0)
                .pofScore(0)
                .riskLevel("LOW")
                .recommendation("Unable to calculate risk — data error.")
                .reasons(List.of("Error: " + e.getMessage()))
                .shouldSuggestWorkOrder(false)
                .suggestedWorkOrderType("PREDICTIVE")
                .suggestedSeverity("NORMAL_MONITORING")
                .suggestedPriority("LOW")
                .build();
    }
}
