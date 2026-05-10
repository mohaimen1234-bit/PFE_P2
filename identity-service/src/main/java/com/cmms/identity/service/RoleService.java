package com.cmms.identity.service;

import com.cmms.identity.dto.RoleResponse;
import com.cmms.identity.mapper.RoleMapper;
import com.cmms.identity.repository.RoleRepository;
import com.cmms.identity.entity.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
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
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(roleMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoleResponse createRole(com.cmms.identity.dto.CreateRoleRequest request) {
        String roleName = request.getRoleName().trim();

        if (roleRepository.existsByRoleNameIgnoreCase(roleName)) {
            throw new com.cmms.identity.exception.ConflictException("Role already exists: " + roleName);
        }

        Role role = new Role();
        role.setRoleName(roleName);

        Role savedRole = roleRepository.save(role);

        // Log audit
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                "CREATE_ROLE",
                "Role",
                savedRole.getRoleId(),
                "Created role: " + savedRole.getRoleName()
        );

        return roleMapper.toResponse(savedRole);
    }

    @Transactional
    public void deleteRole(Integer roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new com.cmms.identity.exception.ResourceNotFoundException("Role not found with id: " + roleId));

        if (userRepository.existsByRoles_RoleId(roleId)) {
            throw new com.cmms.identity.exception.ConflictException("Cannot delete role because it is currently assigned to users.");
        }

        roleRepository.delete(role);

        // Log audit (Security Action)
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                "DELETE_ROLE",
                "Role",
                roleId,
                "Deleted role: " + role.getRoleName()
        );
    }
}
