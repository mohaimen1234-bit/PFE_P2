package com.cmms.claims.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ClaimAssignRequest {

    @NotNull(message = "assignedToUserId is required")
    private Integer assignedToUserId;
}
