package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderResponse {

    // ── Identity ──────────────────────────────────────────────
    private Integer woId;
    private String  woCode;        // "WO-001"
    private Integer claimId;
    private String  claimCode;     // "CLM-001" if originated from a claim
    private Integer equipmentId;
    private String  equipmentName;
    private Integer departmentId;
    private String  departmentName;
    private Integer parentWoId;
    private String  parentWoCode;
    private Integer regulatoryPlanId;

    // ── Classification ────────────────────────────────────────
    private String woType;
    private String priority;
    private String status;

    // ── Description ───────────────────────────────────────────
    private String title;
    private String description;

    // ── Assignment ────────────────────────────────────────────
    private Integer assignedToUserId;
    private String  assignedToName;
    private List<UserReference> secondaryAssignees;
    private List<UserReference> followers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserReference {
        private Integer userId;
        private String name;
    }

    // ── Time tracking ─────────────────────────────────────────
    private BigDecimal estimatedTimeHours;
    private BigDecimal actualTimeHours;
    private BigDecimal estimatedDuration;
    private BigDecimal actualDuration;

    // ── Cost tracking ─────────────────────────────────────────
    private BigDecimal estimatedCost;
    private BigDecimal actualCost;

    // ── Planning dates ────────────────────────────────────────
    private LocalDateTime plannedStart;
    private LocalDateTime plannedEnd;
    private LocalDateTime actualStart;
    private LocalDateTime actualEnd;
    private LocalDateTime dueDate;

    // ── Computed flags ────────────────────────────────────────
    /** True when dueDate is in the past and WO is not completed/validated/closed */
    private Boolean overdue;

    // ── Completion ────────────────────────────────────────────
    private LocalDateTime completedAt;
    private String        completionNotes;

    // ── Validation ────────────────────────────────────────────
    private String        validationNotes;
    private LocalDateTime validatedAt;
    private String        validatedBy;

    // ── Closure ───────────────────────────────────────────────
    private LocalDateTime closedAt;
    private String        closedBy;
    private String        cancellationNotes;

    // ── Predictive Outcome ────────────────────────────────────
    private String        predictiveOutcome;
    private String        predictiveOutcomeNotes;
    private LocalDateTime predictiveOutcomeAt;

    // ── Auditing ──────────────────────────────────────────────
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── Tasks summary ─────────────────────────────────────────
    private Long   totalTasks;
    private Long   completedTasks;
    private Boolean hasPendingAdHocTasks;
    private Boolean hasCriticalFailure;
    private List<TaskResponse> tasks;
    private List<WorkOrderLaborResponse> laborEntries;
}
