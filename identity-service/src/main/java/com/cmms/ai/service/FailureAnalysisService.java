package com.cmms.ai.service;

import com.cmms.ai.dto.*;
import com.cmms.ai.entity.FailureAnalysisSeverity;
import com.cmms.ai.entity.FailureAnalysisType;
import com.cmms.claims.entity.ClaimStatus;
import com.cmms.claims.entity.ClaimPriority;
import com.cmms.equipment.entity.EquipmentCriticality;
import com.cmms.claims.entity.Claim;
import com.cmms.claims.repository.ClaimRepository;
import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.identity.entity.Department;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.inventory.repository.PartUsageRepository;
import com.cmms.inventory.repository.SparePartRepository;
import com.cmms.inventory.entity.PartUsage;
import com.cmms.inventory.entity.SparePart;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FailureAnalysisService {

    private final ClaimRepository claimRepository;
    private final EquipmentRepository equipmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final DepartmentRepository departmentRepository;
    private final PartUsageRepository partUsageRepository;
    private final SparePartRepository sparePartRepository;

    // Internal constants (not exposed to UI)
    private static final double MEDIUM_MULTIPLIER = 2.0;
    private static final double HIGH_MULTIPLIER = 3.0;
    private static final double CRITICAL_MULTIPLIER = 4.0;
    
    private static final int EARLY_LIFE_DAYS = 180;
    private static final int WARRANTY_WINDOW_DAYS = 30;

    /**
     * Generates a list of failure analysis reports based on the given parameters.
     */
    public List<FailureAnalysisReportSummaryDto> generateReports(
            String fromDate,
            String toDate,
            Integer analysisPeriodDays,
            Integer departmentId,
            String severityFilter,
            Integer minClaims,
            Integer minAffectedEquipment) {

        log.info("Generating failure analysis reports...");
        
        FailureAnalysisPeriodDto period = resolvePeriod(fromDate, toDate, analysisPeriodDays);
        
        List<FailureAnalysisReportDetailDto> allDetails = new ArrayList<>();
        
        allDetails.addAll(detectManufacturerDepartmentConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectDepartmentAbnormalClaimRate(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectCriticalEquipmentClaimCluster(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectOpenClaimAccumulation(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectModelDepartmentConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectCategoryConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectSupplierConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectHighWorkOrderConversion(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectUnderRepairAvailabilityRisk(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectMaintenanceCostConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectSparePartUsageConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectEarlyLifeEquipmentClaims(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectWarrantyPeriodClaims(period, minClaims, minAffectedEquipment));
        
        // Map to summaries and filter
        return allDetails.stream()
                .filter(r -> departmentId == null || r.getScope().getDepartmentId().equals(departmentId))
                .filter(r -> severityFilter == null || severityFilter.equalsIgnoreCase("ALL") || r.getSeverity().equalsIgnoreCase(severityFilter))
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    /**
     * Gets detailed evidence for a specific failure analysis report.
     */
    public FailureAnalysisReportDetailDto getReportDetail(
            String reportId,
            String fromDate,
            String toDate,
            Integer analysisPeriodDays,
            Integer departmentId,
            String severityFilter,
            Integer minClaims,
            Integer minAffectedEquipment) {

        log.info("Getting failure analysis report detail for ID: {}", reportId);
        
        FailureAnalysisPeriodDto period = resolvePeriod(fromDate, toDate, analysisPeriodDays);
        
        List<FailureAnalysisReportDetailDto> allDetails = new ArrayList<>();
        allDetails.addAll(detectManufacturerDepartmentConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectDepartmentAbnormalClaimRate(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectCriticalEquipmentClaimCluster(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectOpenClaimAccumulation(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectModelDepartmentConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectCategoryConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectSupplierConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectHighWorkOrderConversion(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectUnderRepairAvailabilityRisk(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectMaintenanceCostConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectSparePartUsageConcentration(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectEarlyLifeEquipmentClaims(period, minClaims, minAffectedEquipment));
        allDetails.addAll(detectWarrantyPeriodClaims(period, minClaims, minAffectedEquipment));
        
        return allDetails.stream()
                .filter(r -> r.getId().equals(reportId))
                .findFirst()
                .orElse(null);
    }

    // ── Mappers ─────────────────────────────────────────────────────────

    private FailureAnalysisReportSummaryDto mapToSummary(FailureAnalysisReportDetailDto detail) {
        String scopeLabel = detail.getScope().getDepartmentName() + 
                (detail.getScope().getManufacturer() != null ? " + " + detail.getScope().getManufacturer() : "");
                
        return FailureAnalysisReportSummaryDto.builder()
                .id(detail.getId())
                .type(detail.getType())
                .title(detail.getTitle())
                .severity(detail.getSeverity())
                .scopeLabel(scopeLabel)
                .mainFinding(detail.getSummary().getMainFinding())
                .claimCount(detail.getMetrics().getClaimCount())
                .affectedEquipmentCount(detail.getMetrics().getAffectedEquipmentCount())
                .equipmentCount(detail.getMetrics().getEquipmentCount())
                .baselineMultiplier(detail.getMetrics().getBaselineMultiplier())
                .generatedAt(detail.getSummary().getGeneratedAt())
                .build();
    }

    // ── Detectors ─────────────────────────────────────────────────────────

    private List<FailureAnalysisReportDetailDto> detectManufacturerDepartmentConcentration(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        Map<Integer, Integer> deptEqCount = new HashMap<>();
        Map<Integer, Integer> deptClaimCount = new HashMap<>();
        for (Equipment eq : allEquipment) {
            if (eq.getDepartmentId() != null) {
                deptEqCount.put(eq.getDepartmentId(), deptEqCount.getOrDefault(eq.getDepartmentId(), 0) + 1);
                int claims = claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).size();
                deptClaimCount.put(eq.getDepartmentId(), deptClaimCount.getOrDefault(eq.getDepartmentId(), 0) + claims);
            }
        }

        Map<Integer, Map<String, List<Equipment>>> groupedEq = new HashMap<>();
        for (Equipment eq : allEquipment) {
            if (eq.getDepartmentId() != null && eq.getManufacturer() != null && !eq.getManufacturer().trim().isEmpty()) {
                groupedEq.computeIfAbsent(eq.getDepartmentId(), k -> new HashMap<>())
                        .computeIfAbsent(eq.getManufacturer().trim(), k -> new ArrayList<>())
                        .add(eq);
            }
        }

        for (Map.Entry<Integer, Map<String, List<Equipment>>> deptEntry : groupedEq.entrySet()) {
            Integer deptId = deptEntry.getKey();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            double deptBaseline = safeDivide(deptClaimCount.getOrDefault(deptId, 0), deptEqCount.getOrDefault(deptId, 1));

            for (Map.Entry<String, List<Equipment>> mfgEntry : deptEntry.getValue().entrySet()) {
                String mfg = mfgEntry.getKey();
                List<Equipment> groupEqs = mfgEntry.getValue();

                int groupClaimCount = 0;
                int groupOpenClaimCount = 0;
                int groupHighPriorityClaimCount = 0;
                int groupConvertedWoCount = 0;
                List<Equipment> affectedEqs = new ArrayList<>();
                List<Claim> groupClaimsList = new ArrayList<>();
                boolean hasCriticalInvolved = false;

                for (Equipment eq : groupEqs) {
                    List<Claim> eqClaims = claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>());
                    if (!eqClaims.isEmpty()) {
                        affectedEqs.add(eq);
                        groupClaimsList.addAll(eqClaims);
                        groupClaimCount += eqClaims.size();
                        
                        if (isCriticalEquipment(eq.getCriticality() != null ? eq.getCriticality().name() : null)) {
                            hasCriticalInvolved = true;
                        }
                        
                        for (Claim c : eqClaims) {
                            if (isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)) groupOpenClaimCount++;
                            if (isHighPriorityClaim(c.getPriority() != null ? c.getPriority().name() : null)) groupHighPriorityClaimCount++;
                            if (c.getLinkedWoId() != null) groupConvertedWoCount++;
                        }
                    }
                }

                if (groupClaimCount >= minClaims && affectedEqs.size() >= minAffectedEquipment) {
                    double claimsPerEq = safeDivide(groupClaimCount, groupEqs.size());
                    double baselineMultiplier = calculateBaselineMultiplier(claimsPerEq, deptBaseline);
                    double affectedRatio = safeDivide(affectedEqs.size(), groupEqs.size());
                    boolean hasSignificantOpen = safeDivide(groupOpenClaimCount, groupClaimCount) > 0.3;

                    FailureAnalysisSeverity severity = calculateSeverity(
                            baselineMultiplier, affectedRatio, hasSignificantOpen, hasCriticalInvolved);

                    String reportId = buildDeterministicReportId(
                            FailureAnalysisType.MANUFACTURER_DEPARTMENT_CONCENTRATION, 
                            deptId + "_" + mfg, 
                            period.getDays()
                    );
                    
                    String mainFinding = String.format("%d of %d %s equipment in %s had claims in the last %d days.",
                            affectedEqs.size(), groupEqs.size(), mfg, dept.getDepartmentName(), period.getDays());
                            
                    String businessSignal = "Claims are concentrated around one manufacturer inside one department, which may indicate operational, procurement, warranty, or supplier-related risk.";

                    FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                            .equipmentCount(groupEqs.size())
                            .affectedEquipmentCount(affectedEqs.size())
                            .affectedEquipmentRatio(affectedRatio)
                            .claimCount(groupClaimCount)
                            .openClaimCount(groupOpenClaimCount)
                            .highPriorityClaimCount(groupHighPriorityClaimCount)
                            .convertedToWorkOrderCount(groupConvertedWoCount)
                            .claimsPerEquipment(claimsPerEq)
                            .baselineClaimsPerEquipment(deptBaseline)
                            .baselineMultiplier(baselineMultiplier)
                            .build();
                            
                    List<FailureAnalysisAffectedEquipmentDto> affectedDtos = affectedEqs.stream().map(e -> {
                        List<Claim> cList = claimsByEq.getOrDefault(e.getEquipmentId(), new ArrayList<>());
                        int openCount = (int) cList.stream().filter(c -> isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)).count();
                        return FailureAnalysisAffectedEquipmentDto.builder()
                                .equipmentId(e.getEquipmentId())
                                .assetCode(e.getAssetCode())
                                .name(e.getName())
                                .manufacturer(e.getManufacturer())
                                .model(e.getModel())
                                .departmentName(dept.getDepartmentName())
                                .status(e.getStatus() != null ? e.getStatus().name() : null)
                                .criticality(e.getCriticality() != null ? e.getCriticality().name() : null)
                                .claimCount(cList.size())
                                .openClaimCount(openCount)
                                .workOrderCount((int) cList.stream().filter(c -> c.getLinkedWoId() != null).count())
                                .build();
                    }).collect(Collectors.toList());
                    
                    List<FailureAnalysisClaimDto> claimDtos = groupClaimsList.stream().map(c -> {
                        Equipment e = allEquipment.stream().filter(eq -> eq.getEquipmentId().equals(c.getEquipmentId())).findFirst().orElse(null);
                        return FailureAnalysisClaimDto.builder()
                                .claimId(c.getClaimId())
                                .claimCode("CLM-" + c.getClaimId())
                                .equipmentId(c.getEquipmentId())
                                .equipmentName(e != null ? e.getName() : "Unknown")
                                .status(c.getStatus() != null ? c.getStatus().name() : null)
                                .priority(c.getPriority() != null ? c.getPriority().name() : null)
                                .createdAt(c.getCreatedAt())
                                .linkedWorkOrderId(c.getLinkedWoId())
                                .build();
                    }).collect(Collectors.toList());
                    
                    List<Integer> linkedWoIds = groupClaimsList.stream()
                            .map(Claim::getLinkedWoId)
                            .filter(id -> id != null)
                            .collect(Collectors.toList());
                            
                    List<FailureAnalysisWorkOrderDto> woDtos = new ArrayList<>();
                    if (!linkedWoIds.isEmpty()) {
                        woDtos = workOrderRepository.findAllById(linkedWoIds).stream().map(w -> 
                            FailureAnalysisWorkOrderDto.builder()
                                .workOrderId(w.getWoId())
                                .workOrderCode("WO-" + w.getWoId())
                                .equipmentId(w.getEquipmentId())
                                .status(w.getStatus() != null ? w.getStatus().name() : null)
                                .type(w.getWoType() != null ? w.getWoType().name() : null)
                                .createdAt(w.getCreatedAt())
                                .completedAt(w.getCompletedAt())
                                .actualCost(w.getActualCost())
                                .actualTimeHours(w.getActualTimeHours())
                                .build()
                        ).collect(Collectors.toList());
                    }

                    FailureAnalysisReportDetailDto report = FailureAnalysisReportDetailDto.builder()
                            .id(reportId)
                            .type(FailureAnalysisType.MANUFACTURER_DEPARTMENT_CONCENTRATION.name())
                            .title("Manufacturer Claim Concentration in " + dept.getDepartmentName())
                            .severity(severity.name())
                            .period(period)
                            .scope(FailureAnalysisScopeDto.builder()
                                    .departmentId(deptId)
                                    .departmentName(dept.getDepartmentName())
                                    .manufacturer(mfg)
                                    .build())
                            .summary(FailureAnalysisSummaryDto.builder()
                                    .mainFinding(mainFinding)
                                    .businessSignal(businessSignal)
                                    .generatedAt(LocalDateTime.now())
                                    .build())
                            .metrics(metrics)
                            .affectedEquipment(affectedDtos)
                            .claims(claimDtos)
                            .workOrders(woDtos)
                            .timeline(buildTimeline(claimDtos, woDtos))
                            .detectionExplanation(List.of(
                                    String.format("Group has %d claims (minimum required is %d).", groupClaimCount, minClaims),
                                    String.format("Group has %d affected equipment (minimum required is %d).", affectedEqs.size(), minAffectedEquipment),
                                    String.format("%.1f%% of equipment in this group had claims.", affectedRatio * 100),
                                    String.format("The failure frequency is %.1fx the department baseline.", baselineMultiplier)
                            ))
                            .build();

                    reports.add(report);
                }
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectDepartmentAbnormalClaimRate(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        double hospitalBaseline = safeDivide(periodClaims.size(), allEquipment.isEmpty() ? 1 : allEquipment.size());

        Map<Integer, List<Equipment>> deptEqsMap = allEquipment.stream()
                .filter(eq -> eq.getDepartmentId() != null)
                .collect(Collectors.groupingBy(Equipment::getDepartmentId));

        for (Map.Entry<Integer, List<Equipment>> deptEntry : deptEqsMap.entrySet()) {
            Integer deptId = deptEntry.getKey();
            List<Equipment> groupEqs = deptEntry.getValue();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            int groupClaimCount = 0;
            int groupOpenClaimCount = 0;
            int groupHighPriorityClaimCount = 0;
            int groupConvertedWoCount = 0;
            List<Equipment> affectedEqs = new ArrayList<>();
            List<Claim> groupClaimsList = new ArrayList<>();
            boolean hasCriticalInvolved = false;

            for (Equipment eq : groupEqs) {
                List<Claim> eqClaims = claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>());
                if (!eqClaims.isEmpty()) {
                    affectedEqs.add(eq);
                    groupClaimsList.addAll(eqClaims);
                    groupClaimCount += eqClaims.size();
                    
                    if (isCriticalEquipment(eq.getCriticality() != null ? eq.getCriticality().name() : null)) {
                        hasCriticalInvolved = true;
                    }
                    
                    for (Claim c : eqClaims) {
                        if (isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)) groupOpenClaimCount++;
                        if (isHighPriorityClaim(c.getPriority() != null ? c.getPriority().name() : null)) groupHighPriorityClaimCount++;
                        if (c.getLinkedWoId() != null) groupConvertedWoCount++;
                    }
                }
            }

            if (groupClaimCount >= minClaims && affectedEqs.size() >= minAffectedEquipment) {
                double claimsPerEq = safeDivide(groupClaimCount, groupEqs.size());
                double baselineMultiplier = calculateBaselineMultiplier(claimsPerEq, hospitalBaseline);
                
                // Only generate report if the rate is at least higher than baseline
                if (baselineMultiplier > 1.2) {
                    double affectedRatio = safeDivide(affectedEqs.size(), groupEqs.size());
                    boolean hasSignificantOpen = safeDivide(groupOpenClaimCount, groupClaimCount) > 0.3;

                    FailureAnalysisSeverity severity = calculateSeverity(
                            baselineMultiplier, affectedRatio, hasSignificantOpen, hasCriticalInvolved);

                    String reportId = buildDeterministicReportId(
                            FailureAnalysisType.DEPARTMENT_ABNORMAL_CLAIM_RATE, 
                            String.valueOf(deptId), 
                            period.getDays()
                    );
                    
                    String mainFinding = String.format("The %s department had %d claims across %d affected equipment in the last %d days.",
                            dept.getDepartmentName(), groupClaimCount, affectedEqs.size(), period.getDays());
                            
                    String businessSignal = "The department's claim rate is significantly higher than the hospital average, indicating potential issues with equipment usage, environment, or overall age of the department fleet.";

                    FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                            .equipmentCount(groupEqs.size())
                            .affectedEquipmentCount(affectedEqs.size())
                            .affectedEquipmentRatio(affectedRatio)
                            .claimCount(groupClaimCount)
                            .openClaimCount(groupOpenClaimCount)
                            .highPriorityClaimCount(groupHighPriorityClaimCount)
                            .convertedToWorkOrderCount(groupConvertedWoCount)
                            .claimsPerEquipment(claimsPerEq)
                            .baselineClaimsPerEquipment(hospitalBaseline)
                            .baselineMultiplier(baselineMultiplier)
                            .build();
                            
                    List<FailureAnalysisAffectedEquipmentDto> affectedDtos = affectedEqs.stream().map(e -> {
                        List<Claim> cList = claimsByEq.getOrDefault(e.getEquipmentId(), new ArrayList<>());
                        int openCount = (int) cList.stream().filter(c -> isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)).count();
                        return FailureAnalysisAffectedEquipmentDto.builder()
                                .equipmentId(e.getEquipmentId())
                                .assetCode(e.getAssetCode())
                                .name(e.getName())
                                .manufacturer(e.getManufacturer())
                                .model(e.getModel())
                                .departmentName(dept.getDepartmentName())
                                .status(e.getStatus() != null ? e.getStatus().name() : null)
                                .criticality(e.getCriticality() != null ? e.getCriticality().name() : null)
                                .claimCount(cList.size())
                                .openClaimCount(openCount)
                                .workOrderCount((int) cList.stream().filter(c -> c.getLinkedWoId() != null).count())
                                .build();
                    }).collect(Collectors.toList());
                    
                    List<FailureAnalysisClaimDto> claimDtos = groupClaimsList.stream().map(c -> {
                        Equipment e = allEquipment.stream().filter(eq -> eq.getEquipmentId().equals(c.getEquipmentId())).findFirst().orElse(null);
                        return FailureAnalysisClaimDto.builder()
                                .claimId(c.getClaimId())
                                .claimCode("CLM-" + c.getClaimId())
                                .equipmentId(c.getEquipmentId())
                                .equipmentName(e != null ? e.getName() : "Unknown")
                                .status(c.getStatus() != null ? c.getStatus().name() : null)
                                .priority(c.getPriority() != null ? c.getPriority().name() : null)
                                .createdAt(c.getCreatedAt())
                                .linkedWorkOrderId(c.getLinkedWoId())
                                .build();
                    }).collect(Collectors.toList());
                    
                    List<Integer> linkedWoIds = groupClaimsList.stream()
                            .map(Claim::getLinkedWoId)
                            .filter(id -> id != null)
                            .collect(Collectors.toList());
                            
                    List<FailureAnalysisWorkOrderDto> woDtos = new ArrayList<>();
                    if (!linkedWoIds.isEmpty()) {
                        woDtos = workOrderRepository.findAllById(linkedWoIds).stream().map(w -> 
                            FailureAnalysisWorkOrderDto.builder()
                                .workOrderId(w.getWoId())
                                .workOrderCode("WO-" + w.getWoId())
                                .equipmentId(w.getEquipmentId())
                                .status(w.getStatus() != null ? w.getStatus().name() : null)
                                .type(w.getWoType() != null ? w.getWoType().name() : null)
                                .createdAt(w.getCreatedAt())
                                .completedAt(w.getCompletedAt())
                                .actualCost(w.getActualCost())
                                .actualTimeHours(w.getActualTimeHours())
                                .build()
                        ).collect(Collectors.toList());
                    }

                    FailureAnalysisReportDetailDto report = FailureAnalysisReportDetailDto.builder()
                            .id(reportId)
                            .type(FailureAnalysisType.DEPARTMENT_ABNORMAL_CLAIM_RATE.name())
                            .title("Abnormal Claim Rate in " + dept.getDepartmentName())
                            .severity(severity.name())
                            .period(period)
                            .scope(FailureAnalysisScopeDto.builder()
                                    .departmentId(deptId)
                                    .departmentName(dept.getDepartmentName())
                                    .build())
                            .summary(FailureAnalysisSummaryDto.builder()
                                    .mainFinding(mainFinding)
                                    .businessSignal(businessSignal)
                                    .generatedAt(LocalDateTime.now())
                                    .build())
                            .metrics(metrics)
                            .affectedEquipment(affectedDtos)
                            .claims(claimDtos)
                            .workOrders(woDtos)
                            .timeline(buildTimeline(claimDtos, woDtos))
                            .detectionExplanation(List.of(
                                    String.format("Department has %d claims (minimum required is %d).", groupClaimCount, minClaims),
                                    String.format("Department has %d affected equipment (minimum required is %d).", affectedEqs.size(), minAffectedEquipment),
                                    String.format("Failure frequency (%.2f/eq) is %.1fx the hospital baseline (%.2f/eq).", claimsPerEq, baselineMultiplier, hospitalBaseline)
                            ))
                            .build();

                    reports.add(report);
                }
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectCriticalEquipmentClaimCluster(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Equipment> criticalEquipment = allEquipment.stream()
                .filter(eq -> isCriticalEquipment(eq.getCriticality() != null ? eq.getCriticality().name() : null))
                .collect(Collectors.toList());

        if (criticalEquipment.isEmpty()) return reports;

        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        // Global baseline for critical equipment claims
        int totalCriticalClaims = criticalEquipment.stream()
                .mapToInt(eq -> claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).size())
                .sum();
        double criticalBaseline = safeDivide(totalCriticalClaims, criticalEquipment.size());

        Map<Integer, List<Equipment>> deptCriticalEqsMap = criticalEquipment.stream()
                .filter(eq -> eq.getDepartmentId() != null)
                .collect(Collectors.groupingBy(Equipment::getDepartmentId));

        for (Map.Entry<Integer, List<Equipment>> deptEntry : deptCriticalEqsMap.entrySet()) {
            Integer deptId = deptEntry.getKey();
            List<Equipment> groupEqs = deptEntry.getValue();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            int groupClaimCount = 0;
            int groupOpenClaimCount = 0;
            int groupHighPriorityClaimCount = 0;
            int groupConvertedWoCount = 0;
            int groupUnderRepairCount = 0;
            List<Equipment> affectedEqs = new ArrayList<>();
            List<Claim> groupClaimsList = new ArrayList<>();

            for (Equipment eq : groupEqs) {
                List<Claim> eqClaims = claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>());
                if (!eqClaims.isEmpty()) {
                    affectedEqs.add(eq);
                    groupClaimsList.addAll(eqClaims);
                    groupClaimCount += eqClaims.size();
                    
                    if (eq.getStatus() != null && eq.getStatus().name().equals("UNDER_REPAIR")) {
                        groupUnderRepairCount++;
                    }
                    
                    for (Claim c : eqClaims) {
                        if (isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)) groupOpenClaimCount++;
                        if (isHighPriorityClaim(c.getPriority() != null ? c.getPriority().name() : null)) groupHighPriorityClaimCount++;
                        if (c.getLinkedWoId() != null) groupConvertedWoCount++;
                    }
                }
            }

            if (groupClaimCount >= minClaims && affectedEqs.size() >= minAffectedEquipment) {
                double claimsPerEq = safeDivide(groupClaimCount, groupEqs.size());
                double baselineMultiplier = calculateBaselineMultiplier(claimsPerEq, criticalBaseline);
                
                double affectedRatio = safeDivide(affectedEqs.size(), groupEqs.size());
                boolean hasSignificantOpen = safeDivide(groupOpenClaimCount, groupClaimCount) > 0.2;

                FailureAnalysisSeverity severity = calculateSeverity(
                        baselineMultiplier, affectedRatio, hasSignificantOpen, true);

                String reportId = buildDeterministicReportId(
                        FailureAnalysisType.CRITICAL_EQUIPMENT_CLAIM_CLUSTER, 
                        String.valueOf(deptId), 
                        period.getDays()
                );
                
                String mainFinding = String.format("%d critical equipment in %s had a total of %d claims in the last %d days.",
                        affectedEqs.size(), dept.getDepartmentName(), groupClaimCount, period.getDays());
                        
                String businessSignal = "A cluster of claims on critical equipment indicates high-impact failure patterns that pose immediate risks to departmental service delivery.";

                FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                        .equipmentCount(groupEqs.size())
                        .affectedEquipmentCount(affectedEqs.size())
                        .affectedEquipmentRatio(affectedRatio)
                        .claimCount(groupClaimCount)
                        .openClaimCount(groupOpenClaimCount)
                        .highPriorityClaimCount(groupHighPriorityClaimCount)
                        .convertedToWorkOrderCount(groupConvertedWoCount)
                        .claimsPerEquipment(claimsPerEq)
                        .baselineClaimsPerEquipment(criticalBaseline)
                        .baselineMultiplier(baselineMultiplier)
                        .underRepairCount(groupUnderRepairCount)
                        .build();
                        
                List<FailureAnalysisAffectedEquipmentDto> affectedDtos = affectedEqs.stream().map(e -> {
                    List<Claim> cList = claimsByEq.getOrDefault(e.getEquipmentId(), new ArrayList<>());
                    int openCount = (int) cList.stream().filter(c -> isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)).count();
                    return FailureAnalysisAffectedEquipmentDto.builder()
                            .equipmentId(e.getEquipmentId())
                            .assetCode(e.getAssetCode())
                            .name(e.getName())
                            .manufacturer(e.getManufacturer())
                            .model(e.getModel())
                            .departmentName(dept.getDepartmentName())
                            .status(e.getStatus() != null ? e.getStatus().name() : null)
                            .criticality(e.getCriticality() != null ? e.getCriticality().name() : null)
                            .claimCount(cList.size())
                            .openClaimCount(openCount)
                            .workOrderCount((int) cList.stream().filter(c -> c.getLinkedWoId() != null).count())
                            .build();
                }).collect(Collectors.toList());
                
                List<FailureAnalysisClaimDto> claimDtos = groupClaimsList.stream().map(c -> {
                    Equipment e = allEquipment.stream().filter(eq -> eq.getEquipmentId().equals(c.getEquipmentId())).findFirst().orElse(null);
                    return FailureAnalysisClaimDto.builder()
                            .claimId(c.getClaimId())
                            .claimCode("CLM-" + c.getClaimId())
                            .equipmentId(c.getEquipmentId())
                            .equipmentName(e != null ? e.getName() : "Unknown")
                            .status(c.getStatus() != null ? c.getStatus().name() : null)
                            .priority(c.getPriority() != null ? c.getPriority().name() : null)
                            .createdAt(c.getCreatedAt())
                            .linkedWorkOrderId(c.getLinkedWoId())
                            .build();
                }).collect(Collectors.toList());
                
                List<Integer> linkedWoIds = groupClaimsList.stream()
                        .map(Claim::getLinkedWoId)
                        .filter(id -> id != null)
                        .collect(Collectors.toList());
                        
                List<FailureAnalysisWorkOrderDto> woDtos = new ArrayList<>();
                if (!linkedWoIds.isEmpty()) {
                    woDtos = workOrderRepository.findAllById(linkedWoIds).stream().map(w -> 
                        FailureAnalysisWorkOrderDto.builder()
                            .workOrderId(w.getWoId())
                            .workOrderCode("WO-" + w.getWoId())
                            .equipmentId(w.getEquipmentId())
                            .status(w.getStatus() != null ? w.getStatus().name() : null)
                            .type(w.getWoType() != null ? w.getWoType().name() : null)
                            .createdAt(w.getCreatedAt())
                            .completedAt(w.getCompletedAt())
                            .actualCost(w.getActualCost())
                            .actualTimeHours(w.getActualTimeHours())
                            .build()
                    ).collect(Collectors.toList());
                }

                FailureAnalysisReportDetailDto report = FailureAnalysisReportDetailDto.builder()
                        .id(reportId)
                        .type(FailureAnalysisType.CRITICAL_EQUIPMENT_CLAIM_CLUSTER.name())
                        .title("Critical Equipment Claim Cluster in " + dept.getDepartmentName())
                        .severity(severity.name())
                        .period(period)
                        .scope(FailureAnalysisScopeDto.builder()
                                .departmentId(deptId)
                                .departmentName(dept.getDepartmentName())
                                .build())
                        .summary(FailureAnalysisSummaryDto.builder()
                                .mainFinding(mainFinding)
                                .businessSignal(businessSignal)
                                .generatedAt(LocalDateTime.now())
                                .build())
                        .metrics(metrics)
                        .affectedEquipment(affectedDtos)
                        .claims(claimDtos)
                        .workOrders(woDtos)
                        .timeline(buildTimeline(claimDtos, woDtos))
                        .detectionExplanation(List.of(
                                String.format("Group has %d claims on critical assets.", groupClaimCount),
                                String.format("Frequency is %.1fx compared to critical asset baseline hospital-wide.", baselineMultiplier),
                                String.format("%d of these assets are currently marked as UNDER_REPAIR.", groupUnderRepairCount)
                        ))
                        .build();

                reports.add(report);
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectOpenClaimAccumulation(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        Map<Integer, Equipment> eqMap = allEquipment.stream()
                .collect(Collectors.toMap(Equipment::getEquipmentId, e -> e));

        // We check all currently open claims created before 'toDate'
        List<Claim> allOpenClaims = claimRepository.findAll().stream()
                .filter(c -> isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null))
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isAfter(toDate))
                .collect(Collectors.toList());

        if (allOpenClaims.isEmpty()) return reports;

        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        // Grouping by Department
        Map<Integer, List<Claim>> claimsByDept = allOpenClaims.stream()
                .filter(c -> c.getDepartmentId() != null)
                .collect(Collectors.groupingBy(Claim::getDepartmentId));

        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<Integer, List<Claim>> entry : claimsByDept.entrySet()) {
            Integer deptId = entry.getKey();
            List<Claim> deptClaims = entry.getValue();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            List<Integer> affectedEqIds = deptClaims.stream()
                    .map(Claim::getEquipmentId)
                    .distinct()
                    .collect(Collectors.toList());

            if (deptClaims.size() >= minClaims && affectedEqIds.size() >= minAffectedEquipment) {
                
                long totalAgeDays = 0;
                long maxAgeDays = 0;
                int highPriorityCount = 0;
                List<Equipment> affectedEqs = new ArrayList<>();

                for (Claim c : deptClaims) {
                    long ageDays = java.time.Duration.between(c.getCreatedAt(), now).toDays();
                    totalAgeDays += ageDays;
                    if (ageDays > maxAgeDays) maxAgeDays = ageDays;
                    if (isHighPriorityClaim(c.getPriority() != null ? c.getPriority().name() : null)) {
                        highPriorityCount++;
                    }
                    Equipment eq = eqMap.get(c.getEquipmentId());
                    if (eq != null && !affectedEqs.contains(eq)) {
                        affectedEqs.add(eq);
                    }
                }

                double avgAgeDays = safeDivide((int)totalAgeDays, deptClaims.size());
                
                // Multiplier based on volume and age. 
                // Baseline: we assume 'minClaims' is the expected 'normal' volume for a busy dept.
                double baselineMultiplier = safeDivide(deptClaims.size(), minClaims);
                if (avgAgeDays > 14) baselineMultiplier *= 1.5; // Penalty for old claims

                FailureAnalysisSeverity severity = calculateSeverity(
                        baselineMultiplier, 
                        safeDivide(affectedEqIds.size(), groupEqCount(allEquipment, deptId)), 
                        highPriorityCount > 0, 
                        affectedEqs.stream().anyMatch(e -> isCriticalEquipment(e.getCriticality() != null ? e.getCriticality().name() : null))
                );

                String reportId = buildDeterministicReportId(
                        FailureAnalysisType.OPEN_CLAIM_ACCUMULATION, 
                        String.valueOf(deptId), 
                        period.getDays()
                );

                String mainFinding = String.format("%d unresolved claims are currently accumulating in %s, affecting %d different equipment.",
                        deptClaims.size(), dept.getDepartmentName(), affectedEqIds.size());

                String businessSignal = String.format("A concentration of open claims (average age %.1f days) suggests a maintenance backlog or resource constraints in this department.", avgAgeDays);

                FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                        .equipmentCount(groupEqCount(allEquipment, deptId))
                        .affectedEquipmentCount(affectedEqIds.size())
                        .claimCount(deptClaims.size())
                        .openClaimCount(deptClaims.size())
                        .highPriorityClaimCount(highPriorityCount)
                        .baselineMultiplier(baselineMultiplier)
                        .build();

                List<FailureAnalysisAffectedEquipmentDto> affectedDtos = affectedEqs.stream().map(e -> {
                    List<Claim> cList = deptClaims.stream().filter(c -> c.getEquipmentId().equals(e.getEquipmentId())).collect(Collectors.toList());
                    return FailureAnalysisAffectedEquipmentDto.builder()
                            .equipmentId(e.getEquipmentId())
                            .assetCode(e.getAssetCode())
                            .name(e.getName())
                            .departmentName(dept.getDepartmentName())
                            .claimCount(cList.size())
                            .openClaimCount(cList.size())
                            .build();
                }).collect(Collectors.toList());

                List<FailureAnalysisClaimDto> claimDtos = deptClaims.stream().map(c -> {
                    Equipment e = eqMap.get(c.getEquipmentId());
                    return FailureAnalysisClaimDto.builder()
                            .claimId(c.getClaimId())
                            .claimCode("CLM-" + c.getClaimId())
                            .equipmentId(c.getEquipmentId())
                            .equipmentName(e != null ? e.getName() : "Unknown")
                            .status(c.getStatus() != null ? c.getStatus().name() : null)
                            .priority(c.getPriority() != null ? c.getPriority().name() : null)
                            .createdAt(c.getCreatedAt())
                            .build();
                }).collect(Collectors.toList());

                FailureAnalysisReportDetailDto report = FailureAnalysisReportDetailDto.builder()
                        .id(reportId)
                        .type(FailureAnalysisType.OPEN_CLAIM_ACCUMULATION.name())
                        .title("Open Claim Accumulation in " + dept.getDepartmentName())
                        .severity(severity.name())
                        .period(period)
                        .scope(FailureAnalysisScopeDto.builder()
                                .departmentId(deptId)
                                .departmentName(dept.getDepartmentName())
                                .build())
                        .summary(FailureAnalysisSummaryDto.builder()
                                .mainFinding(mainFinding)
                                .businessSignal(businessSignal)
                                .generatedAt(LocalDateTime.now())
                                .build())
                        .metrics(metrics)
                        .affectedEquipment(affectedDtos)
                        .claims(claimDtos)
                        .timeline(buildTimeline(claimDtos, new ArrayList<>()))
                        .detectionExplanation(List.of(
                                String.format("Department has %d open claims.", deptClaims.size()),
                                String.format("Average age of open claims is %.1f days.", avgAgeDays),
                                String.format("Oldest open claim was created %d days ago.", maxAgeDays)
                        ))
                        .build();

                reports.add(report);
            }
        }
        return reports;
    }

    private int groupEqCount(List<Equipment> all, Integer deptId) {
        return (int) all.stream().filter(e -> deptId.equals(e.getDepartmentId())).count();
    }

    private List<FailureAnalysisReportDetailDto> detectModelDepartmentConcentration(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        // Grouping by Dept -> Model
        Map<Integer, Map<String, List<Equipment>>> groupedEq = new HashMap<>();
        for (Equipment eq : allEquipment) {
            if (eq.getDepartmentId() != null && eq.getModel() != null && !eq.getModel().trim().isEmpty()) {
                groupedEq.computeIfAbsent(eq.getDepartmentId(), k -> new HashMap<>())
                        .computeIfAbsent(eq.getModel().trim(), k -> new ArrayList<>())
                        .add(eq);
            }
        }

        for (Map.Entry<Integer, Map<String, List<Equipment>>> deptEntry : groupedEq.entrySet()) {
            Integer deptId = deptEntry.getKey();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            // Baseline for department
            int deptEqsCount = (int) allEquipment.stream().filter(e -> deptId.equals(e.getDepartmentId())).count();
            int deptClaimCount = periodClaims.stream().filter(c -> deptId.equals(c.getDepartmentId())).mapToInt(c -> 1).sum();
            double deptBaseline = safeDivide(deptClaimCount, deptEqsCount > 0 ? deptEqsCount : 1);

            for (Map.Entry<String, List<Equipment>> modelEntry : deptEntry.getValue().entrySet()) {
                String model = modelEntry.getKey();
                List<Equipment> groupEqs = modelEntry.getValue();

                List<Claim> groupClaims = groupEqs.stream()
                        .flatMap(eq -> claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).stream())
                        .collect(Collectors.toList());

                List<Equipment> affectedEqs = groupEqs.stream()
                        .filter(eq -> !claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).isEmpty())
                        .collect(Collectors.toList());

                if (groupClaims.size() >= minClaims && affectedEqs.size() >= minAffectedEquipment) {
                    double claimsPerEq = safeDivide(groupClaims.size(), groupEqs.size());
                    double multiplier = calculateBaselineMultiplier(claimsPerEq, deptBaseline);
                    
                    FailureAnalysisSeverity severity = calculateSeverity(
                            multiplier, 
                            safeDivide(affectedEqs.size(), groupEqs.size()), 
                            false, 
                            affectedEqs.stream().anyMatch(e -> isCriticalEquipment(e.getCriticality() != null ? e.getCriticality().name() : null))
                    );

                    String reportId = buildDeterministicReportId(FailureAnalysisType.MODEL_DEPARTMENT_CONCENTRATION, deptId + "_" + model, period.getDays());
                    
                    reports.add(buildGenericReport(
                            reportId,
                            FailureAnalysisType.MODEL_DEPARTMENT_CONCENTRATION,
                            "Model Concentration: " + model + " in " + dept.getDepartmentName(),
                            severity,
                            period,
                            deptId,
                            dept.getDepartmentName(),
                            null,
                            model,
                            groupEqs.size(),
                            affectedEqs,
                            groupClaims,
                            multiplier,
                            deptBaseline,
                            String.format("Model '%s' has a high failure rate in %s.", model, dept.getDepartmentName()),
                            "Potential localized model-specific reliability issue or environmental factor affecting this equipment type in this department."
                    ));
                }
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectCategoryConcentration(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        double globalBaseline = safeDivide(periodClaims.size(), allEquipment.size() > 0 ? allEquipment.size() : 1);

        // Grouping by Category
        Map<String, List<Equipment>> groupedEq = allEquipment.stream()
                .filter(eq -> eq.getCategory() != null && !eq.getCategory().trim().isEmpty())
                .collect(Collectors.groupingBy(eq -> eq.getCategory().trim()));

        for (Map.Entry<String, List<Equipment>> entry : groupedEq.entrySet()) {
            String category = entry.getKey();
            List<Equipment> groupEqs = entry.getValue();

            List<Claim> groupClaims = groupEqs.stream()
                    .flatMap(eq -> claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).stream())
                    .collect(Collectors.toList());

            List<Equipment> affectedEqs = groupEqs.stream()
                    .filter(eq -> !claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).isEmpty())
                    .collect(Collectors.toList());

            if (groupClaims.size() >= minClaims && affectedEqs.size() >= minAffectedEquipment) {
                double claimsPerEq = safeDivide(groupClaims.size(), groupEqs.size());
                double multiplier = calculateBaselineMultiplier(claimsPerEq, globalBaseline);
                
                FailureAnalysisSeverity severity = calculateSeverity(
                        multiplier, 
                        safeDivide(affectedEqs.size(), groupEqs.size()), 
                        false, 
                        affectedEqs.stream().anyMatch(e -> isCriticalEquipment(e.getCriticality() != null ? e.getCriticality().name() : null))
                );

                String reportId = buildDeterministicReportId(FailureAnalysisType.CATEGORY_CONCENTRATION, category, period.getDays());
                
                reports.add(buildGenericReport(
                        reportId,
                        FailureAnalysisType.CATEGORY_CONCENTRATION,
                        "Category Concentration: " + category,
                        severity,
                        period,
                        null,
                        "Hospital-wide",
                        category,
                        null,
                        groupEqs.size(),
                        affectedEqs,
                        groupClaims,
                        multiplier,
                        globalBaseline,
                        String.format("Equipment in category '%s' shows an elevated claim rate.", category),
                        "Category-wide reliability patterns help identify systemic issues with specific asset classes."
                ));
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectSupplierConcentration(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        double globalBaseline = safeDivide(periodClaims.size(), allEquipment.size() > 0 ? allEquipment.size() : 1);

        // Grouping by Supplier
        Map<String, List<Equipment>> groupedEq = allEquipment.stream()
                .filter(eq -> eq.getSupplierName() != null && !eq.getSupplierName().trim().isEmpty())
                .collect(Collectors.groupingBy(eq -> eq.getSupplierName().trim()));

        for (Map.Entry<String, List<Equipment>> entry : groupedEq.entrySet()) {
            String supplier = entry.getKey();
            List<Equipment> groupEqs = entry.getValue();

            List<Claim> groupClaims = groupEqs.stream()
                    .flatMap(eq -> claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).stream())
                    .collect(Collectors.toList());

            List<Equipment> affectedEqs = groupEqs.stream()
                    .filter(eq -> !claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>()).isEmpty())
                    .collect(Collectors.toList());

            if (groupClaims.size() >= minClaims && affectedEqs.size() >= minAffectedEquipment) {
                double claimsPerEq = safeDivide(groupClaims.size(), groupEqs.size());
                double multiplier = calculateBaselineMultiplier(claimsPerEq, globalBaseline);
                
                FailureAnalysisSeverity severity = calculateSeverity(
                        multiplier, 
                        safeDivide(affectedEqs.size(), groupEqs.size()), 
                        false, 
                        affectedEqs.stream().anyMatch(e -> isCriticalEquipment(e.getCriticality() != null ? e.getCriticality().name() : null))
                );

                String reportId = buildDeterministicReportId(FailureAnalysisType.SUPPLIER_CONCENTRATION, supplier, period.getDays());
                
                reports.add(buildGenericReport(
                        reportId,
                        FailureAnalysisType.SUPPLIER_CONCENTRATION,
                        "Supplier Risk: " + supplier,
                        severity,
                        period,
                        null,
                        "Hospital-wide",
                        null,
                        null,
                        groupEqs.size(),
                        affectedEqs,
                        groupClaims,
                        multiplier,
                        globalBaseline,
                        String.format("Equipment from supplier '%s' has an elevated claim frequency.", supplier),
                        "Supplier-specific concentrations can indicate issues with procurement quality, installation service, or post-purchase support."
                ));
            }
        }
        return reports;
    }

    private FailureAnalysisReportDetailDto buildGenericReport(
            String id,
            FailureAnalysisType type,
            String title,
            FailureAnalysisSeverity severity,
            FailureAnalysisPeriodDto period,
            Integer deptId,
            String deptName,
            String category,
            String model,
            int totalEqInGroup,
            List<Equipment> affectedEqs,
            List<Claim> claims,
            double multiplier,
            double baseline,
            String mainFinding,
            String businessSignal) {

        int openClaims = (int) claims.stream().filter(c -> isOpenClaim(c.getStatus() != null ? c.getStatus().name() : null)).count();
        int highPriority = (int) claims.stream().filter(c -> isHighPriorityClaim(c.getPriority() != null ? c.getPriority().name() : null)).count();
        int convertedWo = (int) claims.stream().filter(c -> c.getLinkedWoId() != null).count();

        FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                .equipmentCount(totalEqInGroup)
                .affectedEquipmentCount(affectedEqs.size())
                .affectedEquipmentRatio(safeDivide(affectedEqs.size(), totalEqInGroup))
                .claimCount(claims.size())
                .openClaimCount(openClaims)
                .highPriorityClaimCount(highPriority)
                .convertedToWorkOrderCount(convertedWo)
                .claimsPerEquipment(safeDivide(claims.size(), totalEqInGroup))
                .baselineClaimsPerEquipment(baseline)
                .baselineMultiplier(multiplier)
                .build();

        List<FailureAnalysisClaimDto> claimDtos = claims.stream().map(c -> {
            Equipment e = equipmentRepository.findById(c.getEquipmentId()).orElse(null);
            return FailureAnalysisClaimDto.builder()
                    .claimId(c.getClaimId())
                    .claimCode("CLM-" + c.getClaimId())
                    .equipmentId(c.getEquipmentId())
                    .equipmentName(e != null ? e.getName() : "Unknown")
                    .status(c.getStatus() != null ? c.getStatus().name() : null)
                    .priority(c.getPriority() != null ? c.getPriority().name() : null)
                    .createdAt(c.getCreatedAt())
                    .linkedWorkOrderId(c.getLinkedWoId())
                    .build();
        }).collect(Collectors.toList());

        List<FailureAnalysisAffectedEquipmentDto> affectedDtos = affectedEqs.stream().map(e -> {
            int eClaims = (int) claims.stream().filter(c -> c.getEquipmentId().equals(e.getEquipmentId())).count();
            return FailureAnalysisAffectedEquipmentDto.builder()
                    .equipmentId(e.getEquipmentId())
                    .assetCode(e.getAssetCode())
                    .name(e.getName())
                    .manufacturer(e.getManufacturer())
                    .model(e.getModel())
                    .departmentName(deptName)
                    .status(e.getStatus() != null ? e.getStatus().name() : null)
                    .criticality(e.getCriticality() != null ? e.getCriticality().name() : null)
                    .claimCount(eClaims)
                    .build();
        }).collect(Collectors.toList());

        return FailureAnalysisReportDetailDto.builder()
                .id(id)
                .type(type.name())
                .title(title)
                .severity(severity.name())
                .period(period)
                .scope(FailureAnalysisScopeDto.builder()
                        .departmentId(deptId)
                        .departmentName(deptName)
                        .manufacturer(affectedEqs.isEmpty() ? null : affectedEqs.get(0).getManufacturer())
                        .category(category)
                        .model(model)
                        .build())
                .summary(FailureAnalysisSummaryDto.builder()
                        .mainFinding(mainFinding)
                        .businessSignal(businessSignal)
                        .generatedAt(LocalDateTime.now())
                        .build())
                .metrics(metrics)
                .affectedEquipment(affectedDtos)
                .claims(claimDtos)
                .workOrders(getWorkOrdersForClaims(claims))
                .timeline(buildTimeline(claimDtos, new ArrayList<>()))
                .detectionExplanation(List.of(
                        String.format("Group has %d claims across %d equipment.", claims.size(), affectedEqs.size()),
                        String.format("Claim frequency is %.1fx the baseline (%.2f/eq).", multiplier, baseline)
                ))
                .build();
    }

    private List<FailureAnalysisReportDetailDto> detectHighWorkOrderConversion(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        if (periodClaims.isEmpty()) return reports;

        double globalConversionRate = safeDivide(
                (int) periodClaims.stream().filter(c -> c.getLinkedWoId() != null).count(),
                periodClaims.size());

        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        Map<Integer, List<Claim>> claimsByDept = periodClaims.stream()
                .filter(c -> c.getDepartmentId() != null)
                .collect(Collectors.groupingBy(Claim::getDepartmentId));

        for (Map.Entry<Integer, List<Claim>> entry : claimsByDept.entrySet()) {
            Integer deptId = entry.getKey();
            List<Claim> deptClaims = entry.getValue();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            List<Claim> convertedClaims = deptClaims.stream()
                    .filter(c -> c.getLinkedWoId() != null)
                    .collect(Collectors.toList());

            if (deptClaims.size() >= minClaims && !convertedClaims.isEmpty()) {
                double deptConversionRate = safeDivide(convertedClaims.size(), deptClaims.size());
                
                // Only report if significantly higher than global baseline or very high (e.g., > 0.6)
                if (deptConversionRate > globalConversionRate * 1.2 || deptConversionRate > 0.7) {
                    
                    List<Integer> woIds = convertedClaims.stream().map(Claim::getLinkedWoId).collect(Collectors.toList());
                    List<com.cmms.maintenance.entity.WorkOrder> workOrders = workOrderRepository.findAllById(woIds);

                    long correctiveCount = workOrders.stream()
                            .filter(wo -> wo.getWoType() == com.cmms.maintenance.entity.WorkOrder.WorkOrderType.CORRECTIVE)
                            .count();
                    
                    long openWos = workOrders.stream()
                            .filter(wo -> wo.getStatus() != com.cmms.maintenance.entity.WorkOrder.WorkOrderStatus.CLOSED 
                                    && wo.getStatus() != com.cmms.maintenance.entity.WorkOrder.WorkOrderStatus.VALIDATED
                                    && wo.getStatus() != com.cmms.maintenance.entity.WorkOrder.WorkOrderStatus.COMPLETED)
                            .count();

                    double multiplier = calculateBaselineMultiplier(deptConversionRate, globalConversionRate);
                    
                    FailureAnalysisSeverity severity = calculateSeverity(
                            multiplier, 
                            safeDivide(convertedClaims.size(), deptClaims.size()), 
                            openWos > 0, 
                            false
                    );

                    String reportId = buildDeterministicReportId(FailureAnalysisType.HIGH_WORK_ORDER_CONVERSION, String.valueOf(deptId), period.getDays());
                    
                    String mainFinding = String.format("%d of %d claims in %s were converted to work orders (%.1f%%).", 
                            convertedClaims.size(), deptClaims.size(), dept.getDepartmentName(), deptConversionRate * 100);
                    
                    String businessSignal = "High conversion rates indicate that technical issues are frequently confirmed as genuine equipment failures requiring formal maintenance intervention.";

                    FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                            .claimCount(deptClaims.size())
                            .convertedToWorkOrderCount(convertedClaims.size())
                            .conversionRate(deptConversionRate)
                            .baselineConversionRate(globalConversionRate)
                            .baselineMultiplier(multiplier)
                            .openWorkOrderCount((int) openWos)
                            .build();

                    List<FailureAnalysisAffectedEquipmentDto> affectedEqs = deptClaims.stream()
                            .map(c -> allEquipment.stream().filter(e -> e.getEquipmentId().equals(c.getEquipmentId())).findFirst().orElse(null))
                            .filter(e -> e != null)
                            .distinct()
                            .map(e -> FailureAnalysisAffectedEquipmentDto.builder()
                                    .equipmentId(e.getEquipmentId())
                                    .assetCode(e.getAssetCode())
                                    .name(e.getName())
                                    .departmentName(dept.getDepartmentName())
                                    .build())
                            .collect(Collectors.toList());

                    List<FailureAnalysisClaimDto> claimDtos = deptClaims.stream().map(c -> FailureAnalysisClaimDto.builder()
                            .claimId(c.getClaimId())
                            .claimCode("CLM-" + c.getClaimId())
                            .status(c.getStatus() != null ? c.getStatus().name() : null)
                            .priority(c.getPriority() != null ? c.getPriority().name() : null)
                            .createdAt(c.getCreatedAt())
                            .linkedWorkOrderId(c.getLinkedWoId())
                            .build()).collect(Collectors.toList());

                    reports.add(FailureAnalysisReportDetailDto.builder()
                            .id(reportId)
                            .type(FailureAnalysisType.HIGH_WORK_ORDER_CONVERSION.name())
                            .title("High Work Order Conversion: " + dept.getDepartmentName())
                            .severity(severity.name())
                            .period(period)
                            .scope(FailureAnalysisScopeDto.builder().departmentId(deptId).departmentName(dept.getDepartmentName()).build())
                            .summary(FailureAnalysisSummaryDto.builder().mainFinding(mainFinding).businessSignal(businessSignal).generatedAt(LocalDateTime.now()).build())
                            .metrics(metrics)
                            .affectedEquipment(affectedEqs)
                            .claims(claimDtos)
                            .workOrders(workOrders.stream().map(this::mapToWorkOrderDto).collect(Collectors.toList()))
                            .detectionExplanation(List.of(
                                    String.format("Department has %.1f%% conversion rate compared to hospital baseline of %.1f%%.", deptConversionRate * 100, globalConversionRate * 100),
                                    String.format("%d corrective work orders were generated from these claims.", correctiveCount)
                            ))
                            .build());
                }
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectUnderRepairAvailabilityRisk(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        List<Equipment> allEquipment = equipmentRepository.findAll();
        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        Map<Integer, List<Equipment>> eqsByDept = allEquipment.stream()
                .filter(e -> e.getDepartmentId() != null)
                .collect(Collectors.groupingBy(Equipment::getDepartmentId));

        for (Map.Entry<Integer, List<Equipment>> entry : eqsByDept.entrySet()) {
            Integer deptId = entry.getKey();
            List<Equipment> deptEqs = entry.getValue();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            List<Equipment> underRepairEqs = deptEqs.stream()
                    .filter(e -> e.getStatus() == com.cmms.equipment.entity.EquipmentStatus.UNDER_REPAIR)
                    .collect(Collectors.toList());

            if (underRepairEqs.size() >= minAffectedEquipment) {
                double underRepairRatio = safeDivide(underRepairEqs.size(), deptEqs.size());
                
                // Significant risk if > 15% of fleet is down
                if (underRepairRatio > 0.15) {
                    
                    long criticalDown = underRepairEqs.stream()
                            .filter(e -> isCriticalEquipment(e.getCriticality() != null ? e.getCriticality().name() : null))
                            .count();

                    FailureAnalysisSeverity severity = calculateSeverity(
                            underRepairRatio * 10, // heuristic
                            underRepairRatio, 
                            false, 
                            criticalDown > 0
                    );

                    String reportId = buildDeterministicReportId(FailureAnalysisType.UNDER_REPAIR_AVAILABILITY_RISK, String.valueOf(deptId), period.getDays());
                    
                    String mainFinding = String.format("%d of %d equipment in %s are currently under repair (%.1f%%).", 
                            underRepairEqs.size(), deptEqs.size(), dept.getDepartmentName(), underRepairRatio * 100);
                    
                    String businessSignal = "A high ratio of equipment under repair poses a significant risk to departmental availability and service continuity.";

                    FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                            .equipmentCount(deptEqs.size())
                            .underRepairCount(underRepairEqs.size())
                            .underRepairRatio(underRepairRatio)
                            .criticalEquipmentUnderRepairCount((int) criticalDown)
                            .build();

                    List<FailureAnalysisAffectedEquipmentDto> affectedDtos = underRepairEqs.stream().map(e -> FailureAnalysisAffectedEquipmentDto.builder()
                            .equipmentId(e.getEquipmentId())
                            .assetCode(e.getAssetCode())
                            .name(e.getName())
                            .departmentName(dept.getDepartmentName())
                            .status(e.getStatus().name())
                            .criticality(e.getCriticality() != null ? e.getCriticality().name() : null)
                            .build()).collect(Collectors.toList());

                    reports.add(FailureAnalysisReportDetailDto.builder()
                            .id(reportId)
                            .type(FailureAnalysisType.UNDER_REPAIR_AVAILABILITY_RISK.name())
                            .title("Availability Risk: " + dept.getDepartmentName())
                            .severity(severity.name())
                            .period(period)
                            .scope(FailureAnalysisScopeDto.builder().departmentId(deptId).departmentName(dept.getDepartmentName()).build())
                            .summary(FailureAnalysisSummaryDto.builder().mainFinding(mainFinding).businessSignal(businessSignal).generatedAt(LocalDateTime.now()).build())
                            .metrics(metrics)
                            .affectedEquipment(affectedDtos)
                            .detectionExplanation(List.of(
                                    String.format("%.1f%% of the fleet in this department is currently inactive due to repairs.", underRepairRatio * 100),
                                    String.format("%d critical assets are currently down.", criticalDown)
                            ))
                            .build());
                }
            }
        }
        return reports;
    }

    private FailureAnalysisWorkOrderDto mapToWorkOrderDto(com.cmms.maintenance.entity.WorkOrder wo) {
        return FailureAnalysisWorkOrderDto.builder()
                .workOrderId(wo.getWoId())
                .workOrderCode("WO-" + wo.getWoId())
                .equipmentId(wo.getEquipmentId())
                .status(wo.getStatus() != null ? wo.getStatus().name() : null)
                .type(wo.getWoType() != null ? wo.getWoType().name() : null)
                .createdAt(wo.getCreatedAt())
                .completedAt(wo.getCompletedAt())
                .actualCost(wo.getActualCost())
                .actualTimeHours(wo.getActualTimeHours())
                .build();
    }

    private List<FailureAnalysisWorkOrderDto> getWorkOrdersForClaims(List<Claim> claims) {
        List<Integer> woIds = claims.stream()
                .map(Claim::getLinkedWoId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (woIds.isEmpty()) return new ArrayList<>();
        return workOrderRepository.findAllById(woIds).stream()
                .map(this::mapToWorkOrderDto)
                .collect(Collectors.toList());
    }

    // ── Helper Methods ───────────────────────────────────────────────

    private FailureAnalysisPeriodDto resolvePeriod(String fromDate, String toDate, Integer analysisPeriodDays) {
        if (fromDate != null && toDate != null) {
            // Very simple fallback: just pass the strings back for now
            // We would parse and calculate days if needed.
            return FailureAnalysisPeriodDto.builder()
                    .from(fromDate)
                    .to(toDate)
                    .days(analysisPeriodDays != null ? analysisPeriodDays : 90)
                    .build();
        }
        
        int days = analysisPeriodDays != null ? analysisPeriodDays : 90;
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(days);
        
        return FailureAnalysisPeriodDto.builder()
                .from(from.toString())
                .to(to.toString())
                .days(days)
                .build();
    }

    private double safeDivide(int numerator, int denominator) {
        if (denominator == 0) return 0.0;
        return (double) numerator / denominator;
    }
    
    private double safeDivide(double numerator, double denominator) {
        if (denominator == 0.0) return 0.0;
        return numerator / denominator;
    }

    private double calculateBaselineMultiplier(double groupRate, double baselineRate) {
        if (baselineRate == 0.0) return groupRate > 0 ? groupRate : 0.0; // Avoid infinity
        return Math.round((groupRate / baselineRate) * 100.0) / 100.0;
    }

    private boolean isOpenClaim(String statusStr) {
        if (statusStr == null) return false;
        try {
            ClaimStatus status = ClaimStatus.valueOf(statusStr);
            return status != ClaimStatus.CLOSED && status != ClaimStatus.REJECTED && status != ClaimStatus.RESOLVED;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isHighPriorityClaim(String priorityStr) {
        if (priorityStr == null) return false;
        try {
            ClaimPriority priority = ClaimPriority.valueOf(priorityStr);
            return priority == ClaimPriority.HIGH || priority == ClaimPriority.CRITICAL;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isCriticalEquipment(String criticalityStr) {
        if (criticalityStr == null) return false;
        try {
            EquipmentCriticality criticality = EquipmentCriticality.valueOf(criticalityStr);
            return criticality == EquipmentCriticality.HIGH || criticality == EquipmentCriticality.CRITICAL;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private FailureAnalysisSeverity calculateSeverity(
            double multiplier, 
            double affectedRatio, 
            boolean hasSignificantOpenClaims, 
            boolean hasCriticalEquipmentInvolved) {
        
        if (multiplier >= CRITICAL_MULTIPLIER || affectedRatio >= 0.75 || hasCriticalEquipmentInvolved) {
            return FailureAnalysisSeverity.CRITICAL;
        }
        
        if (multiplier >= HIGH_MULTIPLIER || affectedRatio >= 0.60 || hasSignificantOpenClaims) {
            return FailureAnalysisSeverity.HIGH;
        }
        
        if (multiplier >= MEDIUM_MULTIPLIER || affectedRatio >= 0.40) {
            return FailureAnalysisSeverity.MEDIUM;
        }
        
        return FailureAnalysisSeverity.LOW;
    }

    private String buildDeterministicReportId(FailureAnalysisType type, String scopeString, int periodDays) {
        String base = type.name() + "_" + scopeString + "_" + periodDays + "D";
        // Sanitize string to make it URL safe and clean
        return base.replaceAll("[^a-zA-Z0-9_]", "_").replaceAll("_+", "_").toUpperCase();
    }

    private List<FailureAnalysisTimelineEventDto> buildTimeline(
            List<FailureAnalysisClaimDto> claims, 
            List<FailureAnalysisWorkOrderDto> workOrders) {
            
        List<FailureAnalysisTimelineEventDto> timeline = new ArrayList<>();
        
        if (claims != null) {
            for (FailureAnalysisClaimDto claim : claims) {
                if (claim.getCreatedAt() != null) {
                    timeline.add(FailureAnalysisTimelineEventDto.builder()
                            .date(claim.getCreatedAt())
                            .eventType("CLAIM_CREATED")
                            .label("Claim " + claim.getClaimCode() + " created for " + claim.getEquipmentName())
                            .build());
                }
            }
        }
        
        if (workOrders != null) {
            for (FailureAnalysisWorkOrderDto wo : workOrders) {
                if (wo.getCreatedAt() != null) {
                    timeline.add(FailureAnalysisTimelineEventDto.builder()
                            .date(wo.getCreatedAt())
                            .eventType("WORK_ORDER_CREATED")
                            .label("Work order " + wo.getWorkOrderCode() + " created")
                            .build());
                }
                if (wo.getCompletedAt() != null) {
                    timeline.add(FailureAnalysisTimelineEventDto.builder()
                            .date(wo.getCompletedAt())
                            .eventType("WORK_ORDER_COMPLETED")
                            .label("Work order " + wo.getWorkOrderCode() + " completed")
                            .build());
                }
            }
        }
        
        // Sort chronologically
        timeline.sort(Comparator.comparing(FailureAnalysisTimelineEventDto::getDate));
        
        return timeline;
    }

    private List<FailureAnalysisReportDetailDto> detectMaintenanceCostConcentration(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<com.cmms.maintenance.entity.WorkOrder> periodWos = workOrderRepository.findAll().stream()
                .filter(wo -> wo.getCreatedAt() != null && !wo.getCreatedAt().isBefore(fromDate) && wo.getCreatedAt().isBefore(toDate))
                .filter(wo -> wo.getActualCost() != null)
                .collect(Collectors.toList());

        if (periodWos.isEmpty()) return reports;

        BigDecimal totalHospitalCost = periodWos.stream()
                .map(com.cmms.maintenance.entity.WorkOrder::getActualCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalHospitalCost.compareTo(BigDecimal.ZERO) <= 0) return reports;

        List<Equipment> allEquipment = equipmentRepository.findAll();
        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        // Group by department
        Map<Integer, List<com.cmms.maintenance.entity.WorkOrder>> wosByDept = new HashMap<>();
        for (com.cmms.maintenance.entity.WorkOrder wo : periodWos) {
            Equipment eq = allEquipment.stream().filter(e -> e.getEquipmentId().equals(wo.getEquipmentId())).findFirst().orElse(null);
            if (eq != null && eq.getDepartmentId() != null) {
                wosByDept.computeIfAbsent(eq.getDepartmentId(), k -> new ArrayList<>()).add(wo);
            }
        }

        for (Map.Entry<Integer, List<com.cmms.maintenance.entity.WorkOrder>> entry : wosByDept.entrySet()) {
            Integer deptId = entry.getKey();
            List<com.cmms.maintenance.entity.WorkOrder> deptWos = entry.getValue();
            Department dept = deptMap.get(deptId);
            if (dept == null) continue;

            BigDecimal deptCost = deptWos.stream()
                    .map(com.cmms.maintenance.entity.WorkOrder::getActualCost)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            double costShare = deptCost.doubleValue() / totalHospitalCost.doubleValue();
            
            long deptEqCount = allEquipment.stream().filter(e -> deptId.equals(e.getDepartmentId())).count();
            double eqShare = (double) deptEqCount / (allEquipment.isEmpty() ? 1 : allEquipment.size());
            
            double concentrationRatio = safeDivide(costShare, eqShare);

            if (concentrationRatio > 1.3 && deptCost.compareTo(new BigDecimal("1000")) > 0) {
                FailureAnalysisSeverity severity = calculateSeverity(concentrationRatio, costShare, false, false);
                String reportId = buildDeterministicReportId(FailureAnalysisType.MAINTENANCE_COST_CONCENTRATION, String.valueOf(deptId), period.getDays());
                String mainFinding = String.format("%s consumes %.1f%% of total maintenance cost (%.0f) while owning only %.1f%% of equipment.", 
                        dept.getDepartmentName(), costShare * 100, deptCost.doubleValue(), eqShare * 100);
                String businessSignal = "High cost concentration in a specific department may indicate aging equipment, poor operational conditions, or excessive emergency repairs.";
                FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                        .equipmentCount((int) deptEqCount)
                        .claimCount(deptWos.size())
                        .totalActualCost(deptCost)
                        .averageCostPerWorkOrder(new BigDecimal(deptCost.doubleValue() / deptWos.size()))
                        .groupShareOfTotalCost(costShare)
                        .costConcentrationRatio(concentrationRatio)
                        .build();
                reports.add(FailureAnalysisReportDetailDto.builder()
                        .id(reportId).type(FailureAnalysisType.MAINTENANCE_COST_CONCENTRATION.name()).title("Cost Concentration: " + dept.getDepartmentName()).severity(severity.name()).period(period)
                        .scope(FailureAnalysisScopeDto.builder().departmentId(deptId).departmentName(dept.getDepartmentName()).build())
                        .summary(FailureAnalysisSummaryDto.builder().mainFinding(mainFinding).businessSignal(businessSignal).generatedAt(LocalDateTime.now()).build())
                        .metrics(metrics)
                        .workOrders(deptWos.stream().map(this::mapToWorkOrderDto).collect(Collectors.toList()))
                        .detectionExplanation(List.of(String.format("Department maintenance cost is %.1fx higher than expected based on its equipment share.", concentrationRatio)))
                        .build());
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectSparePartUsageConcentration(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();
        List<PartUsage> periodUsages = partUsageRepository.findAll().stream()
                .filter(u -> u.getUsedAt() != null && !u.getUsedAt().isBefore(fromDate) && u.getUsedAt().isBefore(toDate))
                .collect(Collectors.toList());
        if (periodUsages.isEmpty()) return reports;
        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<com.cmms.maintenance.entity.WorkOrder> allWos = workOrderRepository.findAll();
        Map<Integer, Department> deptMap = departmentRepository.findAll().stream().collect(Collectors.toMap(Department::getDepartmentId, d -> d));
        Map<Integer, List<PartUsage>> usagesByDept = new HashMap<>();
        for (PartUsage usage : periodUsages) {
            com.cmms.maintenance.entity.WorkOrder wo = allWos.stream().filter(w -> w.getWoId().equals(usage.getWoId())).findFirst().orElse(null);
            if (wo != null) {
                Equipment eq = allEquipment.stream().filter(e -> e.getEquipmentId().equals(wo.getEquipmentId())).findFirst().orElse(null);
                if (eq != null && eq.getDepartmentId() != null) usagesByDept.computeIfAbsent(eq.getDepartmentId(), k -> new ArrayList<>()).add(usage);
            }
        }
        for (Map.Entry<Integer, List<PartUsage>> entry : usagesByDept.entrySet()) {
            Integer deptId = entry.getKey(); List<PartUsage> deptUsages = entry.getValue(); Department dept = deptMap.get(deptId); if (dept == null) continue;
            int totalQuantity = deptUsages.stream().mapToInt(PartUsage::getQuantityUsed).sum();
            BigDecimal deptPartCost = deptUsages.stream().map(u -> u.getUnitCostAtUsage() != null ? u.getUnitCostAtUsage().multiply(new BigDecimal(u.getQuantityUsed())) : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (deptUsages.size() >= 5 || deptPartCost.compareTo(new BigDecimal("500")) > 0) {
                String reportId = buildDeterministicReportId(FailureAnalysisType.SPARE_PART_USAGE_CONCENTRATION, String.valueOf(deptId), period.getDays());
                String mainFinding = String.format("%s consumed %d spare parts totaling %.2f in cost.", dept.getDepartmentName(), totalQuantity, deptPartCost.doubleValue());
                reports.add(FailureAnalysisReportDetailDto.builder()
                        .id(reportId).type(FailureAnalysisType.SPARE_PART_USAGE_CONCENTRATION.name()).title("Spare Part Concentration: " + dept.getDepartmentName()).severity(FailureAnalysisSeverity.MEDIUM.name()).period(period)
                        .scope(FailureAnalysisScopeDto.builder().departmentId(deptId).departmentName(dept.getDepartmentName()).build())
                        .summary(FailureAnalysisSummaryDto.builder().mainFinding(mainFinding).businessSignal("High spare part consumption often correlates with frequent breakdowns.").generatedAt(LocalDateTime.now()).build())
                        .metrics(FailureAnalysisMetricsDto.builder().partUsageCount(deptUsages.size()).quantityUsed(totalQuantity).totalPartCost(deptPartCost).build())
                        .workOrders(deptUsages.stream()
                                .map(u -> allWos.stream().filter(w -> w.getWoId().equals(u.getWoId())).findFirst().orElse(null))
                                .filter(Objects::nonNull)
                                .distinct()
                                .map(this::mapToWorkOrderDto)
                                .collect(Collectors.toList()))
                        .build());
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectEarlyLifeEquipmentClaims(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        if (periodClaims.isEmpty()) return reports;

        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        for (Equipment eq : allEquipment) {
            LocalDate startDate = eq.getCommissioningDate() != null ? eq.getCommissioningDate() : eq.getPurchaseDate();
            if (startDate == null) continue;

            List<Claim> eqClaims = claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>());
            if (eqClaims.isEmpty()) continue;

            // Find claims within 180 days of start date
            List<Claim> earlyLifeClaims = eqClaims.stream()
                    .filter(c -> !c.getCreatedAt().toLocalDate().isBefore(startDate) 
                            && !c.getCreatedAt().toLocalDate().isAfter(startDate.plusDays(EARLY_LIFE_DAYS)))
                    .collect(Collectors.toList());

            if (earlyLifeClaims.size() >= minClaims) {
                Department dept = deptMap.get(eq.getDepartmentId());
                String deptName = dept != null ? dept.getDepartmentName() : "Unknown";
                
                LocalDateTime firstClaimDate = earlyLifeClaims.stream()
                        .map(Claim::getCreatedAt)
                        .min(LocalDateTime::compareTo)
                        .orElse(null);
                        
                long daysToFirstClaim = firstClaimDate != null ? java.time.temporal.ChronoUnit.DAYS.between(startDate, firstClaimDate.toLocalDate()) : 0;

                FailureAnalysisSeverity severity = earlyLifeClaims.size() > 5 ? FailureAnalysisSeverity.CRITICAL : FailureAnalysisSeverity.HIGH;

                String reportId = buildDeterministicReportId(FailureAnalysisType.EARLY_LIFE_EQUIPMENT_CLAIMS, String.valueOf(eq.getEquipmentId()), period.getDays());
                
                String mainFinding = String.format("Equipment %s (%s) had %d claims within %d days of %s.", 
                        eq.getName(), eq.getAssetCode(), earlyLifeClaims.size(), EARLY_LIFE_DAYS, 
                        eq.getCommissioningDate() != null ? "commissioning" : "purchase");
                
                String businessSignal = "Multiple claims shortly after deployment suggest potential manufacturing defects, improper installation, or commissioning issues.";

                FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                        .equipmentCount(1)
                        .affectedEquipmentCount(1)
                        .claimCount(earlyLifeClaims.size())
                        .purchaseDate(eq.getPurchaseDate() != null ? eq.getPurchaseDate().toString() : null)
                        .commissioningDate(eq.getCommissioningDate() != null ? eq.getCommissioningDate().toString() : null)
                        .daysToFirstClaim((int) daysToFirstClaim)
                        .build();

                reports.add(FailureAnalysisReportDetailDto.builder()
                        .id(reportId)
                        .type(FailureAnalysisType.EARLY_LIFE_EQUIPMENT_CLAIMS.name())
                        .title("Early Life Failure: " + eq.getName())
                        .severity(severity.name())
                        .period(period)
                        .scope(FailureAnalysisScopeDto.builder()
                                .departmentId(eq.getDepartmentId())
                                .departmentName(deptName)
                                .manufacturer(eq.getManufacturer())
                                .model(eq.getModel())
                                .build())
                        .summary(FailureAnalysisSummaryDto.builder()
                                .mainFinding(mainFinding)
                                .businessSignal(businessSignal)
                                .generatedAt(LocalDateTime.now())
                                .build())
                        .metrics(metrics)
                        .affectedEquipment(List.of(FailureAnalysisAffectedEquipmentDto.builder()
                                .equipmentId(eq.getEquipmentId())
                                .assetCode(eq.getAssetCode())
                                .name(eq.getName())
                                .manufacturer(eq.getManufacturer())
                                .model(eq.getModel())
                                .departmentName(deptName)
                                .status(eq.getStatus() != null ? eq.getStatus().name() : null)
                                .criticality(eq.getCriticality() != null ? eq.getCriticality().name() : null)
                                .claimCount(earlyLifeClaims.size())
                                .build()))
                        .claims(earlyLifeClaims.stream().map(c -> FailureAnalysisClaimDto.builder()
                                .claimId(c.getClaimId())
                                .claimCode("CLM-" + c.getClaimId())
                                .status(c.getStatus() != null ? c.getStatus().name() : null)
                                .priority(c.getPriority() != null ? c.getPriority().name() : null)
                                .createdAt(c.getCreatedAt())
                                .linkedWorkOrderId(c.getLinkedWoId())
                                .build()).collect(Collectors.toList()))
                        .workOrders(getWorkOrdersForClaims(earlyLifeClaims))
                        .detectionExplanation(List.of(
                                String.format("Equipment was %s on %s.", eq.getCommissioningDate() != null ? "commissioned" : "purchased", startDate),
                                String.format("First claim occurred %d days later.", daysToFirstClaim),
                                String.format("Total of %d claims within the first %d days.", earlyLifeClaims.size(), EARLY_LIFE_DAYS)
                        ))
                        .build());
            }
        }
        return reports;
    }

    private List<FailureAnalysisReportDetailDto> detectWarrantyPeriodClaims(
            FailureAnalysisPeriodDto period,
            Integer minClaims,
            Integer minAffectedEquipment) {
            
        List<FailureAnalysisReportDetailDto> reports = new ArrayList<>();
        
        LocalDateTime fromDate = LocalDate.parse(period.getFrom()).atStartOfDay();
        LocalDateTime toDate = LocalDate.parse(period.getTo()).plusDays(1).atStartOfDay();

        List<Equipment> allEquipment = equipmentRepository.findAll();
        List<Claim> periodClaims = claimRepository.findAll().stream()
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromDate) && c.getCreatedAt().isBefore(toDate))
                .collect(Collectors.toList());
                
        if (periodClaims.isEmpty()) return reports;

        Map<Integer, List<Claim>> claimsByEq = periodClaims.stream()
                .filter(c -> c.getEquipmentId() != null)
                .collect(Collectors.groupingBy(Claim::getEquipmentId));

        Map<Integer, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        for (Equipment eq : allEquipment) {
            LocalDate warrantyEnd = eq.getWarrantyEndDate();
            if (warrantyEnd == null) continue;

            List<Claim> eqClaims = claimsByEq.getOrDefault(eq.getEquipmentId(), new ArrayList<>());
            if (eqClaims.isEmpty()) continue;

            // Claims during warranty OR within 30 days before warranty end
            List<Claim> warrantyClaims = eqClaims.stream()
                    .filter(c -> !c.getCreatedAt().toLocalDate().isAfter(warrantyEnd))
                    .collect(Collectors.toList());
            
            List<Claim> nearEndClaims = eqClaims.stream()
                    .filter(c -> !c.getCreatedAt().toLocalDate().isBefore(warrantyEnd.minusDays(WARRANTY_WINDOW_DAYS)) 
                            && !c.getCreatedAt().toLocalDate().isAfter(warrantyEnd))
                    .collect(Collectors.toList());

            if (warrantyClaims.size() >= minClaims || !nearEndClaims.isEmpty()) {
                Department dept = deptMap.get(eq.getDepartmentId());
                String deptName = dept != null ? dept.getDepartmentName() : "Unknown";
                
                long daysBeforeEnd = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), warrantyEnd);

                FailureAnalysisSeverity severity = !nearEndClaims.isEmpty() ? FailureAnalysisSeverity.HIGH : FailureAnalysisSeverity.MEDIUM;

                String reportId = buildDeterministicReportId(FailureAnalysisType.WARRANTY_PERIOD_CLAIMS, String.valueOf(eq.getEquipmentId()), period.getDays());
                
                String mainFinding = String.format("Equipment %s (%s) has %d claims during warranty. Warranty ends on %s (%d days left).", 
                        eq.getName(), eq.getAssetCode(), warrantyClaims.size(), warrantyEnd, daysBeforeEnd);
                
                String businessSignal = "Claims occurring during or near the end of the warranty period should be prioritized for warranty recovery and vendor accountability.";

                FailureAnalysisMetricsDto metrics = FailureAnalysisMetricsDto.builder()
                        .equipmentCount(1)
                        .affectedEquipmentCount(1)
                        .claimCount(warrantyClaims.size())
                        .warrantyEndDate(warrantyEnd.toString())
                        .daysBeforeWarrantyEnd((int) daysBeforeEnd)
                        .build();

                reports.add(FailureAnalysisReportDetailDto.builder()
                        .id(reportId)
                        .type(FailureAnalysisType.WARRANTY_PERIOD_CLAIMS.name())
                        .title("Warranty Period Claims: " + eq.getName())
                        .severity(severity.name())
                        .period(period)
                        .scope(FailureAnalysisScopeDto.builder()
                                .departmentId(eq.getDepartmentId())
                                .departmentName(deptName)
                                .manufacturer(eq.getManufacturer())
                                .model(eq.getModel())
                                .build())
                        .summary(FailureAnalysisSummaryDto.builder()
                                .mainFinding(mainFinding)
                                .businessSignal(businessSignal)
                                .generatedAt(LocalDateTime.now())
                                .build())
                        .metrics(metrics)
                        .affectedEquipment(List.of(FailureAnalysisAffectedEquipmentDto.builder()
                                .equipmentId(eq.getEquipmentId())
                                .assetCode(eq.getAssetCode())
                                .name(eq.getName())
                                .manufacturer(eq.getManufacturer())
                                .model(eq.getModel())
                                .departmentName(deptName)
                                .status(eq.getStatus() != null ? eq.getStatus().name() : null)
                                .criticality(eq.getCriticality() != null ? eq.getCriticality().name() : null)
                                .claimCount(warrantyClaims.size())
                                .build()))
                        .claims(warrantyClaims.stream().map(c -> FailureAnalysisClaimDto.builder()
                                .claimId(c.getClaimId())
                                .claimCode("CLM-" + c.getClaimId())
                                .status(c.getStatus() != null ? c.getStatus().name() : null)
                                .priority(c.getPriority() != null ? c.getPriority().name() : null)
                                .createdAt(c.getCreatedAt())
                                .linkedWorkOrderId(c.getLinkedWoId())
                                .build()).collect(Collectors.toList()))
                        .workOrders(getWorkOrdersForClaims(warrantyClaims))
                        .detectionExplanation(List.of(
                                String.format("Warranty expiration date is %s.", warrantyEnd),
                                String.format("Detected %d claims during the warranty period.", warrantyClaims.size()),
                                String.format("%d of these claims occurred within the last %d days of warranty.", nearEndClaims.size(), WARRANTY_WINDOW_DAYS)
                        ))
                        .build());
            }
        }
        return reports;
    }
}
