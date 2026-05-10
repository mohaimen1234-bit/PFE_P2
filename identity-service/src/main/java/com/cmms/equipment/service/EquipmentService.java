package com.cmms.equipment.service;

import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.entity.EquipmentHistory;
import com.cmms.equipment.entity.EquipmentStatus;
import com.cmms.equipment.entity.Meter;
import com.cmms.equipment.entity.MeterThreshold;
import com.cmms.equipment.exception.ResourceNotFoundException;
import com.cmms.equipment.repository.EquipmentCategoryRepository;
import com.cmms.equipment.repository.EquipmentModelRepository;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.equipment.repository.MeterThresholdRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.identity.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

import com.cmms.equipment.repository.EquipmentHistoryRepository;
import com.cmms.equipment.repository.MeterRepository;

import com.cmms.equipment.client.IdentityServiceClient;
import com.cmms.identity.security.UserPrincipal;

import java.util.List;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final EquipmentHistoryRepository historyRepository;
    private final MeterRepository meterRepository;
    private final MeterThresholdRepository meterThresholdRepository;
    private final EquipmentCategoryRepository categoryRepository;
    private final EquipmentModelRepository modelRepository;
    private final IdentityServiceClient identityServiceClient;
    private final WorkOrderRepository workOrderRepository;
    private final AuditLogService auditLogService;

    private String getCurrentUserIdOrEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return "SYSTEM"; // Fallback for internal calls
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            Integer userId = userPrincipal.getUser().getUserId();
            return userId != null ? String.valueOf(userId) : userPrincipal.getUsername();
        }
        return authentication.getName();
    }

    @Transactional(readOnly = true)
    public List<Equipment> getAllEquipment() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal up) {
            com.cmms.identity.entity.User u = up.getUser();
            if (u != null && u.hasRole("TECHNICIAN") && u.getDepartment() != null) {
                return equipmentRepository.findAllByDepartmentId(u.getDepartment().getDepartmentId());
            }
        }
        return equipmentRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Equipment> searchEquipment(Integer departmentId, String status, String classification,
            String criticality, String query) {
        Specification<Equipment> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (departmentId != null) {
                predicates.add(cb.equal(root.get("departmentId"), departmentId));
            }
            if (status != null && !status.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("status"), EquipmentStatus.valueOf(status.toUpperCase())));
                } catch (IllegalArgumentException ignored) {
                }
            }
            if (classification != null && !classification.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("classification")), classification.toLowerCase()));
            }
            if (criticality != null && !criticality.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("criticality"),
                            com.cmms.equipment.entity.EquipmentCriticality.valueOf(criticality.toUpperCase())));
                } catch (IllegalArgumentException ignored) {
                }
            }
            if (query != null && !query.isBlank()) {
                String likePattern = "%" + query.toLowerCase() + "%";
                Predicate nameOrSerial = cb.or(
                        cb.like(cb.lower(root.get("name")), likePattern),
                        cb.like(cb.lower(root.get("serialNumber")), likePattern),
                        cb.like(cb.lower(root.get("assetCode")), likePattern),
                        cb.like(cb.lower(root.get("location")), likePattern));
                predicates.add(nameOrSerial);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // For Technicians, force department filtering even in search
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal up) {
            com.cmms.identity.entity.User u = up.getUser();
            if (u != null && u.hasRole("TECHNICIAN") && u.getDepartment() != null) {
                final Integer forcedDeptId = u.getDepartment().getDepartmentId();
                Specification<Equipment> deptSpec = (root, cq, cb) -> cb.equal(root.get("departmentId"), forcedDeptId);
                spec = spec.and(deptSpec);
            }
        }

        return equipmentRepository.findAll(spec);
    }

    @Transactional(readOnly = true)
    public Equipment getEquipmentById(Integer id) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with ID: " + id));

        // Check department access for Technicians
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal up) {
            com.cmms.identity.entity.User u = up.getUser();
            if (u != null && u.hasRole("TECHNICIAN") && u.getDepartment() != null) {
                if (!u.getDepartment().getDepartmentId().equals(equipment.getDepartmentId())) {
                    throw new ResourceNotFoundException("Equipment not found or access denied for your department.");
                }
            }
        }
        return equipment;
    }

    @Transactional
    public Equipment createEquipment(Equipment equipment,
            List<com.cmms.equipment.dto.EquipmentThresholdDto> thresholds) {
        validateDepartment(equipment.getDepartmentId());
        validateCategoryAndModel(equipment.getCategoryId(), equipment.getModelId());

        // Handle Default Criticality
        if (equipment.getCriticality() == null) {
            equipment.setCriticality(com.cmms.equipment.entity.EquipmentCriticality.LOW);
        }

        Equipment saved = equipmentRepository.save(equipment);
        ensureMeterForEquipment(saved, thresholds);
        logHistory(saved.getEquipmentId(), "CREATED", getCurrentUserIdOrEmail());
        logToAudit(saved.getEquipmentId(), "CREATE_EQUIPMENT", "Equipment created: " + saved.getName());
        return saved;
    }

    @Transactional
    public Equipment updateEquipment(Integer id, Equipment update,
            List<com.cmms.equipment.dto.EquipmentThresholdDto> thresholds) {
        validateDepartment(update.getDepartmentId());
        validateCategoryAndModel(update.getCategoryId(), update.getModelId());

        Equipment existing = getEquipmentById(id);
        if (update.getAssetCode() != null && !update.getAssetCode().isBlank()) {
            existing.setAssetCode(update.getAssetCode());
        }
        existing.setName(update.getName());
        existing.setSerialNumber(update.getSerialNumber());
        existing.setStatus(update.getStatus());
        existing.setLocation(update.getLocation());
        existing.setDepartmentId(update.getDepartmentId());
        existing.setCategoryId(update.getCategoryId());
        existing.setModelId(update.getModelId());
        existing.setManufacturer(update.getManufacturer());
        existing.setModelReference(update.getModelReference());
        existing.setClassification(update.getClassification());
        existing.setCategory(update.getCategory());
        existing.setModel(update.getModel());

        // Handle Criticality Default in Update
        if (update.getCriticality() != null) {
            existing.setCriticality(update.getCriticality());
        } else if (existing.getCriticality() == null) {
            existing.setCriticality(com.cmms.equipment.entity.EquipmentCriticality.LOW);
        }
        existing.setMeterUnit(update.getMeterUnit());
        existing.setStartMeterValue(update.getStartMeterValue());
        existing.setPurchaseDate(update.getPurchaseDate());
        existing.setCommissioningDate(update.getCommissioningDate());
        existing.setSupplierName(update.getSupplierName());
        existing.setContractNumber(update.getContractNumber());
        existing.setWarrantyEndDate(update.getWarrantyEndDate());

        Equipment saved = equipmentRepository.save(existing);
        ensureMeterForEquipment(saved, thresholds);
        logHistory(saved.getEquipmentId(), "UPDATED", getCurrentUserIdOrEmail());
        logToAudit(saved.getEquipmentId(), "UPDATE_EQUIPMENT", "Equipment profile updated: " + saved.getName());
        return saved;
    }

    @Transactional
    public Equipment updateStatus(Integer id, String status) {
        Equipment existing = getEquipmentById(id);
        EquipmentStatus oldStatus = existing.getStatus();
        existing.setStatus(EquipmentStatus.valueOf(status));

        Equipment saved = equipmentRepository.save(existing);
        logHistory(saved.getEquipmentId(), "STATUS_CHANGE: " + oldStatus + " -> " + status, getCurrentUserIdOrEmail());
        logToAudit(saved.getEquipmentId(), "STATUS_CHANGE", "Status changed to " + status);
        return saved;
    }

    @Transactional
    public Equipment archiveEquipment(Integer id) {
        Equipment existing = getEquipmentById(id);
        existing.setStatus(EquipmentStatus.ARCHIVED);

        Equipment saved = equipmentRepository.save(existing);
        logHistory(saved.getEquipmentId(), "ARCHIVED", getCurrentUserIdOrEmail());
        logToAudit(saved.getEquipmentId(), "ARCHIVE_EQUIPMENT", "Equipment archived");
        return saved;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getEquipmentKpis() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Integer deptId = null;
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal up) {
            com.cmms.identity.entity.User u = up.getUser();
            if (u != null && u.hasRole("TECHNICIAN") && u.getDepartment() != null) {
                deptId = u.getDepartment().getDepartmentId();
            }
        }

        final Integer finalDeptId = deptId;
        List<Equipment> scope;
        if (finalDeptId != null) {
            scope = equipmentRepository.findAllByDepartmentId(finalDeptId);
        } else {
            scope = equipmentRepository.findAll();
        }

        Map<String, Long> kpis = new HashMap<>();
        kpis.put("totalEquipment", (long) scope.size());
        kpis.put("criticalEquipment", scope.stream()
                .filter(e -> e.getCriticality() == com.cmms.equipment.entity.EquipmentCriticality.CRITICAL)
                .count());

        // Count both OUT_OF_SERVICE and UNDER_REPAIR as Out of Service
        long outOfServiceCount = scope.stream()
                .filter(e -> e.getStatus() == EquipmentStatus.OUT_OF_SERVICE
                        || e.getStatus() == EquipmentStatus.UNDER_REPAIR)
                .count();
        kpis.put("outOfService", outOfServiceCount);

        // Due for maintenance calculation
        long dueCount = scope.stream()
                .filter(this::checkIfDueForMaintenance)
                .count();
        kpis.put("dueForMaintenance", dueCount);

        return kpis;
    }

    public boolean checkIfDueForMaintenance(Equipment equipment) {
        return meterRepository.findByEquipmentId(equipment.getEquipmentId())
                .map(meter -> {
                    BigDecimal currentValue = meter.getValue() != null ? meter.getValue() : BigDecimal.ZERO;
                    List<MeterThreshold> thresholds = meterThresholdRepository.findByMeterId(meter.getMeterId());
                    return thresholds.stream().anyMatch(t -> currentValue.compareTo(t.getThresholdValue()) >= 0);
                })
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public LocalDateTime getLastMaintenanceDate(Integer equipmentId) {
        return workOrderRepository.findByEquipmentId(equipmentId).stream()
                .filter(wo -> wo.getStatus() == WorkOrder.WorkOrderStatus.COMPLETED ||
                        wo.getStatus() == WorkOrder.WorkOrderStatus.VALIDATED ||
                        wo.getStatus() == WorkOrder.WorkOrderStatus.CLOSED)
                .map(WorkOrder::getCompletedAt)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<EquipmentHistory> getHistory(Integer equipmentId) {
        return historyRepository.findByEquipmentIdOrderByCreatedAtDesc(equipmentId);
    }

    private void logToAudit(Integer equipmentId, String actionType, String details) {
        Integer userId = null;
        String userName = "SYSTEM";

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
            userId = principal.getUser().getUserId();
            userName = principal.getUser().getFullName();
        }

        auditLogService.log(userId, userName, actionType, "EQUIPMENT", equipmentId, details);
    }

    private void logHistory(Integer equipmentId, String action, String performedBy) {
        EquipmentHistory history = EquipmentHistory.builder()
                .equipmentId(equipmentId)
                .action(action)
                .performedBy(performedBy)
                .build();
        historyRepository.save(history);
    }

    private void validateDepartment(Integer departmentId) {
        if (departmentId != null) {
            try {
                boolean exists = identityServiceClient.checkDepartmentExists(departmentId);
                if (!exists) {
                    throw new IllegalArgumentException(
                            "Department ID does not exist in Identity Service: " + departmentId);
                }
            } catch (Exception e) {
                throw new RuntimeException("Failed to validate Department ID with Identity Service", e);
            }
        }
    }

    private void validateCategoryAndModel(Integer categoryId, Integer modelId) {
        if (categoryId != null && !categoryRepository.existsById(categoryId)) {
            throw new IllegalArgumentException("Category not found with ID: " + categoryId);
        }
        if (modelId != null && !modelRepository.existsById(modelId)) {
            throw new IllegalArgumentException("Model not found with ID: " + modelId);
        }
    }

    private void ensureMeterForEquipment(Equipment equipment,
            List<com.cmms.equipment.dto.EquipmentThresholdDto> thresholds) {
        if (equipment == null || equipment.getEquipmentId() == null) {
            return;
        }
        if (equipment.getStartMeterValue() != null && equipment.getStartMeterValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Start meter value must be non-negative");
        }
        Meter meter = meterRepository.findByEquipmentId(equipment.getEquipmentId())
                .orElseGet(() -> Meter.builder()
                        .equipmentId(equipment.getEquipmentId())
                        .name(equipment.getName() + " Usage")
                        .unit(equipment.getMeterUnit())
                        .meterType("ODOMETER")
                        .value(equipment.getStartMeterValue() != null ? equipment.getStartMeterValue()
                                : BigDecimal.ZERO)
                        .lastReadingAt(java.time.LocalDateTime.now())
                        .build());

        meter.setName(equipment.getName() + " Usage");
        meter.setUnit(equipment.getMeterUnit());
        if (meter.getValue() == null && equipment.getStartMeterValue() != null) {
            meter.setValue(equipment.getStartMeterValue());
        }
        Meter savedMeter = meterRepository.save(meter);
        updateThresholdsForMeter(savedMeter.getMeterId(), thresholds);
    }

    private void updateThresholdsForMeter(Integer meterId,
            List<com.cmms.equipment.dto.EquipmentThresholdDto> thresholds) {
        if (meterId == null || thresholds == null) {
            return;
        }
        meterThresholdRepository.deleteByMeterId(meterId);
        for (com.cmms.equipment.dto.EquipmentThresholdDto dto : thresholds) {
            if (dto.getValue() == null || dto.getValue().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Threshold values must be non-negative");
            }
            MeterThreshold threshold = MeterThreshold.builder()
                    .meterId(meterId)
                    .thresholdValue(dto.getValue())
                    .label(dto.getLabel())
                    .build();
            meterThresholdRepository.save(threshold);
        }
    }
}
