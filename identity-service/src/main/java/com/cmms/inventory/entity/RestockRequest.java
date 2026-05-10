package com.cmms.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "restock_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class RestockRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Integer requestId;

    @Column(name = "part_id", nullable = false)
    private Integer partId;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "requested_by", nullable = false)
    private Integer requestedBy;

    @Column(name = "reviewed_by")
    private Integer reviewedBy;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RestockStatus status = RestockStatus.PENDING;

    private String notes;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    public enum RestockStatus {
        PENDING, APPROVED, REJECTED, COMPLETED
    }
}
