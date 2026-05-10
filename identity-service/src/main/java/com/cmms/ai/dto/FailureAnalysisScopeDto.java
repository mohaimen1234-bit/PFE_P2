package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisScopeDto {
    private Integer departmentId;
    private String departmentName;
    private String manufacturer;
    private String model;
    private String category;
    private String supplier;
}
