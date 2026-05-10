package com.cmms.maintenance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignWorkOrderRequest {
    @NotNull(message = "assignedToUserId is required")
    private Integer assignedToUserId;
    private java.util.List<Integer> secondaryAssigneeIds;
    private String note;
}
