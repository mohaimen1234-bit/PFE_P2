package com.cmms.maintenance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMaintenancePlanRequest {
    private Integer equipmentId;
    private String title;
    private String description;
    private String frequencyType;
    private Integer frequencyValue;
    private String nextDueDate;
    private Integer meterId;
    private java.math.BigDecimal nextMeterReading;
}
