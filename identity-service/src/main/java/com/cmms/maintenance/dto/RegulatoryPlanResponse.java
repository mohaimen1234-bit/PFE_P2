package com.cmms.maintenance.dto;

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
public class RegulatoryPlanResponse {
    private Integer planId;
    private String planCode;
    private String title;
    private String description;
    private Integer equipmentId;
    private String equipmentName;
    private String departmentName;
    private String priority;
    private String recurrenceUnit;
    private Integer recurrenceValue;
    private LocalDateTime startDate;
    private LocalDateTime nextDueDate;
    private LocalDateTime lastExecutionDate;
    private Integer reminderDays;
    private Integer gracePeriod;
    private Boolean isMandatory;
    private Boolean isActive;
    private String complianceReference;
    private Boolean requiresDocument;
    private String documentType;
    private Integer assignedTechnicianId;
    private String assignedTechnicianName;
    private BigDecimal estimatedDuration;
    private String checklistTemplate;
    private String postponementReason;
    private String status; // UPCOMING, DUE_SOON, OVERDUE, etc.
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
