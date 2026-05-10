package com.cmms.inventory.entity;

import com.cmms.maintenance.entity.WorkOrder;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "part_usage")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class PartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "usage_id")
    private Integer usageId;

    @Column(name = "wo_id", nullable = false)
    private Integer woId;

    @Column(name = "task_id")
    private Integer taskId;

    @Column(name = "part_id", nullable = false)
    private Integer partId;

    @Column(name = "quantity_used", nullable = false)
    private Integer quantityUsed;

    @Column(name = "unit_cost_at_usage")
    private BigDecimal unitCostAtUsage;

    @CreatedDate
    @Column(name = "used_at", updatable = false)
    private LocalDateTime usedAt;
}
