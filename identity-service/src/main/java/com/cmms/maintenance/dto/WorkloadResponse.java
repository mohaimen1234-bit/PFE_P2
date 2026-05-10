package com.cmms.maintenance.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkloadResponse {
    private Integer userId;
    private String  userName;
    private Long    totalAssigned;
    private Long    created;
    private Long    assigned;
    private Long    scheduled;
    private Long    inProgress;
    private Long    onHold;
    private Long    completed;
    private Long    overdue;
    private List<WorkOrderResponse> recentItems;
}
