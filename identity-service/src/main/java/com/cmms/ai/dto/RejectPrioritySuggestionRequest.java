package com.cmms.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectPrioritySuggestionRequest {
    @NotBlank(message = "Reason is required for rejection")
    private String reason;
}
