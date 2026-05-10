package com.cmms.ai.service;

import com.cmms.ai.entity.AiPriorityDecisionStatus;
import com.cmms.ai.entity.AiPrioritySuggestion;
import com.cmms.ai.entity.SlaStatus;
import com.cmms.ai.repository.AiPrioritySuggestionRepository;
import com.cmms.claims.entity.Claim;
import com.cmms.claims.entity.ClaimPriority;
import com.cmms.claims.entity.ClaimSeverity;
import com.cmms.claims.repository.ClaimRepository;
import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.entity.EquipmentCriticality;
import com.cmms.equipment.entity.EquipmentStatus;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.identity.service.AuditLogService;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cmms.ai.dto.PrioritySuggestionResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriorityScoringService {

    private final ClaimRepository claimRepository;
    private final EquipmentRepository equipmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AiPrioritySuggestionRepository aiPrioritySuggestionRepository;
    private final AuditLogService auditLogService;

    private static final double WEIGHT_CRITICALITY = 0.30;
    private static final double WEIGHT_SERVICE_IMPACT = 0.25;
    private static final double WEIGHT_SEVERITY = 0.20;
    private static final double WEIGHT_FAILURE_HISTORY = 0.15;
    private static final double WEIGHT_SLA = 0.10;

    @Transactional
    public AiPrioritySuggestion calculatePrioritySuggestion(Integer claimId) {
        log.info("Calculating priority suggestion for claim ID: {}", claimId);
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found: " + claimId));

        Equipment equipment = null;
        if (claim.getEquipmentId() != null) {
            equipment = equipmentRepository.findById(claim.getEquipmentId()).orElse(null);
        }

        List<String> reasons = new ArrayList<>();
        int confidenceDeductions = 0;

        // 1. Criticality
        double criticalityScore = calculateCriticalityScore(equipment, reasons);
        if (equipment == null || equipment.getCriticality() == null) {
            confidenceDeductions += 10;
        }

        // 2. Service Impact
        double serviceImpactScore = calculateServiceImpactScore(equipment, reasons);
        if (equipment == null || (equipment.getStatus() != EquipmentStatus.OUT_OF_SERVICE && equipment.getStatus() != EquipmentStatus.UNDER_REPAIR && equipment.getCriticality() == null)) {
            confidenceDeductions += 10;
        }

        // 3. Severity
        double severityScore = calculateSeverityScore(claim, reasons);

        // 4. Failure History
        double failureHistoryScore = calculateFailureHistoryScore(equipment, reasons);
        if (equipment == null) {
            confidenceDeductions += 10;
        }

        // 5. SLA
        double slaScore = calculateSlaScore(claim, reasons);

        // Calculate total score
        double totalScore = (criticalityScore * WEIGHT_CRITICALITY)
                + (serviceImpactScore * WEIGHT_SERVICE_IMPACT)
                + (severityScore * WEIGHT_SEVERITY)
                + (failureHistoryScore * WEIGHT_FAILURE_HISTORY)
                + (slaScore * WEIGHT_SLA);

        BigDecimal score = BigDecimal.valueOf(totalScore).setScale(2, RoundingMode.HALF_UP);
        ClaimPriority suggestedPriority = mapScoreToPriority(totalScore);

        LocalDateTime baseTime = LocalDateTime.now();
        LocalDateTime suggestedDueDate = suggestDueDate(suggestedPriority, baseTime);

        SlaStatus slaStatus = determineSlaStatus(claim.getDueDate(), baseTime);

        int confidenceVal = Math.max(50, 100 - confidenceDeductions);
        BigDecimal confidence = BigDecimal.valueOf(confidenceVal).setScale(2, RoundingMode.HALF_UP);

        String reason = String.join(" ", reasons);
        String recommendation = String.format("Suggested priority is %s with due date %s. Score: %s.",
                suggestedPriority, suggestedDueDate, score);

        AiPrioritySuggestion suggestion = AiPrioritySuggestion.builder()
                .claimId(claim.getClaimId())
                .currentPriority(claim.getPriority())
                .suggestedPriority(suggestedPriority)
                .finalPriority(null)
                .score(score)
                .confidence(confidence)
                .criticalityScore(BigDecimal.valueOf(criticalityScore).setScale(2, RoundingMode.HALF_UP))
                .serviceImpactScore(BigDecimal.valueOf(serviceImpactScore).setScale(2, RoundingMode.HALF_UP))
                .severityScore(BigDecimal.valueOf(severityScore).setScale(2, RoundingMode.HALF_UP))
                .failureHistoryScore(BigDecimal.valueOf(failureHistoryScore).setScale(2, RoundingMode.HALF_UP))
                .slaScore(BigDecimal.valueOf(slaScore).setScale(2, RoundingMode.HALF_UP))
                .suggestedDueDate(suggestedDueDate)
                .finalDueDate(null)
                .dueDateWasOverridden(false)
                .slaStatus(slaStatus)
                .reason(reason)
                .recommendation(recommendation)
                .decisionStatus(AiPriorityDecisionStatus.PENDING)
                .build();

        // If a suggestion already exists, we could update it, but here we assume one per claim or replace
        Optional<AiPrioritySuggestion> existing = aiPrioritySuggestionRepository.findByClaimId(claim.getClaimId());
        if (existing.isPresent()) {
            suggestion.setId(existing.get().getId());
            suggestion.setCreatedAt(existing.get().getCreatedAt());
        }

        AiPrioritySuggestion savedSuggestion = aiPrioritySuggestionRepository.save(suggestion);
        
        auditLogService.log(
                null,
                "AI System",
                "AI_PRIORITY_SUGGESTION_CALCULATED",
                "CLAIM",
                claim.getClaimId(),
                String.format("Calculated suggestion %d. Score: %s, Confidence: %s",
                        savedSuggestion.getId(), score, confidence)
        );

        return savedSuggestion;
    }

    @Transactional
    public PrioritySuggestionResponse acceptSuggestion(Integer suggestionId, Integer managerId, String note) {
        AiPrioritySuggestion suggestion = aiPrioritySuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new IllegalArgumentException("Suggestion not found: " + suggestionId));
        Claim claim = claimRepository.findById(suggestion.getClaimId())
                .orElseThrow(() -> new IllegalArgumentException("Claim not found for suggestion"));

        claim.setPriority(suggestion.getSuggestedPriority());
        claim.setDueDate(suggestion.getSuggestedDueDate());

        suggestion.setFinalPriority(suggestion.getSuggestedPriority());
        suggestion.setFinalDueDate(suggestion.getSuggestedDueDate());
        suggestion.setDueDateWasOverridden(false);
        suggestion.setDecisionStatus(AiPriorityDecisionStatus.ACCEPTED);
        suggestion.setDecisionReason(note);
        suggestion.setDecidedByUserId(managerId);
        suggestion.setDecidedAt(LocalDateTime.now());

        claimRepository.save(claim);
        aiPrioritySuggestionRepository.save(suggestion);

        String managerName = managerId != null ? "Manager ID " + managerId : "System";
        auditLogService.log(
                managerId, managerName,
                "AI_PRIORITY_SUGGESTION_ACCEPTED",
                "CLAIM", claim.getClaimId(),
                String.format("Accepted suggestion %d. Priority: %s, Due Date: %s. Note: %s",
                        suggestionId, suggestion.getSuggestedPriority(), suggestion.getSuggestedDueDate(), note != null ? note : "None")
        );
        auditLogService.log(
                managerId, managerName,
                "CLAIM_PRIORITY_UPDATED_BY_AI",
                "CLAIM", claim.getClaimId(),
                "Claim priority updated to " + claim.getPriority()
        );
        if (claim.getDueDate() != null) {
            auditLogService.log(
                    managerId, managerName,
                    "CLAIM_DUE_DATE_UPDATED_BY_AI",
                    "CLAIM", claim.getClaimId(),
                    "Claim due date updated to " + claim.getDueDate()
            );
        }

        return toPrioritySuggestionResponse(suggestion, claim);
    }

    @Transactional
    public PrioritySuggestionResponse overrideSuggestion(Integer suggestionId, ClaimPriority finalPriority, LocalDateTime finalDueDate, String reason, Integer managerId) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Reason is required for override");
        }

        AiPrioritySuggestion suggestion = aiPrioritySuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new IllegalArgumentException("Suggestion not found: " + suggestionId));
        Claim claim = claimRepository.findById(suggestion.getClaimId())
                .orElseThrow(() -> new IllegalArgumentException("Claim not found for suggestion"));

        claim.setPriority(finalPriority);
        if (finalDueDate != null) {
            claim.setDueDate(finalDueDate);
        }

        suggestion.setFinalPriority(finalPriority);
        suggestion.setFinalDueDate(finalDueDate);
        
        boolean dateChanged = finalDueDate != null && !finalDueDate.equals(suggestion.getSuggestedDueDate());
        suggestion.setDueDateWasOverridden(dateChanged);
        if (dateChanged) {
            suggestion.setDueDateOverrideReason(reason);
        }

        suggestion.setDecisionStatus(AiPriorityDecisionStatus.OVERRIDDEN);
        suggestion.setDecisionReason(reason);
        suggestion.setDecidedByUserId(managerId);
        suggestion.setDecidedAt(LocalDateTime.now());

        claimRepository.save(claim);
        aiPrioritySuggestionRepository.save(suggestion);

        String managerName = managerId != null ? "Manager ID " + managerId : "System";
        auditLogService.log(
                managerId, managerName,
                "AI_PRIORITY_SUGGESTION_OVERRIDDEN",
                "CLAIM", claim.getClaimId(),
                String.format("Overridden suggestion %d. Final Priority: %s, Final Due Date: %s. Reason: %s",
                        suggestionId, finalPriority, finalDueDate, reason)
        );
        auditLogService.log(
                managerId, managerName,
                "CLAIM_PRIORITY_UPDATED_BY_AI",
                "CLAIM", claim.getClaimId(),
                "Claim priority overridden to " + claim.getPriority()
        );
        if (claim.getDueDate() != null) {
            auditLogService.log(
                    managerId, managerName,
                    "CLAIM_DUE_DATE_UPDATED_BY_AI",
                    "CLAIM", claim.getClaimId(),
                    "Claim due date overridden to " + claim.getDueDate()
            );
        }

        return toPrioritySuggestionResponse(suggestion, claim);
    }

    @Transactional
    public PrioritySuggestionResponse rejectSuggestion(Integer suggestionId, String reason, Integer managerId) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Reason is required for rejection");
        }

        AiPrioritySuggestion suggestion = aiPrioritySuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new IllegalArgumentException("Suggestion not found: " + suggestionId));

        suggestion.setDecisionStatus(AiPriorityDecisionStatus.REJECTED);
        suggestion.setDecisionReason(reason);
        suggestion.setDecidedByUserId(managerId);
        suggestion.setDecidedAt(LocalDateTime.now());

        aiPrioritySuggestionRepository.save(suggestion);

        String managerName = managerId != null ? "Manager ID " + managerId : "System";
        auditLogService.log(
                managerId, managerName,
                "AI_PRIORITY_SUGGESTION_REJECTED",
                "CLAIM", suggestion.getClaimId(),
                String.format("Rejected suggestion %d. Reason: %s", suggestionId, reason)
        );

        Claim claim = claimRepository.findById(suggestion.getClaimId()).orElse(null);
        return toPrioritySuggestionResponse(suggestion, claim);
    }

    public PrioritySuggestionResponse toPrioritySuggestionResponse(AiPrioritySuggestion suggestion, Claim claim) {
        return PrioritySuggestionResponse.builder()
                .id(suggestion.getId())
                .claimId(suggestion.getClaimId())
                .claimTitle(claim != null ? claim.getTitle() : "Unknown Claim")
                .currentPriority(suggestion.getCurrentPriority())
                .suggestedPriority(suggestion.getSuggestedPriority())
                .finalPriority(suggestion.getFinalPriority())
                .score(suggestion.getScore())
                .confidence(suggestion.getConfidence())
                .criticalityScore(suggestion.getCriticalityScore())
                .serviceImpactScore(suggestion.getServiceImpactScore())
                .severityScore(suggestion.getSeverityScore())
                .failureHistoryScore(suggestion.getFailureHistoryScore())
                .slaScore(suggestion.getSlaScore())
                .createdAt(suggestion.getCreatedAt())
                .claimDueDate(claim != null ? claim.getDueDate() : null)
                .suggestedDueDate(suggestion.getSuggestedDueDate())
                .finalDueDate(suggestion.getFinalDueDate())
                .slaStatus(suggestion.getSlaStatus())
                .decisionStatus(suggestion.getDecisionStatus())
                .reason(suggestion.getReason())
                .recommendation(suggestion.getRecommendation())
                .build();
    }

    private double calculateCriticalityScore(Equipment equipment, List<String> reasons) {
        if (equipment == null || equipment.getCriticality() == null) {
            reasons.add("Criticality missing (used default 50).");
            return 50.0;
        }
        EquipmentCriticality crit = equipment.getCriticality();
        double score = switch (crit) {
            case CRITICAL -> 100.0;
            case HIGH -> 75.0;
            case MEDIUM -> 50.0;
            case LOW -> 25.0;
        };
        reasons.add("Equipment criticality is " + crit + " (score " + score + ").");
        return score;
    }

    private double calculateServiceImpactScore(Equipment equipment, List<String> reasons) {
        if (equipment == null) {
            reasons.add("Service impact fallback (used default 0 due to missing equipment).");
            return 0.0;
        }
        
        if (equipment.getStatus() == EquipmentStatus.UNDER_REPAIR) {
            reasons.add("Equipment is under repair (score 100).");
            return 100.0;
        } else {
            reasons.add("Equipment is not under repair (score 0).");
            return 0.0;
        }
    }

    private double calculateSeverityScore(Claim claim, List<String> reasons) {
        ClaimSeverity severity = claim.getValidatedSeverity();
        if (severity == null) {
            severity = claim.getReportedSeverity();
        }
        if (severity == null) {
            severity = ClaimSeverity.DEGRADED_PERFORMANCE; // fallback
            reasons.add("Severity missing (used fallback DEGRADED_PERFORMANCE).");
        }

        double score = switch (severity) {
            case SAFETY_RISK -> 100.0;
            case SERVICE_BLOCKING -> 85.0;
            case DEGRADED_PERFORMANCE -> 60.0;
            case MINOR_DEFECT -> 30.0;
            case COSMETIC_OR_INFO -> 10.0;
        };
        reasons.add("Claim severity is " + severity + " (score " + score + ").");
        return score;
    }

    private double calculateFailureHistoryScore(Equipment equipment, List<String> reasons) {
        if (equipment == null) {
            reasons.add("No equipment linked to assess failure history (score 25).");
            return 25.0;
        }

        long failureCount = workOrderRepository.countByEquipmentIdAndWoTypeAndCreatedAtAfter(
                equipment.getEquipmentId(),
                WorkOrder.WorkOrderType.CORRECTIVE,
                LocalDateTime.now().minusDays(90)
        );

        double score;
        if (failureCount == 0) score = 10.0;
        else if (failureCount == 1) score = 25.0;
        else if (failureCount == 2) score = 50.0;
        else if (failureCount == 3) score = 75.0;
        else score = 100.0;

        reasons.add(failureCount + " previous failures (score " + score + ").");
        return score;
    }

    private double calculateSlaScore(Claim claim, List<String> reasons) {
        LocalDateTime now = LocalDateTime.now();
        if (claim.getDueDate() != null) {
            long hoursUntilDue = ChronoUnit.HOURS.between(now, claim.getDueDate());
            double score;
            if (hoursUntilDue < 0) score = 100.0;
            else if (hoursUntilDue <= 4) score = 90.0;
            else if (hoursUntilDue <= 24) score = 75.0;
            else if (hoursUntilDue <= 72) score = 50.0;
            else if (hoursUntilDue <= 168) score = 25.0; // 7 days
            else score = 10.0;
            
            reasons.add("SLA score based on due date in " + hoursUntilDue + " hours (score " + score + ").");
            return score;
        } else {
            long ageHours = ChronoUnit.HOURS.between(claim.getCreatedAt(), now);
            double score;
            if (ageHours > 168) score = 100.0;
            else if (ageHours >= 72) score = 75.0;
            else if (ageHours >= 24) score = 50.0;
            else if (ageHours >= 4) score = 25.0;
            else score = 0.0;

            reasons.add("SLA score based on age of " + ageHours + " hours (score " + score + ").");
            return score;
        }
    }

    private ClaimPriority mapScoreToPriority(double score) {
        if (score >= 85) return ClaimPriority.CRITICAL;
        if (score >= 65) return ClaimPriority.HIGH;
        if (score >= 40) return ClaimPriority.MEDIUM;
        return ClaimPriority.LOW;
    }

    private LocalDateTime suggestDueDate(ClaimPriority priority, LocalDateTime baseTime) {
        return switch (priority) {
            case CRITICAL -> baseTime.plusHours(4);
            case HIGH -> baseTime.plusHours(24);
            case MEDIUM -> baseTime.plusHours(72);
            case LOW -> baseTime.plusDays(7);
        };
    }

    private SlaStatus determineSlaStatus(LocalDateTime dueDate, LocalDateTime baseTime) {
        if (dueDate == null) {
            return SlaStatus.NO_DUE_DATE;
        }
        if (baseTime.isAfter(dueDate)) {
            return SlaStatus.BREACHED;
        }
        long hoursUntilDue = ChronoUnit.HOURS.between(baseTime, dueDate);
        if (hoursUntilDue <= 24) {
            return SlaStatus.AT_RISK;
        }
        return SlaStatus.SAFE;
    }
}
