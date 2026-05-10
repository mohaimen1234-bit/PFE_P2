package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TaskTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_id")
    private Integer templateId;

    @Column(unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "equipment_category_id")
    private Integer equipmentCategoryId;

    @Column(name = "department_id")
    private Integer departmentId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "default_priority", length = 20)
    private Task.TaskPriority defaultPriority = Task.TaskPriority.MEDIUM;

    @Column(name = "estimated_hours", precision = 10, scale = 2)
    private BigDecimal estimatedHours;

    @Column(name = "default_assignee_role", length = 50)
    private String defaultAssigneeRole;

    @Builder.Default
    @Column(name = "requires_validation")
    private Boolean requiresValidation = false;

    @Builder.Default
    @Column(name = "requires_document")
    private Boolean requiresDocument = false;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_by")
    private Integer createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
