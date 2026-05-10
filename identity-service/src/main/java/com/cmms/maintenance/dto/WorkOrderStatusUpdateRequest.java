package com.cmms.maintenance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderStatusUpdateRequest {
    @NotBlank(message = "status is required")
    private String status;
    private String note;
    /** Manager override: close even if tasks are incomplete */
    private Boolean forceClose;
    
    private String predictiveOutcome;
    private String predictiveOutcomeNotes;
}
