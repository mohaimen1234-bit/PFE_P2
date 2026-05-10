package com.cmms.claims.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ClaimQualificationRequest {

    private String priority;

    private String validatedSeverity;

    private String qualificationNotes;

    private Integer assignedToUserId;

    /** Optional due date set by manager during qualification. */
    private LocalDateTime dueDate;

    /** If true, accept the AI-suggested due date (used by prioritization flow). */
    private Boolean acceptSuggestedDueDate;

    /** Reason for overriding AI-suggested due date (used by prioritization flow). */
    private String dueDateOverrideReason;
}
