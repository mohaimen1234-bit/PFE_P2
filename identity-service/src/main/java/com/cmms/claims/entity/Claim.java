package com.cmms.claims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "claim_id")
    private Integer claimId;

    @Column(name = "requester_id")
    private Integer requesterId;

    @Column(name = "equipment_id")
    private Integer equipmentId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    private ClaimPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "reported_severity", length = 50)
    private ClaimSeverity reportedSeverity;

    @Enumerated(EnumType.STRING)
    @Column(name = "validated_severity", length = 50)
    private ClaimSeverity validatedSeverity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private ClaimStatus status;

    @Column(name = "assigned_to_user_id")
    private Integer assignedToUserId;

    @Column(name = "department_id")
    private Integer departmentId;

    @Column(name = "qualification_notes")
    private String qualificationNotes;

    @Column(name = "rejection_notes")
    private String rejectionNotes;

    /** ID of the Work Order created from this claim (set on conversion). */
    @Column(name = "linked_wo_id")
    private Integer linkedWoId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "due_date")
    private LocalDateTime dueDate;
}
