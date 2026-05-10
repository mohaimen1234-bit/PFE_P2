package com.cmms.identity.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {

    private String accessToken;
    private String tokenType;
    private long expiresIn;
    private UserResponse user;
}
