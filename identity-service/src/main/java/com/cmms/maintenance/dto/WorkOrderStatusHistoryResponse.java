package com.cmms.maintenance.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderStatusHistoryResponse {
    private Long          id;
    private Integer       woId;
    private String        oldStatus;
    private String        newStatus;
    private LocalDateTime changedAt;
    private String        changedBy;
    private String        note;
}
