package com.cmms.bi.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardActivityItem {
    private String id;
    private String type; // WO_STATUS, CLAIM_NEW, RESTOCK_APPROVED
    private String title;
    private String description;
    private String actor;
    private LocalDateTime timestamp;
    private String referenceId;
}
