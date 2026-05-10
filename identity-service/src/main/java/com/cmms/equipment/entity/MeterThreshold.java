package com.cmms.equipment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "meter_thresholds")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeterThreshold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "meter_id", nullable = false)
    private Integer meterId;

    @Column(name = "threshold_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal thresholdValue;

    @Column(name = "label")
    private String label;

    @Column(name = "threshold_type")
    @Builder.Default
    private String thresholdType = "CRITICAL";

    @Column(name = "auto_recommend")
    @Builder.Default
    private Boolean autoRecommend = true;

    @Column(name = "current_value", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal currentValue = BigDecimal.ZERO;

    @Column(name = "last_reset_at")
    private java.time.LocalDateTime lastResetAt;
}
