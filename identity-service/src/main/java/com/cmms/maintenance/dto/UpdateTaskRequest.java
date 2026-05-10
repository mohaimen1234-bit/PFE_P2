package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTaskRequest {
    private String title;
    private String description;
    private String notes;
    private Integer assignedToUserId;
    private BigDecimal estimatedDuration;
    private BigDecimal actualDuration;
    private java.time.LocalDateTime dueDate;
    private String priority;
    private Integer orderIndex;
    private String blockedReason;
}
