package com.cmms.identity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "entity_name")
    private String entityName;

    @Column(name = "entity_id")
    private Integer entityId;

    @Column(name = "action_details", length = 1000)
    private String details;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "account_name")
    private String accountName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
