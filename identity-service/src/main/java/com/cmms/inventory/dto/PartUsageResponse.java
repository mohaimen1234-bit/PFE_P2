package com.cmms.inventory.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartUsageResponse {
    private Integer usageId;
    private Integer woId;
    private Integer taskId;
    private Integer partId;
    private String partName;
    private Integer quantityUsed;
    private BigDecimal unitCostAtUsage;
    private LocalDateTime usedAt;
}
