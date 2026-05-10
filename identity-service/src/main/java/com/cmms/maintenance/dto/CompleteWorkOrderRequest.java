package com.cmms.maintenance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteWorkOrderRequest {
    private String completionNotes;
    /** Manager override: complete even if tasks are not all DONE */
    private Boolean forceComplete;
}
