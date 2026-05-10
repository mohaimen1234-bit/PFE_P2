package com.cmms.maintenance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaskRequest {
    @NotNull(message = "woId is required")
    private Integer woId;

    @NotBlank(message = "description is required")
    private String description;

    private String title;
    private Integer assignedToUserId;
    private Integer parentTaskId;
    private Integer templateId;
    private BigDecimal estimatedDuration;
    private java.time.LocalDateTime dueDate;
    private String priority;
    private Integer orderIndex;
}
