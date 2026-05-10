package com.cmms.identity.dto;

import lombok.Data;

import jakarta.validation.constraints.NotNull;

@Data
public class UserStatusRequest {

    @NotNull(message = "isActive flag is required")
    private Boolean isActive;
}
