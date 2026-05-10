package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisClaimDto {
    private Integer claimId;
    private String claimCode;
    private Integer equipmentId;
    private String equipmentName;
    private String status;
    private String priority;
    private LocalDateTime createdAt;
    private Integer linkedWorkOrderId;
}
