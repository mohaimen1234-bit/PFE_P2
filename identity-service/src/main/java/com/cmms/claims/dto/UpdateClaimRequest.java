package com.cmms.claims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateClaimRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Priority is required")
    private String priority;

    @NotBlank(message = "Description is required")
    private String description;

    private Integer departmentId;
    private String reportedSeverity;
    private String validatedSeverity;
}
