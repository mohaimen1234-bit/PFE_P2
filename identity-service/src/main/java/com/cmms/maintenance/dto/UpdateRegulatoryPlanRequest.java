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
public class UpdateRegulatoryPlanRequest {
    private String title;
    private String description;
    private String priority;
    private String recurrenceUnit;
    private Integer recurrenceValue;
    private Integer reminderDays;
    private Integer gracePeriod;
    private Boolean isMandatory;
    private Boolean isActive;
    private String complianceReference;
    private Boolean requiresDocument;
    private String documentType;
    private Integer assignedTechnicianId;
    private BigDecimal estimatedDuration;
    private String checklistTemplate;
    private String postponementReason;
    private LocalDateTime nextDueDate;
}
