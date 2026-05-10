package com.cmms.identity.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {
    public static final String ADMIN = "ADMIN";
    public static final String MAINTENANCE_MANAGER = "MAINTENANCE_MANAGER";
    public static final String TECHNICIAN = "TECHNICIAN";
    public static final String FINANCE_MANAGER = "FINANCE_MANAGER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Integer roleId;

    @Column(name = "role_name", nullable = false, unique = true, length = 50)
    private String roleName;
}
