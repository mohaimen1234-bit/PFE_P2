package com.cmms.claims.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ClaimResponse {
    private Integer claimId;
    private String  claimCode;

    private String title;
    private String description;

    private Integer equipmentId;
    private String  equipmentName;

    private String priority;
    private String priorityLabel;

    private String reportedSeverity;
    private String validatedSeverity;

    private String status;
    private String statusLabel;

    private Integer requesterId;
    private String  requesterName;

    private Integer assignedToUserId;
    private String  assignedToName;

    private Integer departmentId;
    private String  departmentName;

    private String qualificationNotes;
    private String rejectionNotes;

    /** Work Order created from this claim (set after conversion) */
    private Integer linkedWoId;
    private String  linkedWoCode;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime dueDate;

    private Long                  photoCount;
    private List<ClaimPhotoResponse> photos;
}
