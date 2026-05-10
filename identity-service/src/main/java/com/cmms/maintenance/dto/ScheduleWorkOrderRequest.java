package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleWorkOrderRequest {
    private LocalDateTime plannedStart;
    private LocalDateTime plannedEnd;
    private LocalDateTime dueDate;
    private BigDecimal    estimatedDuration;
}
