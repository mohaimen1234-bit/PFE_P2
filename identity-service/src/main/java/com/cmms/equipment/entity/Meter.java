package com.cmms.equipment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "meters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Meter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "meter_id")
    private Integer meterId;

    @Column(name = "equipment_id", nullable = false)
    private Integer equipmentId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal value; // Current reading

    @Column(name = "name")
    private String name;

    @Column(name = "unit")
    private String unit; // e.g., km, hours, °C

    @Column(name = "meter_type")
    private String meterType; // e.g., ODOMETER, TEMPERATURE

    @Column(name = "last_reading_at")
    private java.time.LocalDateTime lastReadingAt;
}
