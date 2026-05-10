package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_order_labor")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderLabor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "labor_id")
    private Integer laborId;

    @Column(name = "wo_id", nullable = false)
    private Integer woId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "hourly_rate")
    private BigDecimal hourlyRate;

    @Column(name = "total_cost")
    private BigDecimal totalCost;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
