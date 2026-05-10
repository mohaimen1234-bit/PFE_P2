package com.cmms.identity.mapper;

import com.cmms.identity.dto.DepartmentResponse;
import com.cmms.identity.entity.Department;
import org.springframework.stereotype.Component;

@Component
public class DepartmentMapper {

    public DepartmentResponse toResponse(Department department) {
        if (department == null) return null;

        return DepartmentResponse.builder()
                .departmentId(department.getDepartmentId())
                .departmentName(department.getDepartmentName())
                .build();
    }
}
