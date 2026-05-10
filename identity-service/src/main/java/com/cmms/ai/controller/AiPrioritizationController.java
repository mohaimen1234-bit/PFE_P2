package com.cmms.ai.controller;

import com.cmms.ai.dto.*;
import com.cmms.ai.entity.AiPriorityDecisionStatus;
import com.cmms.ai.entity.AiPrioritySuggestion;
import com.cmms.ai.entity.SlaStatus;
import com.cmms.ai.repository.AiPrioritySuggestionRepository;
import com.cmms.ai.service.PriorityScoringService;
import com.cmms.claims.entity.Claim;
import com.cmms.claims.entity.ClaimPriority;
import com.cmms.claims.repository.ClaimRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/ai/prioritization")
@RequiredArgsConstructor
public class AiPrioritizationController {

    private final PriorityScoringService priorityScoringService;
    private final AiPrioritySuggestionRepository aiPrioritySuggestionRepository;
    private final ClaimRepository claimRepository;

    // Helper to get managerId - TODO: extract from security context in a real implementation
    private Integer getCurrentManagerId() {
        return null; // TODO: Implement authentication extraction
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','FINANCE_MANAGER')")
    public ResponseEntity<PriorityDashboardResponse> getDashboard() {
        List<AiPrioritySuggestion> allSuggestions = aiPrioritySuggestionRepository.findAll();
        List<Claim> allClaims = claimRepository.findAll();

        long pending = allSuggestions.stream().filter(s -> s.getDecisionStatus() == AiPriorityDecisionStatus.PENDING).count();
        long noDueDate = allClaims.stream().filter(c -> c.getDueDate() == null).count();
        long slaAtRisk = allSuggestions.stream().filter(s -> s.getSlaStatus() == SlaStatus.AT_RISK).count();
        long slaBreached = allSuggestions.stream().filter(s -> s.getSlaStatus() == SlaStatus.BREACHED).count();
        
        long criticals = allSuggestions.stream().filter(s -> s.getSuggestedPriority() == ClaimPriority.CRITICAL).count();
        long highs = allSuggestions.stream().filter(s -> s.getSuggestedPriority() == ClaimPriority.HIGH).count();

        long acceptedCount = allSuggestions.stream().filter(s -> s.getDecisionStatus() == AiPriorityDecisionStatus.ACCEPTED).count();
        long decidedCount = allSuggestions.stream().filter(s -> s.getDecisionStatus() != AiPriorityDecisionStatus.PENDING).count();
        
        BigDecimal acceptanceRate = BigDecimal.ZERO;
        if (decidedCount > 0) {
            acceptanceRate = BigDecimal.valueOf((double) acceptedCount / decidedCount * 100).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal averageScore = BigDecimal.ZERO;
        if (!allSuggestions.isEmpty()) {
            double sum = allSuggestions.stream().mapToDouble(s -> s.getScore() != null ? s.getScore().doubleValue() : 0).sum();
            averageScore = BigDecimal.valueOf(sum / allSuggestions.size()).setScale(2, RoundingMode.HALF_UP);
        }

        PriorityDashboardResponse dashboard = PriorityDashboardResponse.builder()
                .totalAnalyzedClaims(allSuggestions.size())
                .pendingManagerDecisions(pending)
                .claimsWithoutDueDate(noDueDate)
                .slaAtRisk(slaAtRisk)
                .slaBreached(slaBreached)
                .criticalSuggestions(criticals)
                .highSuggestions(highs)
                .acceptanceRate(acceptanceRate)
                .averagePriorityScore(averageScore)
                .build();

        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/suggestions")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','FINANCE_MANAGER')")
    public ResponseEntity<List<PrioritySuggestionResponse>> getSuggestions() {
        // TODO: add filters (priority, slaStatus, decisionStatus, search, departmentId)
        List<AiPrioritySuggestion> suggestions = aiPrioritySuggestionRepository.findAll();
        List<PrioritySuggestionResponse> responses = suggestions.stream().map(s -> {
            Claim c = claimRepository.findById(s.getClaimId()).orElse(null);
            return priorityScoringService.toPrioritySuggestionResponse(s, c);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/claims/{claimId}/calculate")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','FINANCE_MANAGER')")
    public ResponseEntity<PrioritySuggestionResponse> calculatePriority(@PathVariable Integer claimId) {
        AiPrioritySuggestion suggestion = priorityScoringService.calculatePrioritySuggestion(claimId);
        Claim claim = claimRepository.findById(claimId).orElse(null);
        return ResponseEntity.ok(priorityScoringService.toPrioritySuggestionResponse(suggestion, claim));
    }

    @GetMapping("/claims/{claimId}/suggestion")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER','FINANCE_MANAGER')")
    public ResponseEntity<PrioritySuggestionResponse> getSuggestionByClaimId(@PathVariable Integer claimId) {
        AiPrioritySuggestion suggestion = aiPrioritySuggestionRepository.findByClaimId(claimId).orElse(null);
        if (suggestion == null) return ResponseEntity.notFound().build();
        Claim claim = claimRepository.findById(claimId).orElse(null);
        return ResponseEntity.ok(priorityScoringService.toPrioritySuggestionResponse(suggestion, claim));
    }

    @PostMapping("/suggestions/{id}/accept")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER')")
    public ResponseEntity<PrioritySuggestionResponse> acceptSuggestion(@PathVariable Integer id, @RequestBody(required = false) AcceptPrioritySuggestionRequest request) {
        String note = (request != null) ? request.getNote() : null;
        PrioritySuggestionResponse response = priorityScoringService.acceptSuggestion(id, getCurrentManagerId(), note);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/suggestions/{id}/override")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER')")
    public ResponseEntity<PrioritySuggestionResponse> overrideSuggestion(@PathVariable Integer id, @Valid @RequestBody OverridePrioritySuggestionRequest request) {
        PrioritySuggestionResponse response = priorityScoringService.overrideSuggestion(
                id, request.getFinalPriority(), request.getFinalDueDate(), request.getReason(), getCurrentManagerId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/suggestions/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','MAINTENANCE_MANAGER')")
    public ResponseEntity<PrioritySuggestionResponse> rejectSuggestion(@PathVariable Integer id, @Valid @RequestBody RejectPrioritySuggestionRequest request) {
        PrioritySuggestionResponse response = priorityScoringService.rejectSuggestion(
                id, request.getReason(), getCurrentManagerId());
        return ResponseEntity.ok(response);
    }
}
