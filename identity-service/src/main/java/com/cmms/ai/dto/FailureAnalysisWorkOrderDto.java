package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisWorkOrderDto {
    private Integer workOrderId;
    private String workOrderCode;
    private Integer equipmentId;
    private String status;
    private String type;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private BigDecimal actualCost;
    private BigDecimal actualTimeHours;
}
