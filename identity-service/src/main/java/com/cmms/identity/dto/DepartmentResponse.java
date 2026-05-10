package com.cmms.identity.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DepartmentResponse {

    private Integer departmentId;
    private String departmentName;
}
