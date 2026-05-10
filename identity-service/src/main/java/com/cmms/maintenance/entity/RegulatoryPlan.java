package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "regulatory_plans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class RegulatoryPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Integer planId;

    @Column(name = "plan_code", unique = true, nullable = true)
    private String planCode;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "equipment_id", nullable = false)
    private Integer equipmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrder.WorkOrderPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_unit", nullable = false)
    private RecurrenceUnit recurrenceUnit;

    @Column(name = "recurrence_value", nullable = false)
    private Integer recurrenceValue;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "next_due_date", nullable = false)
    private LocalDateTime nextDueDate;

    @Column(name = "last_execution_date")
    private LocalDateTime lastExecutionDate;

    @Column(name = "reminder_days")
    private Integer reminderDays;

    @Column(name = "grace_period")
    private Integer gracePeriod;

    @Column(name = "is_mandatory")
    private Boolean isMandatory;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "compliance_reference")
    private String complianceReference;

    @Column(name = "requires_document")
    private Boolean requiresDocument;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "assigned_technician_id")
    private Integer assignedTechnicianId;

    @Column(name = "estimated_duration")
    private BigDecimal estimatedDuration;

    @Column(name = "checklist_template", columnDefinition = "TEXT")
    private String checklistTemplate; // JSON string

    @Column(name = "postponement_reason")
    private String postponementReason;

    // Auditing
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by")
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;
}
