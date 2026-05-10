package com.cmms.ai.entity;

import com.cmms.claims.entity.ClaimPriority;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_priority_suggestions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiPrioritySuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "claim_id", nullable = false)
    private Integer claimId;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_priority")
    private ClaimPriority currentPriority;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggested_priority", nullable = false)
    private ClaimPriority suggestedPriority;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_priority")
    private ClaimPriority finalPriority;

    @Column(name = "score")
    private BigDecimal score;

    @Column(name = "confidence")
    private BigDecimal confidence;

    @Column(name = "criticality_score")
    private BigDecimal criticalityScore;

    @Column(name = "service_impact_score")
    private BigDecimal serviceImpactScore;

    @Column(name = "severity_score")
    private BigDecimal severityScore;

    @Column(name = "failure_history_score")
    private BigDecimal failureHistoryScore;

    @Column(name = "sla_score")
    private BigDecimal slaScore;

    @Column(name = "suggested_due_date")
    private LocalDateTime suggestedDueDate;

    @Column(name = "final_due_date")
    private LocalDateTime finalDueDate;

    @Column(name = "due_date_was_overridden")
    private Boolean dueDateWasOverridden;

    @Column(name = "due_date_override_reason", columnDefinition = "TEXT")
    private String dueDateOverrideReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "sla_status")
    private SlaStatus slaStatus;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_status", nullable = false)
    private AiPriorityDecisionStatus decisionStatus;

    @Column(name = "decision_reason", columnDefinition = "TEXT")
    private String decisionReason;

    @Column(name = "decided_by_user_id")
    private Integer decidedByUserId;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
