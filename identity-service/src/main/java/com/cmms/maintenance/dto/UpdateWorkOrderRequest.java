package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWorkOrderRequest {
    private String title;
    private String description;
    private String priority;
    private BigDecimal estimatedTimeHours;
    private BigDecimal estimatedDuration;
    private BigDecimal estimatedCost;
    private LocalDateTime dueDate;
    private LocalDateTime plannedStart;
    private LocalDateTime plannedEnd;
}
