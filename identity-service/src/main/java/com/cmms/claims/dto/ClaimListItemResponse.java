package com.cmms.claims.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ClaimListItemResponse {
    private Integer claimId;
    private String claimCode;

    private String title;
    private String description;

    private Integer equipmentId;
    private String equipmentName;

    private String priority;
    private String priorityLabel;

    private String reportedSeverity;
    private String validatedSeverity;

    private String status;
    private String statusLabel;

    private Integer requesterId;
    private String requesterName;

    private Integer assignedToUserId;
    private String assignedToName;

    private Integer departmentId;
    private String departmentName;


    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
    private LocalDateTime dueDate;

    private Long photoCount;
}
