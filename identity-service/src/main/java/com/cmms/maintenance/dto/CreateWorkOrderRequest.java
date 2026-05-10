package com.cmms.maintenance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkOrderRequest {
    private Integer claimId;
    private Integer parentWoId;

    
    @NotNull(message = "Equipment ID is required")
    private Integer equipmentId;
    
    @NotBlank(message = "Work Order Type is required")
    private String woType;
    
    @NotBlank(message = "Priority is required")
    private String priority;
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    private Integer assignedToUserId;
    private java.util.List<Integer> secondaryAssigneeIds;
    private BigDecimal estimatedTimeHours;
    private BigDecimal estimatedCost;
    private LocalDateTime dueDate;
}
