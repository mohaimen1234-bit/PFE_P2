package com.cmms.ai.dto;

import com.cmms.claims.entity.ClaimPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OverridePrioritySuggestionRequest {
    @NotNull(message = "Final priority is required for override")
    private ClaimPriority finalPriority;
    
    private LocalDateTime finalDueDate;
    
    @NotBlank(message = "Reason is required for override")
    private String reason;
}
