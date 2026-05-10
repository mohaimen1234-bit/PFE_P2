package com.cmms.identity.mapper;

import com.cmms.identity.dto.RoleResponse;
import com.cmms.identity.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class RoleMapper {

    public RoleResponse toResponse(Role role) {
        if (role == null) return null;

        return RoleResponse.builder()
                .roleId(role.getRoleId())
                .roleName(role.getRoleName())
                .build();
    }
}
