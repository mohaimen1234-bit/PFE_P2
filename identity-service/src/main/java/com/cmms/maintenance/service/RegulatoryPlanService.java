package com.cmms.maintenance.service;

import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.identity.entity.Department;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.identity.entity.User;
import com.cmms.identity.repository.UserRepository;
import com.cmms.maintenance.dto.CreateRegulatoryPlanRequest;
import com.cmms.maintenance.dto.RegulatoryPlanResponse;
import com.cmms.maintenance.dto.UpdateRegulatoryPlanRequest;
import com.cmms.maintenance.entity.RecurrenceUnit;
import com.cmms.maintenance.entity.RegulatoryPlan;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.RegulatoryPlanRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.claims.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RegulatoryPlanService {

    private final RegulatoryPlanRepository planRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final WorkOrderRepository workOrderRepository;

    @Transactional(readOnly = true)
    public List<RegulatoryPlanResponse> list() {
        return planRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RegulatoryPlanResponse getById(Integer id) {
        RegulatoryPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regulatory Plan not found"));
        return toResponse(plan);
    }

    @Transactional
    public RegulatoryPlanResponse create(CreateRegulatoryPlanRequest request) {
        RegulatoryPlan plan = RegulatoryPlan.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .equipmentId(request.getEquipmentId())
                .priority(WorkOrder.WorkOrderPriority.valueOf(request.getPriority().toUpperCase()))
                .recurrenceUnit(RecurrenceUnit.valueOf(request.getRecurrenceUnit().toUpperCase()))
                .recurrenceValue(request.getRecurrenceValue())
                .startDate(request.getStartDate())
                .nextDueDate(request.getStartDate()) // Start date is the first due date
                .reminderDays(request.getReminderDays() != null ? request.getReminderDays() : 7)
                .gracePeriod(request.getGracePeriod() != null ? request.getGracePeriod() : 0)
                .isMandatory(request.getIsMandatory() != null ? request.getIsMandatory() : true)
                .isActive(true)
                .complianceReference(request.getComplianceReference())
                .requiresDocument(request.getRequiresDocument() != null ? request.getRequiresDocument() : false)
                .documentType(request.getDocumentType())
                .assignedTechnicianId(request.getAssignedTechnicianId())
                .estimatedDuration(request.getEstimatedDuration())
                .checklistTemplate(request.getChecklistTemplate())
                .build();

        // Generate unique plan code
        RegulatoryPlan saved = planRepository.save(plan);
        saved.setPlanCode(String.format("RP-%03d", saved.getPlanId()));
        return toResponse(planRepository.save(saved));
    }

    @Transactional
    public RegulatoryPlanResponse update(Integer id, UpdateRegulatoryPlanRequest request) {
        RegulatoryPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regulatory Plan not found"));

        if (request.getTitle() != null) plan.setTitle(request.getTitle());
        if (request.getDescription() != null) plan.setDescription(request.getDescription());
        if (request.getPriority() != null) plan.setPriority(WorkOrder.WorkOrderPriority.valueOf(request.getPriority().toUpperCase()));
        if (request.getRecurrenceUnit() != null) plan.setRecurrenceUnit(RecurrenceUnit.valueOf(request.getRecurrenceUnit().toUpperCase()));
        if (request.getRecurrenceValue() != null) plan.setRecurrenceValue(request.getRecurrenceValue());
        if (request.getReminderDays() != null) plan.setReminderDays(request.getReminderDays());
        if (request.getGracePeriod() != null) plan.setGracePeriod(request.getGracePeriod());
        if (request.getIsMandatory() != null) plan.setIsMandatory(request.getIsMandatory());
        if (request.getIsActive() != null) plan.setIsActive(request.getIsActive());
        if (request.getComplianceReference() != null) plan.setComplianceReference(request.getComplianceReference());
        if (request.getRequiresDocument() != null) plan.setRequiresDocument(request.getRequiresDocument());
        if (request.getDocumentType() != null) plan.setDocumentType(request.getDocumentType());
        if (request.getAssignedTechnicianId() != null) plan.setAssignedTechnicianId(request.getAssignedTechnicianId());
        if (request.getEstimatedDuration() != null) plan.setEstimatedDuration(request.getEstimatedDuration());
        if (request.getChecklistTemplate() != null) plan.setChecklistTemplate(request.getChecklistTemplate());
        if (request.getPostponementReason() != null) plan.setPostponementReason(request.getPostponementReason());
        if (request.getNextDueDate() != null) plan.setNextDueDate(request.getNextDueDate());

        return toResponse(planRepository.save(plan));
    }

    @Transactional
    public void scheduleNextExecution(Integer planId, LocalDateTime actualExecutionDate) {
        RegulatoryPlan plan = planRepository.findById(planId).orElse(null);
        if (plan == null) return;

        plan.setLastExecutionDate(actualExecutionDate);
        
        // Compute next due date from original scheduled date to avoid drift
        LocalDateTime currentDue = plan.getNextDueDate();
        LocalDateTime nextDue = calculateNextDueDate(currentDue, plan.getRecurrenceUnit(), plan.getRecurrenceValue());
        
        plan.setNextDueDate(nextDue);
        plan.setPostponementReason(null); // Clear postponement reason for the new cycle
        planRepository.save(plan);
    }

    private LocalDateTime calculateNextDueDate(LocalDateTime current, RecurrenceUnit unit, int value) {
        return switch (unit) {
            case MONTHLY -> current.plusMonths(value);
            case QUARTERLY -> current.plusMonths(value * 3L);
            case SEMI_ANNUAL -> current.plusMonths(value * 6L);
            case ANNUAL -> current.plusYears(value);
        };
    }

    private RegulatoryPlanResponse toResponse(RegulatoryPlan plan) {
        Equipment equipment = equipmentRepository.findById(plan.getEquipmentId()).orElse(null);
        User technician = plan.getAssignedTechnicianId() == null ? null : userRepository.findById(plan.getAssignedTechnicianId()).orElse(null);

        String status = "ACTIVE";
        LocalDateTime now = LocalDateTime.now();
        
        // Check if there is already an active Work Order for this plan
        boolean hasActiveWO = workOrderRepository.existsByRegulatoryPlanIdAndStatusNotIn(
                plan.getPlanId(),
                List.of(WorkOrder.WorkOrderStatus.CLOSED, WorkOrder.WorkOrderStatus.VALIDATED, WorkOrder.WorkOrderStatus.CANCELLED)
        );

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            status = "INACTIVE";
        } else if (hasActiveWO) {
            status = "IN_PROGRESS";
        } else if (plan.getNextDueDate().isBefore(now)) {
            status = "OVERDUE";
        } else if (plan.getNextDueDate().isBefore(now.plusDays(plan.getReminderDays()))) {
            status = "DUE_SOON";
        } else if (plan.getNextDueDate().isAfter(now.plusDays(plan.getReminderDays()))) {
            status = "UPCOMING";
        }

        String deptName = "N/A";
        if (equipment != null && equipment.getDepartmentId() != null) {
            deptName = departmentRepository.findById(equipment.getDepartmentId())
                    .map(Department::getDepartmentName)
                    .orElse("N/A");
        }

        return RegulatoryPlanResponse.builder()
                .planId(plan.getPlanId())
                .planCode(plan.getPlanCode())
                .title(plan.getTitle())
                .description(plan.getDescription())
                .equipmentId(plan.getEquipmentId())
                .equipmentName(equipment == null ? "Unknown" : equipment.getName())
                .departmentName(deptName)
                .priority(plan.getPriority().name())
                .recurrenceUnit(plan.getRecurrenceUnit().name())
                .recurrenceValue(plan.getRecurrenceValue())
                .startDate(plan.getStartDate())
                .nextDueDate(plan.getNextDueDate())
                .lastExecutionDate(plan.getLastExecutionDate())
                .reminderDays(plan.getReminderDays())
                .gracePeriod(plan.getGracePeriod())
                .isMandatory(plan.getIsMandatory())
                .isActive(plan.getIsActive())
                .complianceReference(plan.getComplianceReference())
                .requiresDocument(plan.getRequiresDocument())
                .documentType(plan.getDocumentType())
                .assignedTechnicianId(plan.getAssignedTechnicianId())
                .assignedTechnicianName(technician == null ? "Unassigned" : technician.getFullName())
                .estimatedDuration(plan.getEstimatedDuration())
                .checklistTemplate(plan.getChecklistTemplate())
                .postponementReason(plan.getPostponementReason())
                .status(status)
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }
}
