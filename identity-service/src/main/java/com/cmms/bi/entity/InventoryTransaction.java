package com.cmms.bi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "part_id", nullable = false)
    private Integer partId;

    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // RECEPTION, CONSUMPTION, ADJUSTMENT

    @Column(name = "reference_id")
    private Integer referenceId; // e.g., RestockRequestId, WoId

    private String notes;

    @Column(name = "created_by")
    private Integer createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
