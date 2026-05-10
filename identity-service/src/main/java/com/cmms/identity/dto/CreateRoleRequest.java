package com.cmms.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateRoleRequest {
    @NotBlank(message = "Role name is required")
    private String roleName;
}
