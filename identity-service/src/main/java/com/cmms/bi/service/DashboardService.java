package com.cmms.bi.service;

import com.cmms.bi.dto.DashboardActivityItem;
import com.cmms.bi.dto.DashboardStatsResponse;


import com.cmms.claims.repository.ClaimRepository;
import com.cmms.equipment.entity.EquipmentStatus;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.inventory.repository.RestockRequestRepository;
import com.cmms.inventory.repository.SparePartRepository;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.maintenance.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WorkOrderRepository workOrderRepository;
    private final ClaimRepository claimRepository;
    private final SparePartRepository sparePartRepository;
    private final RestockRequestRepository restockRepository;
    private final EquipmentRepository equipmentRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;
    private final KpiService kpiService;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        var kpis = kpiService.getKpis();

        // --- Equipment counts ---
        long totalEquipment = equipmentRepository.count();
        long machinesDown   = equipmentRepository.countByStatus(EquipmentStatus.UNDER_REPAIR);
        long pendingRestocks = restockRepository.countByStatus(com.cmms.inventory.entity.RestockRequest.RestockStatus.PENDING);

        // --- Critical Alerts = CRITICAL priority WOs that are not yet completed ---
        List<WorkOrder> allWos = workOrderRepository.findAll();
        long criticalAlerts = allWos.stream()
                .filter(wo -> wo.getPriority() == WorkOrder.WorkOrderPriority.CRITICAL
                        && wo.getStatus() != WorkOrder.WorkOrderStatus.COMPLETED
                        && wo.getStatus() != WorkOrder.WorkOrderStatus.VALIDATED
                        && wo.getStatus() != WorkOrder.WorkOrderStatus.CLOSED
                        && wo.getStatus() != WorkOrder.WorkOrderStatus.CANCELLED)
                .count();

        // --- Maintenance Distribution by WO type (last 12 months) ---
        long totalWoCount = kpis.getWoByType().values().stream().mapToLong(Long::longValue).sum();
        double preventivePct  = totalWoCount == 0 ? 0 : (kpis.getWoByType().getOrDefault("PREVENTIVE",  0L) * 100.0 / totalWoCount);
        double correctivePct  = totalWoCount == 0 ? 0 : (kpis.getWoByType().getOrDefault("CORRECTIVE",  0L) * 100.0 / totalWoCount);
        double regulatoryPct  = totalWoCount == 0 ? 0 : (kpis.getWoByType().getOrDefault("REGULATORY",  0L) * 100.0 / totalWoCount);
        double predictivePct  = totalWoCount == 0 ? 0 : (kpis.getWoByType().getOrDefault("PREDICTIVE",  0L) * 100.0 / totalWoCount);

        // --- Availability rate: (totalEquipment - machinesDown) / totalEquipment * 100 ---
        double availabilityRate = totalEquipment == 0 ? 100.0
                : ((double)(totalEquipment - machinesDown) / totalEquipment) * 100.0;

        return DashboardStatsResponse.builder()
                .totalEquipment(totalEquipment)
                .activeWorkOrders(kpis.getActiveWorkOrders())
                .pendingClaims(kpis.getPendingClaims())
                .criticalAlerts(criticalAlerts)
                .mtbfHours(kpis.getMtbf())
                .mttrHours(kpis.getMttr())
                .availabilityRate(availabilityRate)
                .preventivePct(preventivePct)
                .correctivePct(correctivePct)
                .regulatoryPct(regulatoryPct)
                .predictivePct(predictivePct)
                .lowStockParts(kpis.getLowStockParts())
                .pendingRestocks(pendingRestocks)
                .machinesDown(machinesDown)
                .monthlySpend(kpis.getTotalMaintenanceCost())
                .reliabilityScore(availabilityRate)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DashboardActivityItem> getRecentActivity() {
        List<DashboardActivityItem> feed = new ArrayList<>();

        // 1. Core WO Status Changes (Major milestones)
        historyRepository.findAll().stream()
                .filter(h -> h.getNewStatus().equals("IN_PROGRESS") || h.getNewStatus().equals("COMPLETED") || h.getNewStatus().equals("CLOSED"))
                .limit(15)
                .forEach(h -> feed.add(DashboardActivityItem.builder()
                        .id("WO-HIST-" + h.getId())
                        .type("WO_STATUS")
                        .title("Work Order Updated")
                        .description("WO #" + h.getWoId() + " moved to " + h.getNewStatus())
                        .actor(h.getChangedBy())
                        .timestamp(h.getChangedAt())
                        .referenceId(h.getWoId().toString())
                        .build()));

        // 2. New Claims
        claimRepository.findAll().stream()
                .sorted(Comparator.comparing(com.cmms.claims.entity.Claim::getCreatedAt).reversed())
                .limit(10)
                .forEach(c -> feed.add(DashboardActivityItem.builder()
                        .id("CLM-" + c.getClaimId())
                        .type("CLAIM_NEW")
                        .title("New Equipment Fault")
                        .description("Claim #" + c.getClaimId() + ": " + c.getDescription())
                        .actor("User #" + c.getRequesterId())
                        .timestamp(c.getCreatedAt())
                        .referenceId(c.getClaimId().toString())
                        .build()));

        // 3. Inventory Restocks
        restockRepository.findAll().stream()
                .filter(r -> r.getStatus() == com.cmms.inventory.entity.RestockRequest.RestockStatus.APPROVED)
                .limit(5)
                .forEach(r -> feed.add(DashboardActivityItem.builder()
                        .id("STK-" + r.getRequestId())
                        .type("RESTOCK_APPROVED")
                        .title("Inventory Replenished")
                        .description("Restock of Part #" + r.getPartId() + " approved")
                        .actor("Manager")
                        .timestamp(r.getReviewedAt() != null ? r.getReviewedAt() : r.getCreatedAt())
                        .referenceId(r.getPartId().toString())
                        .build()));

        return feed.stream()
                .sorted(Comparator.comparing(DashboardActivityItem::getTimestamp).reversed())
                .limit(20)
                .collect(Collectors.toList());
    }
}
