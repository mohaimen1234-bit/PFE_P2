package com.cmms.equipment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "equipment")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "equipment_id")
    private Integer equipmentId;

    @Column(name = "asset_code", unique = true)
    private String assetCode;

    @Column(nullable = false)
    private String name;

    @Column(name = "serial_number")
    private String serialNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EquipmentStatus status = EquipmentStatus.OPERATIONAL;

    private String location;

    @Column(name = "department_id")
    private Integer departmentId;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "model_id")
    private Integer modelId;

    private String manufacturer;

    @Column(name = "model_reference")
    private String modelReference;

    private String classification;
    private String category;
    private String model;

    @Enumerated(EnumType.STRING)
    @Column(name = "criticality")
    private EquipmentCriticality criticality;

    @Column(name = "meter_unit")
    private String meterUnit;

    @Column(name = "start_meter_value", precision = 12, scale = 2)
    private BigDecimal startMeterValue;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "commissioning_date")
    private LocalDate commissioningDate;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "contract_number")
    private String contractNumber;

    @Column(name = "warranty_end_date")
    private LocalDate warrantyEndDate;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
