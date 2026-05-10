package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisAffectedEquipmentDto {
    private Integer equipmentId;
    private String assetCode;
    private String name;
    private String manufacturer;
    private String model;
    private String departmentName;
    private String status;
    private String criticality;
    private int claimCount;
    private int openClaimCount;
    private int workOrderCount;
}
