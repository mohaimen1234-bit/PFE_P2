package com.cmms.claims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClaimStatusUpdateRequest {

    @NotBlank(message = "status is required")
    private String status;

    private String note;
}
