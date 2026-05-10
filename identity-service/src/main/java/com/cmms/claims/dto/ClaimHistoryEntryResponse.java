package com.cmms.claims.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ClaimHistoryEntryResponse {
    private String type; // STATUS or AUDIT

    private Integer id;
    private Integer claimId;

    private String oldStatus;
    private String newStatus;

    private String actionType;
    private String details;

    private String performedBy;
    private LocalDateTime createdAt;
    private String note;
}
