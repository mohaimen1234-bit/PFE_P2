package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisMetricsDto {
    private int equipmentCount;
    private int affectedEquipmentCount;
    private double affectedEquipmentRatio;
    private int claimCount;
    private int openClaimCount;
    private int highPriorityClaimCount;
    private int convertedToWorkOrderCount;
    private double claimsPerEquipment;
    private double baselineClaimsPerEquipment;
    private double baselineMultiplier;
    private int underRepairCount;
    private BigDecimal totalCost;
    private BigDecimal totalActualCost;
    private BigDecimal averageCostPerWorkOrder;
    private double groupShareOfTotalCost;
    private double costConcentrationRatio;
    private int partUsageCount;
    private int quantityUsed;
    private BigDecimal totalPartCost;
    private double underRepairRatio;
    private int criticalEquipmentUnderRepairCount;
    private double conversionRate;
    private double baselineConversionRate;
    private int openWorkOrderCount;
    
    // Task 16 fields
    private String purchaseDate;
    private String commissioningDate;
    private String warrantyEndDate;
    private Integer daysToFirstClaim;
    private Integer daysBeforeWarrantyEnd;
}
