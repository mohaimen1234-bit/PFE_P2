package com.cmms.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "spare_parts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class SparePart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "part_id")
    private Integer partId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String sku;

    private String category;

    @Builder.Default
    @Column(name = "quantity_in_stock", nullable = false)
    private Integer quantityInStock = 0;

    @Builder.Default
    @Column(name = "min_stock_level", nullable = false)
    private Integer minStockLevel = 0;

    @Column(name = "unit_cost")
    private BigDecimal unitCost;

    private String location;

    private String supplier;

    @Column(name = "batch_number")
    private String batchNumber;

    @Column(name = "expiry_date")
    private java.time.LocalDate expiryDate;

    @ManyToMany
    @JoinTable(
        name = "model_spare_parts",
        joinColumns = @JoinColumn(name = "part_id"),
        inverseJoinColumns = @JoinColumn(name = "model_id")
    )
    private java.util.Set<com.cmms.equipment.entity.EquipmentModel> compatibleModels;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_archived")
    private Boolean isArchived = false;
}
