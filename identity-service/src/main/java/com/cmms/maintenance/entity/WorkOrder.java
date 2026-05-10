package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wo_id")
    private Integer woId;

    /** Originating claim (null for preventive/scheduled WOs). */
    @Column(name = "claim_id")
    private Integer claimId;

    /** Parent Work Order for follow-on work. */
    @Column(name = "parent_wo_id")
    private Integer parentWoId;

    @Column(name = "equipment_id", nullable = false)
    private Integer equipmentId;

    @Column(name = "regulatory_plan_id")
    private Integer regulatoryPlanId;

    @Enumerated(EnumType.STRING)
    @Column(name = "wo_type", nullable = false)
    private WorkOrderType woType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderStatus status;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "assigned_to_user_id")
    private Integer assignedToUserId;

    // ── Time tracking ─────────────────────────────────────────
    @Column(name = "estimated_time_hours")
    private BigDecimal estimatedTimeHours;

    @Column(name = "actual_time_hours")
    private BigDecimal actualTimeHours;

    /** Planned duration in hours (used for Gantt bar width) */
    @Column(name = "estimated_duration")
    private BigDecimal estimatedDuration;

    /** Actual measured duration recorded on completion */
    @Column(name = "actual_duration")
    private BigDecimal actualDuration;

    // ── Cost tracking ─────────────────────────────────────────
    @Column(name = "estimated_cost")
    private BigDecimal estimatedCost;

    @Column(name = "actual_cost")
    private BigDecimal actualCost;

    // ── Planning / scheduling ─────────────────────────────────
    /** Scheduled start date (for calendar/Gantt view) */
    @Column(name = "planned_start")
    private LocalDateTime plannedStart;

    /** Scheduled end date (for calendar/Gantt bar width) */
    @Column(name = "planned_end")
    private LocalDateTime plannedEnd;

    /** Date technician actually started */
    @Column(name = "actual_start")
    private LocalDateTime actualStart;

    /** Date technician actually finished */
    @Column(name = "actual_end")
    private LocalDateTime actualEnd;

    /** Deadline — overdue if past this and not completed/validated/closed */
    @Column(name = "due_date")
    private LocalDateTime dueDate;

    // ── Completion ────────────────────────────────────────────
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completion_notes")
    private String completionNotes;

    // ── Validation ────────────────────────────────────────────
    @Column(name = "validation_notes")
    private String validationNotes;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "validated_by")
    private String validatedBy;

    // ── Closure ───────────────────────────────────────────────
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by")
    private String closedBy;

    @Column(name = "cancellation_notes")
    private String cancellationNotes;

    @Builder.Default
    @Column(name = "has_critical_failure")
    private Boolean hasCriticalFailure = false;

    // ── Predictive Outcome ────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "predictive_outcome")
    private PredictiveOutcome predictiveOutcome;

    @Column(name = "predictive_outcome_notes")
    private String predictiveOutcomeNotes;

    @Column(name = "predictive_outcome_at")
    private LocalDateTime predictiveOutcomeAt;

    // ── Auditing ──────────────────────────────────────────────
    @Builder.Default
    @Column(name = "is_archived")
    private Boolean isArchived = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Enums ─────────────────────────────────────────────────

    public enum WorkOrderType {
        CORRECTIVE, PREVENTIVE, PREDICTIVE, REGULATORY
    }

    public enum WorkOrderPriority {
        CRITICAL, HIGH, MEDIUM, LOW
    }

    public enum WorkOrderStatus {
        /** Newly created, not yet assigned */
        CREATED,
        /** Assigned to a technician but not yet started */
        ASSIGNED,
        /** Assigned, with planned_start/planned_end set */
        SCHEDULED,
        /** Technician actively working */
        IN_PROGRESS,
        /** Paused (waiting for parts, access, etc.) */
        ON_HOLD,
        /** Technician marked work as done, pending validation */
        COMPLETED,
        /** Manager validated the completed work */
        VALIDATED,
        /** Fully closed and archived */
        CLOSED,
        /** Cancelled before execution */
        CANCELLED
    }

    public enum PredictiveOutcome {
        NO_ISSUE_FOUND,
        ISSUE_FOUND_RESOLVED,
        MONITORING_REQUIRED,
        UNCONFIRMED
    }
}
