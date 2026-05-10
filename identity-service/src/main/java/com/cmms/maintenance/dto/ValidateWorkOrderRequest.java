package com.cmms.maintenance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateWorkOrderRequest {
    private String validationNotes;
    
    private String predictiveOutcome;
    private String predictiveOutcomeNotes;
}
