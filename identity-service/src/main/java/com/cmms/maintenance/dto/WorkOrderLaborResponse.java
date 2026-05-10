package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderLaborResponse {
    private Integer laborId;
    private Integer woId;
    private Integer userId;
    private String  userName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer durationMinutes;
    private BigDecimal hourlyRate;
    private BigDecimal totalCost;
    private String notes;
    private LocalDateTime createdAt;
}
