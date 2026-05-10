package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "task_template_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskTemplateItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "template_id", nullable = false)
    private Integer templateId;

    @Column(nullable = false, length = 255)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Builder.Default
    @Column(name = "is_required")
    private Boolean isRequired = true;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;
}
