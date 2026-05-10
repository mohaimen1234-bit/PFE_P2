package com.cmms.claims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateClaimRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotNull(message = "Equipment ID is required")
    private Integer equipmentId;

    private Integer departmentId;


    private String priority;

    private String reportedSeverity;

    @NotBlank(message = "Description is required")
    private String description;
}
