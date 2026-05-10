package com.cmms.equipment.controller;

import com.cmms.equipment.client.IdentityServiceClient;
import com.cmms.equipment.dto.EquipmentRequest;
import com.cmms.equipment.dto.EquipmentResponse;
import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.entity.EquipmentCriticality;
import com.cmms.equipment.entity.EquipmentHistory;
import com.cmms.equipment.entity.EquipmentStatus;
import com.cmms.equipment.entity.MeterThreshold;
import com.cmms.equipment.repository.MeterRepository;
import com.cmms.equipment.repository.MeterThresholdRepository;
import com.cmms.equipment.service.EquipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/equipment")
@RequiredArgsConstructor
public class EquipmentController {

    private final EquipmentService equipmentService;
    private final MeterRepository meterRepository;
    private final MeterThresholdRepository meterThresholdRepository;
    private final IdentityServiceClient identityServiceClient;

    @GetMapping
    public List<EquipmentResponse> getAll() {
        return equipmentService.getAllEquipment().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/search")
    public List<EquipmentResponse> search(
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String classification,
            @RequestParam(required = false) String criticality,
            @RequestParam(required = false) String q) {
        return equipmentService.searchEquipment(departmentId, status, classification, criticality, q).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/kpis")
    public Map<String, Long> getKpis() {
        return equipmentService.getEquipmentKpis();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public EquipmentResponse create(@RequestBody EquipmentRequest request) {
        Equipment equipment = Equipment.builder()
                .assetCode(request.getAssetCode())
                .name(request.getName())
                .serialNumber(request.getSerialNumber())
                .status(EquipmentStatus.OPERATIONAL)
                .location(request.getLocation())
                .departmentId(request.getDepartmentId())
                .categoryId(request.getCategoryId())
                .modelId(request.getModelId())
                .manufacturer(request.getManufacturer())
                .modelReference(request.getModelReference())
                .classification(request.getClassification())
                .category(request.getCategory())
                .model(request.getModel())
                .criticality(parseCriticality(request.getCriticality()))
                .meterUnit(request.getMeterUnit())
                .startMeterValue(request.getStartMeterValue())
                .purchaseDate(request.getPurchaseDate())
                .commissioningDate(request.getCommissioningDate())
                .supplierName(request.getSupplierName())
                .contractNumber(request.getContractNumber())
                .warrantyEndDate(request.getWarrantyEndDate())
                .build();
        return mapToResponse(equipmentService.createEquipment(equipment, request.getThresholds()));
    }

    @GetMapping("/{id}")
    public EquipmentResponse getById(@PathVariable Integer id) {
        return mapToResponse(equipmentService.getEquipmentById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public EquipmentResponse update(@PathVariable Integer id, @RequestBody EquipmentRequest request) {
        Equipment update = Equipment.builder()
                .assetCode(request.getAssetCode())
                .name(request.getName())
                .serialNumber(request.getSerialNumber())
                .status(request.getStatus() != null ? EquipmentStatus.valueOf(request.getStatus())
                        : EquipmentStatus.OPERATIONAL)
                .location(request.getLocation())
                .departmentId(request.getDepartmentId())
                .categoryId(request.getCategoryId())
                .modelId(request.getModelId())
                .manufacturer(request.getManufacturer())
                .modelReference(request.getModelReference())
                .classification(request.getClassification())
                .category(request.getCategory())
                .model(request.getModel())
                .criticality(parseCriticality(request.getCriticality()))
                .meterUnit(request.getMeterUnit())
                .startMeterValue(request.getStartMeterValue())
                .purchaseDate(request.getPurchaseDate())
                .commissioningDate(request.getCommissioningDate())
                .supplierName(request.getSupplierName())
                .contractNumber(request.getContractNumber())
                .warrantyEndDate(request.getWarrantyEndDate())
                .build();
        return mapToResponse(equipmentService.updateEquipment(id, update, request.getThresholds()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public EquipmentResponse updateStatus(@PathVariable Integer id, @RequestParam String status) {
        return mapToResponse(equipmentService.updateStatus(id, status));
    }

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    public EquipmentResponse archive(@PathVariable Integer id) {
        return mapToResponse(equipmentService.archiveEquipment(id));
    }

    @GetMapping("/{id}/history")
    public List<EquipmentHistory> getHistory(@PathVariable Integer id) {
        return equipmentService.getHistory(id);
    }

    private EquipmentResponse mapToResponse(Equipment equipment) {
        List<com.cmms.equipment.dto.EquipmentThresholdDto> thresholds = meterRepository
                .findByEquipmentId(equipment.getEquipmentId())
                .map(meter -> meterThresholdRepository.findByMeterId(meter.getMeterId()).stream()
                        .map(t -> com.cmms.equipment.dto.EquipmentThresholdDto.builder()
                                .value(t.getThresholdValue())
                                .label(t.getLabel())
                                .build())
                        .collect(Collectors.toList()))
                .orElse(List.of());

        BigDecimal currentMeterValue = meterRepository.findByEquipmentId(equipment.getEquipmentId())
                .map(com.cmms.equipment.entity.Meter::getValue)
                .orElse(equipment.getStartMeterValue());

        String departmentName = identityServiceClient.getDepartmentName(equipment.getDepartmentId());
        java.time.LocalDateTime lastMaintenance = equipmentService.getLastMaintenanceDate(equipment.getEquipmentId());
        boolean dueForMaintenance = equipmentService.checkIfDueForMaintenance(equipment);

        return EquipmentResponse.builder()
                .equipmentId(equipment.getEquipmentId())
                .assetCode(equipment.getAssetCode())
                .name(equipment.getName())
                .serialNumber(equipment.getSerialNumber())
                .status(equipment.getStatus().name())
                .location(equipment.getLocation())
                .departmentId(equipment.getDepartmentId())
                .departmentName(departmentName)
                .categoryId(equipment.getCategoryId())
                .modelId(equipment.getModelId())
                .manufacturer(equipment.getManufacturer())
                .modelReference(equipment.getModelReference())
                .classification(equipment.getClassification())
                .category(equipment.getCategory())
                .model(equipment.getModel())
                .criticality(equipment.getCriticality() != null ? equipment.getCriticality().name() : null)
                .meterUnit(equipment.getMeterUnit())
                .startMeterValue(currentMeterValue)
                .thresholds(thresholds)
                .purchaseDate(equipment.getPurchaseDate())
                .commissioningDate(equipment.getCommissioningDate())
                .supplierName(equipment.getSupplierName())
                .contractNumber(equipment.getContractNumber())
                .warrantyEndDate(equipment.getWarrantyEndDate())
                .lastMaintenanceDate(lastMaintenance)
                .dueForMaintenance(dueForMaintenance)
                .createdAt(equipment.getCreatedAt())
                .build();
    }

    private EquipmentCriticality parseCriticality(String criticality) {
        if (criticality == null || criticality.isBlank()) {
            return null;
        }
        try {
            return EquipmentCriticality.valueOf(criticality.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Criticality must be LOW, MEDIUM, HIGH, or CRITICAL");
        }
    }
}
