package com.cmms.bi.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    // Top KPI cards
    private long totalEquipment;
    private long activeWorkOrders;
    private long pendingClaims;
    private long criticalAlerts;

    // Secondary KPI metrics
    private Double mtbfHours;        // Mean Time Between Failures
    private Double mttrHours;        // Mean Time To Repair
    private Double availabilityRate; // % (e.g. 98.5)

    // Maintenance distribution (by WO type %)
    private double preventivePct;
    private double correctivePct;
    private double regulatoryPct;
    private double predictivePct;

    // Financial / inventory
    private long lowStockParts;
    private long pendingRestocks;
    private long machinesDown;
    private BigDecimal monthlySpend;
    private Double reliabilityScore;
}
