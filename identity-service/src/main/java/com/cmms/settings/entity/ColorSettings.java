package com.cmms.settings.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "color_settings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"category", "itemKey", "scope", "siteId"})
})
@Data
public class ColorSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category; // STATUS, NOTIFICATION, MAINTENANCE_TYPE, WIDGET

    @Column(nullable = false)
    private String itemKey; // e.g. SCHEDULED, PREVENTIVE

    @Column(nullable = false)
    private String scope = "GLOBAL"; // GLOBAL, GANTT, BADGE, etc.

    @Column(nullable = false)
    private String colorHex;

    @Column(nullable = false)
    private String textColorHex;

    @Column(nullable = false)
    private String defaultColorHex;

    @Column(nullable = false)
    private String defaultTextColorHex;

    @Column(nullable = false)
    private boolean isSystemDefault = true;

    @Column(nullable = false)
    private boolean active = true;

    private Integer sortOrder = 0;

    private Long siteId; // Nullable for global settings

    private String updatedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

}
