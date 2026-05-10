package com.cmms.identity.service;

import com.cmms.identity.dto.DepartmentResponse;
import com.cmms.identity.mapper.DepartmentMapper;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.identity.entity.Department;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DepartmentMapper departmentMapper;
    private final com.cmms.identity.repository.UserRepository userRepository;
    private final AuditLogService auditLogService;

    private String getCurrentAuditorName() {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "SYSTEM";
        }
        return authentication.getName();
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(departmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public DepartmentResponse createDepartment(com.cmms.identity.dto.CreateDepartmentRequest request) {
        String departmentName = request.getDepartmentName().trim();

        if (departmentRepository.existsByDepartmentNameIgnoreCase(departmentName)) {
            throw new com.cmms.identity.exception.ConflictException("Department already exists: " + departmentName);
        }

        Department department = new Department();
        department.setDepartmentName(departmentName);

        Department savedDept = departmentRepository.save(department);

        // Log audit
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                "CREATE_DEPT",
                "Department",
                savedDept.getDepartmentId(),
                "Created department: " + savedDept.getDepartmentName()
        );

        return departmentMapper.toResponse(savedDept);
    }

    @Transactional
    public void deleteDepartment(Integer departmentId) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new com.cmms.identity.exception.ResourceNotFoundException("Department not found with id: " + departmentId));

        if (userRepository.existsByDepartment_DepartmentId(departmentId)) {
            throw new com.cmms.identity.exception.ConflictException("Cannot delete department because it is currently assigned to users.");
        }

        departmentRepository.delete(department);

        // Log audit
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                "DELETE_DEPT",
                "Department",
                departmentId,
                "Deleted department: " + department.getDepartmentName()
        );
    }
}
