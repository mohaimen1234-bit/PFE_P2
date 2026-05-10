package com.cmms.maintenance.service;

import com.cmms.maintenance.dto.CreateMaintenancePlanRequest;
import com.cmms.maintenance.entity.MaintenancePlan;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.MaintenancePlanRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.claims.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenancePlanService {

    private final MaintenancePlanRepository planRepository;
    private final WorkOrderRepository workOrderRepository;
    private final com.cmms.equipment.repository.MeterRepository meterRepository;

    @Scheduled(cron = "0 0 1 * * ?") // Run every day at 1 AM
    @Transactional
    public void generateScheduledWorkOrders() {
        log.info("Starting automated Work Order generation from maintenance plans");
        LocalDateTime now = LocalDateTime.now();
        List<MaintenancePlan> duePlans = planRepository.findByIsActiveTrueAndNextDueDateBefore(now);

        for (MaintenancePlan plan : duePlans) {
            createWorkOrderFromPlan(plan);
        }
        log.info("Finished automated Work Order generation. Total created: {}", duePlans.size());
    }

    @Transactional
    public void createWorkOrderFromPlan(MaintenancePlan plan) {
        WorkOrder wo = WorkOrder.builder()
                .equipmentId(plan.getEquipmentId())
                .woType(WorkOrder.WorkOrderType.PREVENTIVE)
                .priority(WorkOrder.WorkOrderPriority.MEDIUM)
                .status(WorkOrder.WorkOrderStatus.CREATED)
                .title("Scheduled: " + plan.getTitle())
                .description(plan.getDescription())
                .dueDate(plan.getNextDueDate())
                .isArchived(false)
                .build();

        workOrderRepository.save(wo);

        // Update plan next due date
        plan.setLastGenerationDate(LocalDateTime.now());
        plan.setNextDueDate(calculateNextDueDate(plan.getNextDueDate(), plan.getFrequencyType(), plan.getFrequencyValue()));
        planRepository.save(plan);
    }

    private LocalDateTime calculateNextDueDate(LocalDateTime current, MaintenancePlan.FrequencyType type, int value) {
        return switch (type) {
            case DAYS -> current.plusDays(value);
            case WEEKS -> current.plusWeeks(value);
            case MONTHS -> current.plusMonths(value);
            case METER -> current; // Meter based plans need external trigger
        };
    }

    @Transactional(readOnly = true)
    public List<MaintenancePlan> getAll() {
        return planRepository.findAll();
    }

    @Transactional
    public MaintenancePlan create(CreateMaintenancePlanRequest request) {
        LocalDateTime nextDue = null;
        if (request.getNextDueDate() != null && !request.getNextDueDate().isBlank()) {
            try {
                // Handle different date formats or just ISO
                nextDue = LocalDateTime.parse(request.getNextDueDate());
            } catch (Exception e) {
                // If it fails, try just date part
                try {
                    nextDue = java.time.LocalDate.parse(request.getNextDueDate()).atStartOfDay();
                } catch (Exception e2) {
                    nextDue = LocalDateTime.now();
                }
            }
        }

        MaintenancePlan.FrequencyType type = MaintenancePlan.FrequencyType.valueOf(request.getFrequencyType());
        if (nextDue == null) {
            nextDue = calculateNextDueDate(LocalDateTime.now(), type, request.getFrequencyValue());
        }

        MaintenancePlan plan = MaintenancePlan.builder()
                .equipmentId(request.getEquipmentId())
                .title(request.getTitle())
                .description(request.getDescription())
                .frequencyType(type)
                .frequencyValue(request.getFrequencyValue())
                .nextDueDate(nextDue)
                .meterId(request.getMeterId())
                .nextMeterReading(request.getNextMeterReading())
                .isActive(true)
                .build();
        
        // If it's a meter plan and next reading isn't set, initialize it from current meter value
        if (type == MaintenancePlan.FrequencyType.METER && plan.getMeterId() != null && plan.getNextMeterReading() == null) {
            meterRepository.findById(plan.getMeterId()).ifPresent(meter -> {
                java.math.BigDecimal current = meter.getValue() != null ? meter.getValue() : java.math.BigDecimal.ZERO;
                plan.setNextMeterReading(current.add(java.math.BigDecimal.valueOf(plan.getFrequencyValue())));
            });
        }

        return planRepository.save(plan);
    }

    @Transactional
    public MaintenancePlan create(MaintenancePlan plan) {
        if (plan.getNextDueDate() == null) {
            plan.setNextDueDate(calculateNextDueDate(LocalDateTime.now(), plan.getFrequencyType(), plan.getFrequencyValue()));
        }
        return planRepository.save(plan);
    }
}
