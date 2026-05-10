package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_order_status_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wo_id", nullable = false)
    private Integer woId;

    @Column(name = "old_status", length = 30)
    private String oldStatus;

    @Column(name = "new_status", nullable = false, length = 30)
    private String newStatus;

    @Builder.Default
    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    @Column(name = "changed_by", length = 255)
    private String changedBy;

    @Column(name = "note")
    private String note;
}
