package com.cmms.ai.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FailurePatternDecisionRequest {
    private String reason;
    private String note;
}
