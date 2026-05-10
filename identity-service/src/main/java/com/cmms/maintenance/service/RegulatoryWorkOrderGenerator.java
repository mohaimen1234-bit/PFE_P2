package com.cmms.maintenance.service;

import com.cmms.maintenance.entity.RegulatoryPlan;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.entity.WoChecklist;
import com.cmms.maintenance.repository.RegulatoryPlanRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.maintenance.repository.WoChecklistRepository;
import com.cmms.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RegulatoryWorkOrderGenerator {

    private final RegulatoryPlanRepository planRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WoChecklistRepository checklistRepository;
    private final NotificationService notificationService;

    /**
     * Runs daily at 1 AM to generate regulatory work orders and send reminders.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void processRegulatoryPlans() {
        log.info("Starting regulatory plans processing...");
        List<RegulatoryPlan> activePlans = planRepository.findAll().stream()
                .filter(RegulatoryPlan::getIsActive)
                .toList();

        LocalDateTime now = LocalDateTime.now();

        for (RegulatoryPlan plan : activePlans) {
            try {
                // 1. Process Generating Work Order
                if (shouldGenerateWorkOrder(plan, now)) {
                    generateWorkOrder(plan);
                }

                // 2. Process Notifications/Reminders
                if (shouldSendReminder(plan, now)) {
                    sendReminderNotification(plan);
                }
            } catch (Exception e) {
                log.error("Error processing regulatory plan {}: {}", plan.getPlanId(), e.getMessage());
            }
        }
    }

    @Transactional
    public void manualGenerate(Integer planId) {
        RegulatoryPlan plan = planRepository.findById(planId).orElse(null);
        if (plan == null) return;
        
        generateWorkOrder(plan);
    }

    private boolean shouldGenerateWorkOrder(RegulatoryPlan plan, LocalDateTime now) {
        // Generate if next due date is today or in the past
        // and if there's no open regulatory WO for this plan
        if (plan.getNextDueDate().isAfter(now)) return false;

        return !workOrderRepository.findAll().stream()
                .filter(wo -> wo.getWoType() == WorkOrder.WorkOrderType.REGULATORY)
                .filter(wo -> plan.getPlanId().equals(wo.getRegulatoryPlanId()))
                .anyMatch(wo -> wo.getStatus() != WorkOrder.WorkOrderStatus.CLOSED && wo.getStatus() != WorkOrder.WorkOrderStatus.CANCELLED);
    }

    private boolean shouldSendReminder(RegulatoryPlan plan, LocalDateTime now) {
        // Send reminder if today is exactly 'reminderDays' before next due date
        LocalDateTime reminderDate = plan.getNextDueDate().minusDays(plan.getReminderDays());
        return now.toLocalDate().equals(reminderDate.toLocalDate());
    }

    private void generateWorkOrder(RegulatoryPlan plan) {
        log.info("Generating Regulatory Work Order for plan: {}", plan.getTitle());

        WorkOrder wo = WorkOrder.builder()
                .title("REGULATORY: " + plan.getTitle())
                .description(plan.getDescription() != null ? plan.getDescription() : "Scheduled Regulatory Maintenance")
                .equipmentId(plan.getEquipmentId())
                .regulatoryPlanId(plan.getPlanId())
                .woType(WorkOrder.WorkOrderType.REGULATORY)
                .priority(plan.getPriority())
                .status(WorkOrder.WorkOrderStatus.CREATED)
                .assignedToUserId(plan.getAssignedTechnicianId())
                .estimatedDuration(plan.getEstimatedDuration())
                .dueDate(plan.getNextDueDate().plusDays(plan.getGracePeriod()))
                .build();

        if (wo.getAssignedToUserId() != null) {
            wo.setStatus(WorkOrder.WorkOrderStatus.ASSIGNED);
        }

        WorkOrder savedWo = workOrderRepository.save(wo);

        // Copy Checklist Template to new WoChecklist entity
        if (plan.getChecklistTemplate() != null && !plan.getChecklistTemplate().isEmpty()) {
            WoChecklist checklist = WoChecklist.builder()
                    .woId(savedWo.getWoId())
                    .itemsJson(plan.getChecklistTemplate()) // Copying the template as the initial state
                    .build();
            checklistRepository.save(checklist);
        }

        // Notify technician
        if (savedWo.getAssignedToUserId() != null) {
            notificationService.sendDirect(
                savedWo.getAssignedToUserId(),
                "INFO",
                "New Regulatory Work Order generated: " + savedWo.getTitle(),
                savedWo.getWoId()
            );
        }
    }

    private void sendReminderNotification(RegulatoryPlan plan) {
        if (plan.getAssignedTechnicianId() == null) return;

        notificationService.sendDirect(
            plan.getAssignedTechnicianId(),
            "WARNING",
            "Upcoming Regulatory Maintenance: " + plan.getTitle() + " due on " + plan.getNextDueDate().toLocalDate(),
            null
        );
    }
}
