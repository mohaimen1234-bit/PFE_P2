package com.cmms.bi.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiResponse {
    private long totalWorkOrders;
    private long activeWorkOrders;
    private long pendingClaims;
    private long lowStockParts;
    private BigDecimal totalMaintenanceCost;
    private double mtbf; // Mean Time Between Failures
    private double mttr; // Mean Time To Repair
    private Map<String, Long> woByStatus;
    private Map<String, Long> woByType;
    private Map<String, BigDecimal> costByDepartment;
    private Map<String, BigDecimal> costByCategory; // Equipment Type breakdown
    
    // MoM Trends (Percentage change)
    private Double costTrend;
    private Double mtbfTrend;
    private Double mttrTrend;
    
    // New KPIs for Module 9
    private double availabilityRate; // Taux disponibilité
    private double correctivePreventiveRatio; // Ratio correctif/préventif
    private Map<String, BigDecimal> maintenanceCostPerEquipment; // Coût maintenance / équipement
    private Map<String, BigDecimal> maintenanceCostPerDepartment; // Coût maintenance / service
    
    // Visualizations Data
    private Map<String, BigDecimal> paretoData; // Diagramme Pareto
    private Map<String, BigDecimal> annualProjection; // Projection annuelle
    private Map<String, BigDecimal> monthlyCostTrends; // Courbes évolution (Costs)
    private Map<String, Map<String, Long>> monthlyWorkOrderTrends; // Courbes évolution (WOs)
    
    // Additional Financial/Biomedical
    private double complianceRate;
    private double equipmentRoi;
    private BigDecimal ytdBudget;
    private BigDecimal costAvoidance;
    private long expectedLifeSpanScore;

    // Detailed costly equipments
    private List<EquipmentCostDetail> costlyEquipments;

    // Detailed recent work orders
    private List<RecentWorkOrderDetail> recentWorkOrders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentWorkOrderDetail {
        private String equipmentName;
        private String woCode;
        private String type;
        private String status;
        private String date;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EquipmentCostDetail {
        private String name;
        private String category;
        private String department;
        private BigDecimal totalCost;
        private double percentageOfTotal;
    }
}
