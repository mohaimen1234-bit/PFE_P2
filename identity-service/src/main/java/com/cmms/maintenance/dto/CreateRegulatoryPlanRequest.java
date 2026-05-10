package com.cmms.maintenance.dto;

import com.cmms.maintenance.entity.RecurrenceUnit;
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
public class CreateRegulatoryPlanRequest {
    private String title;
    private String description;
    private Integer equipmentId;
    private String priority; // WorkOrderPriority
    private String recurrenceUnit; // RecurrenceUnit
    private Integer recurrenceValue;
    private LocalDateTime startDate;
    private Integer reminderDays;
    private Integer gracePeriod;
    private Boolean isMandatory;
    private String complianceReference;
    private Boolean requiresDocument;
    private String documentType;
    private Integer assignedTechnicianId;
    private BigDecimal estimatedDuration;
    private String checklistTemplate; // JSON
}
