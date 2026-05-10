package com.cmms.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(max = 150, message = "Full name must not exceed 150 characters")
    private String fullName;

    @Email(message = "Email must be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 30, message = "Phone number must not exceed 30 characters")
    private String phoneNumber;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private java.util.List<Integer> roleIds;

    private Integer departmentId;
}
