package com.cmms.identity.mapper;

import com.cmms.identity.dto.RoleResponse;
import com.cmms.identity.dto.UserResponse;
import com.cmms.identity.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        if (user == null) return null;

        return UserResponse.builder()
                .userId(user.getUserId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .roles(user.getRoles() != null ? user.getRoles().stream()
                        .map(role -> RoleResponse.builder()
                                .roleId(role.getRoleId())
                                .roleName(role.getRoleName())
                                .build())
                        .collect(java.util.stream.Collectors.toList()) : java.util.Collections.emptyList())
                .departmentId(user.getDepartment() != null ? user.getDepartment().getDepartmentId() : null)
                .departmentName(user.getDepartment() != null ? user.getDepartment().getDepartmentName() : null)
                .isActive(user.getIsActive())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
