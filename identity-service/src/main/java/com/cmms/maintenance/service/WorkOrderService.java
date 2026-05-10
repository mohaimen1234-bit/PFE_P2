package com.cmms.maintenance.service;

import com.cmms.claims.entity.Claim;
import com.cmms.claims.repository.ClaimRepository;
import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.maintenance.dto.*;
import com.cmms.maintenance.entity.Task;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.entity.WorkOrderStatusHistory;
import com.cmms.maintenance.entity.WorkOrderLabor;
import com.cmms.maintenance.repository.TaskRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.maintenance.repository.WorkOrderStatusHistoryRepository;
import com.cmms.maintenance.repository.WorkOrderAssignmentRepository;
import com.cmms.maintenance.repository.WorkOrderFollowerRepository;
import com.cmms.maintenance.repository.WorkOrderLaborRepository;
import com.cmms.inventory.entity.PartUsage;
import com.cmms.inventory.repository.PartUsageRepository;
import com.cmms.maintenance.entity.WorkOrderAssignment;
import com.cmms.maintenance.entity.WorkOrderFollower;
import com.cmms.identity.entity.User;
import com.cmms.identity.entity.Role;
import com.cmms.identity.repository.UserRepository;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.identity.entity.Department;
import com.cmms.claims.exception.ResourceNotFoundException;
import com.cmms.identity.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final ClaimRepository claimRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;
    private final TaskRepository taskRepository;
    private final WorkOrderAssignmentRepository assignmentRepository;
    private final WorkOrderFollowerRepository followerRepository;
    private final DepartmentRepository departmentRepository;
    private final com.cmms.notifications.service.NotificationService notificationService;
    private final RegulatoryPlanService regulatoryPlanService;
    private final com.cmms.identity.service.AuditLogService auditLogService;
    private final WorkOrderLaborRepository laborRepository;
    private final PartUsageRepository partUsageRepository;
    private final com.cmms.equipment.service.MeterService meterService;

    private static final String ENTITY_NAME = "WorkOrder";

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> list(String status, String type, Integer equipmentId, Integer assignedToUserId) {
        Actor actor = getCurrentActorRequired();
        
        Specification<WorkOrder> spec = Specification.where(accessScopeSpec(actor));
        
        if (status != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), parseStatusRequired(status)));
        if (type != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("woType"), WorkOrder.WorkOrderType.valueOf(type.toUpperCase())));
        if (equipmentId != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("equipmentId"), equipmentId));
        if (assignedToUserId != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("assignedToUserId"), assignedToUserId));

        List<WorkOrder> wos = workOrderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        return batchMapToResponse(wos);
    }

    @Transactional
    public WorkOrderResponse create(CreateWorkOrderRequest request) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);

        Equipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));

        validateAssignment(equipment, request.getAssignedToUserId(), request.getSecondaryAssigneeIds());

        WorkOrder.WorkOrderPriority priority;
        LocalDateTime dueDate = request.getDueDate();
        Integer equipmentId = equipment.getEquipmentId();

        if (request.getClaimId() != null) {
            Claim claim = claimRepository.findById(request.getClaimId())
                    .orElseThrow(() -> new ResourceNotFoundException("Claim not found"));
            
            if (claim.getPriority() == null || claim.getDueDate() == null) {
                throw new IllegalStateException("This claim must have a validated priority and due date before creating a work order.");
            }

            priority = switch (claim.getPriority()) {
                case CRITICAL -> WorkOrder.WorkOrderPriority.CRITICAL;
                case HIGH -> WorkOrder.WorkOrderPriority.HIGH;
                case MEDIUM -> WorkOrder.WorkOrderPriority.MEDIUM;
                case LOW -> WorkOrder.WorkOrderPriority.LOW;
            };
            dueDate = claim.getDueDate();
            equipmentId = claim.getEquipmentId();
        } else {
            priority = WorkOrder.WorkOrderPriority.valueOf(request.getPriority().toUpperCase());
        }

        WorkOrder wo = WorkOrder.builder()
                .claimId(request.getClaimId())
                .equipmentId(equipmentId)
                .woType(WorkOrder.WorkOrderType.valueOf(request.getWoType().toUpperCase()))
                .priority(priority)
                .status(WorkOrder.WorkOrderStatus.CREATED)
                .title(request.getTitle())
                .description(request.getDescription())
                .assignedToUserId(request.getAssignedToUserId())
                .parentWoId(request.getParentWoId())
                .estimatedTimeHours(request.getEstimatedTimeHours())
                .estimatedCost(request.getEstimatedCost())
                .dueDate(dueDate)
                .isArchived(false)
                .build();

        if (wo.getAssignedToUserId() != null || (request.getSecondaryAssigneeIds() != null && !request.getSecondaryAssigneeIds().isEmpty())) {
            wo.setStatus(WorkOrder.WorkOrderStatus.ASSIGNED);
        }

        WorkOrder saved = workOrderRepository.save(wo);

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "CREATE_WORKORDER",
                ENTITY_NAME,
                saved.getWoId(),
                "Created work order " + String.format("WO-%03d", saved.getWoId()) + ": " + saved.getTitle()
        );

        if (request.getSecondaryAssigneeIds() != null) {
            for (Integer secondaryId : request.getSecondaryAssigneeIds()) {
                assignmentRepository.save(WorkOrderAssignment.builder()
                        .woId(saved.getWoId())
                        .userId(secondaryId)
                        .build());
            }
        }

        // Sync assignee back to linked claim
        if (saved.getClaimId() != null && saved.getAssignedToUserId() != null) {
            claimRepository.findById(saved.getClaimId()).ifPresent(claim -> {
                claim.setAssignedToUserId(saved.getAssignedToUserId());
                claimRepository.save(claim);
            });
        }

        saveStatusHistory(saved.getWoId(), null, saved.getStatus(), actor.displayName, "Work Order generated");

        // Auto-follow for the claimant (technician)
        if (saved.getClaimId() != null) {
            claimRepository.findById(saved.getClaimId()).ifPresent(claim -> {
                followerRepository.save(WorkOrderFollower.builder()
                        .woId(saved.getWoId())
                        .userId(claim.getRequesterId())
                        .build());
            });
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getById(Integer id) {
        Actor actor = getCurrentActorRequired();
        WorkOrder wo = getWoEntity(id);
        assertCanView(wo, actor);
        return toResponse(wo);
    }

    @Transactional
    public WorkOrderResponse update(Integer id, UpdateWorkOrderRequest request) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);
        WorkOrder wo = getWoEntity(id);

        if (wo.getStatus() == WorkOrder.WorkOrderStatus.CLOSED || wo.getStatus() == WorkOrder.WorkOrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot update a closed or cancelled work order");
        }

        wo.setTitle(request.getTitle());
        wo.setDescription(request.getDescription());
        wo.setPriority(WorkOrder.WorkOrderPriority.valueOf(request.getPriority().toUpperCase()));
        wo.setEstimatedTimeHours(request.getEstimatedTimeHours());
        wo.setEstimatedDuration(request.getEstimatedDuration());
        wo.setEstimatedCost(request.getEstimatedCost());
        wo.setDueDate(request.getDueDate());
        WorkOrder saved = workOrderRepository.save(wo);

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "UPDATE_WORKORDER",
                ENTITY_NAME,
                saved.getWoId(),
                "Updated work order details for " + String.format("WO-%03d", saved.getWoId())
        );

        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse assign(Integer id, AssignWorkOrderRequest request) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);
        WorkOrder wo = getWoEntity(id);

        if (wo.getStatus() == WorkOrder.WorkOrderStatus.CLOSED || wo.getStatus() == WorkOrder.WorkOrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot assign a closed or cancelled work order");
        }

        User assignee = userRepository.findById(request.getAssignedToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));

        Equipment equipment = equipmentRepository.findById(wo.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));
        validateAssignment(equipment, request.getAssignedToUserId(), request.getSecondaryAssigneeIds());

        wo.setAssignedToUserId(assignee.getUserId());
        
        assignmentRepository.deleteByWoId(wo.getWoId());
        if (request.getSecondaryAssigneeIds() != null) {
            for (Integer sec : request.getSecondaryAssigneeIds()) {
                assignmentRepository.save(WorkOrderAssignment.builder()
                        .woId(wo.getWoId())
                        .userId(sec)
                        .build());
            }
        }
        
        if (wo.getStatus() == WorkOrder.WorkOrderStatus.CREATED) {
            WorkOrder.WorkOrderStatus old = wo.getStatus();
            wo.setStatus(WorkOrder.WorkOrderStatus.ASSIGNED);
            saveStatusHistory(wo.getWoId(), old, wo.getStatus(), actor.displayName, "Assigned to " + assignee.getFullName());
        } else {
            saveStatusHistory(wo.getWoId(), wo.getStatus(), wo.getStatus(), actor.displayName, "Reassigned to " + assignee.getFullName());
        }

        WorkOrder saved = workOrderRepository.save(wo);

        // Sync assignee back to linked claim
        if (saved.getClaimId() != null) {
            claimRepository.findById(saved.getClaimId()).ifPresent(claim -> {
                claim.setAssignedToUserId(saved.getAssignedToUserId());
                claimRepository.save(claim);
            });
        }

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "ASSIGN_WORKORDER",
                ENTITY_NAME,
                saved.getWoId(),
                "Assigned work order " + String.format("WO-%03d", saved.getWoId()) + " to " + assignee.getFullName()
        );

        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse updateStatus(Integer id, WorkOrderStatusUpdateRequest request) {
        Actor actor = getCurrentActorRequired();
        WorkOrder wo = getWoEntity(id);
        
        assertCanUpdateStatus(wo, actor);

        WorkOrder.WorkOrderStatus newStatus = parseStatusRequired(request.getStatus());
        WorkOrder.WorkOrderStatus oldStatus = wo.getStatus();

        enforceWoTransition(oldStatus, newStatus);

        if (newStatus == WorkOrder.WorkOrderStatus.COMPLETED && !Boolean.TRUE.equals(request.getForceClose())) {
            List<Task> tasks = taskRepository.findByWoIdOrderByOrderIndexAsc(wo.getWoId());
            boolean hasIncompleteTasks = tasks.stream().anyMatch(t -> t.getStatus() != Task.TaskStatus.DONE && t.getStatus() != Task.TaskStatus.SKIPPED);
            if (hasIncompleteTasks && !actor.isAdminOrManager()) {
                throw new IllegalStateException("Cannot complete work order with incomplete tasks. Complete all tasks first.");
            }
        }

        wo.setStatus(newStatus);
        
        if (newStatus == WorkOrder.WorkOrderStatus.IN_PROGRESS && wo.getActualStart() == null) {
            wo.setActualStart(LocalDateTime.now());
        }
        
        if (newStatus == WorkOrder.WorkOrderStatus.COMPLETED) {
            wo.setCompletedAt(LocalDateTime.now());
            wo.setActualEnd(LocalDateTime.now());
            wo.setActualCost(computeActualCost(wo.getWoId()));
        }

        if (newStatus == WorkOrder.WorkOrderStatus.COMPLETED || newStatus == WorkOrder.WorkOrderStatus.VALIDATED) {
            if (wo.getWoType() == WorkOrder.WorkOrderType.PREDICTIVE) {
                if (request.getPredictiveOutcome() != null && !request.getPredictiveOutcome().trim().isEmpty()) {
                    try {
                        wo.setPredictiveOutcome(WorkOrder.PredictiveOutcome.valueOf(request.getPredictiveOutcome()));
                        wo.setPredictiveOutcomeNotes(request.getPredictiveOutcomeNotes());
                        wo.setPredictiveOutcomeAt(LocalDateTime.now());
                    } catch (IllegalArgumentException e) {
                        // Invalid enum value, ignore or default to UNCONFIRMED
                        wo.setPredictiveOutcome(WorkOrder.PredictiveOutcome.UNCONFIRMED);
                        wo.setPredictiveOutcomeAt(LocalDateTime.now());
                    }
                } else if (newStatus == WorkOrder.WorkOrderStatus.VALIDATED && wo.getPredictiveOutcome() == null) {
                    wo.setPredictiveOutcome(WorkOrder.PredictiveOutcome.UNCONFIRMED);
                    wo.setPredictiveOutcomeAt(LocalDateTime.now());
                }
            }
        }

        boolean isCompleting = (newStatus == WorkOrder.WorkOrderStatus.COMPLETED || newStatus == WorkOrder.WorkOrderStatus.VALIDATED || newStatus == WorkOrder.WorkOrderStatus.CLOSED);
        boolean wasNotComplete = (oldStatus != WorkOrder.WorkOrderStatus.COMPLETED && oldStatus != WorkOrder.WorkOrderStatus.VALIDATED && oldStatus != WorkOrder.WorkOrderStatus.CLOSED);

        if (isCompleting && wasNotComplete) {
            if ((wo.getWoType() == WorkOrder.WorkOrderType.PREVENTIVE || wo.getWoType() == WorkOrder.WorkOrderType.PREDICTIVE) && wo.getEquipmentId() != null) {
                meterService.resetThresholdsForEquipment(wo.getEquipmentId());
            }
        }

        WorkOrder saved = workOrderRepository.save(wo);
        saveStatusHistory(saved.getWoId(), oldStatus, newStatus, actor.displayName, request.getNote());

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "UPDATE_WO_STATUS",
                ENTITY_NAME,
                saved.getWoId(),
                "Changed status of " + String.format("WO-%03d", saved.getWoId()) + " to " + newStatus
        );

        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse validate(Integer id, ValidateWorkOrderRequest request) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);
        WorkOrder wo = getWoEntity(id);

        if (wo.getStatus() != WorkOrder.WorkOrderStatus.COMPLETED) {
            throw new IllegalStateException("Only COMPLETED work orders can be validated.");
        }

        WorkOrder.WorkOrderStatus oldStatus = wo.getStatus();
        wo.setStatus(WorkOrder.WorkOrderStatus.VALIDATED);
        wo.setValidationNotes(request.getValidationNotes());
        wo.setValidatedAt(LocalDateTime.now());
        wo.setValidatedBy(actor.displayName);
        wo.setActualCost(computeActualCost(wo.getWoId()));

        if (wo.getWoType() == WorkOrder.WorkOrderType.PREDICTIVE) {
            if (request.getPredictiveOutcome() != null && !request.getPredictiveOutcome().trim().isEmpty()) {
                try {
                    wo.setPredictiveOutcome(WorkOrder.PredictiveOutcome.valueOf(request.getPredictiveOutcome()));
                    wo.setPredictiveOutcomeNotes(request.getPredictiveOutcomeNotes());
                    wo.setPredictiveOutcomeAt(LocalDateTime.now());
                } catch (IllegalArgumentException e) {
                    wo.setPredictiveOutcome(WorkOrder.PredictiveOutcome.UNCONFIRMED);
                    wo.setPredictiveOutcomeAt(LocalDateTime.now());
                }
            } else if (wo.getPredictiveOutcome() == null) {
                wo.setPredictiveOutcome(WorkOrder.PredictiveOutcome.UNCONFIRMED);
                wo.setPredictiveOutcomeAt(LocalDateTime.now());
            }
        }

        WorkOrder saved = workOrderRepository.save(wo);
        saveStatusHistory(saved.getWoId(), oldStatus, saved.getStatus(), actor.displayName, "Manager validated");
        
        checkAndResolveClaim(saved);
        
        // --- NEW: Regulatory Plan Rescheduling ---
        if (saved.getWoType() == WorkOrder.WorkOrderType.REGULATORY && saved.getRegulatoryPlanId() != null) {
            regulatoryPlanService.scheduleNextExecution(saved.getRegulatoryPlanId(), LocalDateTime.now());
        }
        // ----------------------------------------

        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse close(Integer id) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);
        WorkOrder wo = getWoEntity(id);

        if (wo.getStatus() != WorkOrder.WorkOrderStatus.VALIDATED) {
            throw new IllegalStateException("Only VALIDATED work orders can be closed.");
        }

        WorkOrder.WorkOrderStatus oldStatus = wo.getStatus();
        wo.setStatus(WorkOrder.WorkOrderStatus.CLOSED);
        wo.setClosedAt(LocalDateTime.now());
        wo.setClosedBy(actor.displayName);
        wo.setActualCost(computeActualCost(wo.getWoId()));

        WorkOrder saved = workOrderRepository.save(wo);
        saveStatusHistory(saved.getWoId(), oldStatus, saved.getStatus(), actor.displayName, "Manager closed");
        
        checkAndResolveClaim(saved);
        
        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse reschedule(Integer id, ScheduleWorkOrderRequest request) {
        Actor actor = getCurrentActorRequired();
        WorkOrder wo = getWoEntity(id);
        
        assertCanUpdateStatus(wo, actor);
        
        wo.setPlannedStart(request.getPlannedStart());
        wo.setPlannedEnd(request.getPlannedEnd());
        wo.setDueDate(request.getDueDate());
        if (request.getEstimatedDuration() != null) {
            wo.setEstimatedDuration(request.getEstimatedDuration());
        }
        
        if (wo.getStatus() == WorkOrder.WorkOrderStatus.ASSIGNED || wo.getStatus() == WorkOrder.WorkOrderStatus.CREATED) {
            saveStatusHistory(wo.getWoId(), wo.getStatus(), WorkOrder.WorkOrderStatus.SCHEDULED, actor.displayName, "Scheduled");
            wo.setStatus(WorkOrder.WorkOrderStatus.SCHEDULED);
        } else {
            saveStatusHistory(wo.getWoId(), wo.getStatus(), wo.getStatus(), actor.displayName, "Rescheduled");
        }

        return toResponse(workOrderRepository.save(wo));
    }

    @Transactional
    public void toggleFollower(Integer id) {
        Actor actor = getCurrentActorRequired();
        if (actor.userId == null) return;
        
        Optional<WorkOrderFollower> existing = followerRepository.findByWoIdAndUserId(id, actor.userId);
        if (existing.isPresent()) {
            followerRepository.delete(existing.get());
        } else {
            followerRepository.save(WorkOrderFollower.builder()
                .woId(id)
                .userId(actor.userId)
                .build());
        }
    }

    @Transactional(readOnly = true)
    public List<WorkOrderStatusHistoryResponse> getStatusHistory(Integer id) {
        Actor actor = getCurrentActorRequired();
        WorkOrder wo = getWoEntity(id);
        assertCanView(wo, actor);

        return historyRepository.findByWoIdOrderByChangedAtDesc(id).stream()
                .map(h -> WorkOrderStatusHistoryResponse.builder()
                        .id(h.getId())
                        .woId(h.getWoId())
                        .oldStatus(h.getOldStatus())
                        .newStatus(h.getNewStatus())
                        .changedAt(h.getChangedAt())
                        .changedBy(h.getChangedBy())
                        .note(h.getNote())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> getDelayed() {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);

        LocalDateTime now = LocalDateTime.now();
        List<WorkOrder> delayed = workOrderRepository.findAll().stream()
                .filter(wo -> wo.getDueDate() != null && wo.getDueDate().isBefore(now))
                .filter(wo -> {
                    var s = wo.getStatus();
                    return s != WorkOrder.WorkOrderStatus.COMPLETED && 
                           s != WorkOrder.WorkOrderStatus.VALIDATED && 
                           s != WorkOrder.WorkOrderStatus.CLOSED && 
                           s != WorkOrder.WorkOrderStatus.CANCELLED;
                })
                .collect(Collectors.toList());
                
        return batchMapToResponse(delayed);
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> getCalendar() {
        Actor actor = getCurrentActorRequired();
        Specification<WorkOrder> spec = Specification.where(accessScopeSpec(actor))
            .and((root, cq, cb) -> cb.notEqual(root.get("status"), WorkOrder.WorkOrderStatus.CANCELLED));
        return batchMapToResponse(workOrderRepository.findAll(spec));
    }
    
    @Transactional(readOnly = true)
    public List<WorkloadResponse> getWorkload() {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);
        
        List<WorkOrder> allActive = workOrderRepository.findAll().stream()
                .filter(wo -> wo.getAssignedToUserId() != null)
                .filter(wo -> wo.getStatus() != WorkOrder.WorkOrderStatus.CLOSED && wo.getStatus() != WorkOrder.WorkOrderStatus.CANCELLED)
                .collect(Collectors.toList());
                
        Map<Integer, List<WorkOrder>> byUser = allActive.stream().collect(Collectors.groupingBy(WorkOrder::getAssignedToUserId));
        
        List<User> users = userRepository.findAllById(byUser.keySet());
        Map<Integer, String> userNames = users.stream().collect(Collectors.toMap(User::getUserId, User::getFullName));
        
        List<WorkloadResponse> workload = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (Map.Entry<Integer, List<WorkOrder>> entry : byUser.entrySet()) {
            Integer userId = entry.getKey();
            List<WorkOrder> wos = entry.getValue();
            
            long overdue = wos.stream().filter(w -> w.getDueDate() != null && w.getDueDate().isBefore(now) && w.getStatus() != WorkOrder.WorkOrderStatus.COMPLETED && w.getStatus() != WorkOrder.WorkOrderStatus.VALIDATED).count();
            
            WorkloadResponse wr = WorkloadResponse.builder()
                .userId(userId)
                .userName(userNames.getOrDefault(userId, "Unknown"))
                .totalAssigned((long) wos.size())
                .created(wos.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.CREATED).count())
                .assigned(wos.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.ASSIGNED).count())
                .scheduled(wos.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.SCHEDULED).count())
                .inProgress(wos.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.IN_PROGRESS).count())
                .onHold(wos.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.ON_HOLD).count())
                .completed(wos.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.COMPLETED || w.getStatus() == WorkOrder.WorkOrderStatus.VALIDATED).count())
                .overdue(overdue)
                .build();
            workload.add(wr);
        }
        
        workload.sort(Comparator.comparing(WorkloadResponse::getTotalAssigned).reversed());
        return workload;
    }

    // ── Cost computation ──────────────────────────────────────────────────────
    /** Sums labor costs + parts costs for the given WO to produce actual_cost. */
    private BigDecimal computeActualCost(Integer woId) {
        BigDecimal laborCost = laborRepository.findByWoId(woId).stream()
                .map(l -> l.getTotalCost() != null ? l.getTotalCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal partsCost = partUsageRepository.findByWoId(woId).stream()
                .map(p -> {
                    if (p.getUnitCostAtUsage() == null) return BigDecimal.ZERO;
                    return p.getUnitCostAtUsage().multiply(new BigDecimal(p.getQuantityUsed()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return laborCost.add(partsCost);
    }

    private void checkAndResolveClaim(WorkOrder wo) {
        if (wo.getClaimId() != null && (wo.getStatus() == WorkOrder.WorkOrderStatus.VALIDATED || wo.getStatus() == WorkOrder.WorkOrderStatus.CLOSED)) {
            claimRepository.findById(wo.getClaimId()).ifPresent(claim -> {
                if (claim.getStatus() != com.cmms.claims.entity.ClaimStatus.CLOSED && claim.getStatus() != com.cmms.claims.entity.ClaimStatus.RESOLVED) {
                    claim.setStatus(com.cmms.claims.entity.ClaimStatus.RESOLVED);
                    claim.setResolvedAt(LocalDateTime.now());
                    claimRepository.save(claim);
                }
            });
        }
    }

    private void validateAssignment(Equipment equipment, Integer primaryUserId, List<Integer> secondaryUserIds) {
        List<Integer> allUserIds = new ArrayList<>();
        if (primaryUserId != null) allUserIds.add(primaryUserId);
        if (secondaryUserIds != null) allUserIds.addAll(secondaryUserIds);

        if (allUserIds.isEmpty()) return;

        List<User> users = userRepository.findAllById(allUserIds);
        for (User user : users) {
            if (user.getDepartment() != null && !Objects.equals(user.getDepartment().getDepartmentId(), equipment.getDepartmentId())) {
                throw new IllegalStateException(String.format(
                        "Technician %s belongs to department '%s' but this equipment is assigned to a different department.",
                        user.getFullName(),
                        user.getDepartment().getDepartmentName()
                ));
            }
        }
    }

    private WorkOrder getWoEntity(Integer id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found"));
    }

    private void saveStatusHistory(Integer woId, WorkOrder.WorkOrderStatus oldStatus, WorkOrder.WorkOrderStatus newStatus, String changedBy, String note) {
        historyRepository.save(WorkOrderStatusHistory.builder()
                .woId(woId)
                .oldStatus(oldStatus == null ? null : oldStatus.name())
                .newStatus(newStatus.name())
                .changedBy(changedBy)
                .note(note)
                .build());

        // Broadcast notification to primary technician and followers
        if (oldStatus != newStatus && newStatus != null) {
            String message = String.format("Work Order #%d status updated to %s by %s", woId, newStatus, changedBy);
            
            // Notify primary technician
            workOrderRepository.findById(woId).ifPresent(wo -> {
                if (wo.getAssignedToUserId() != null) {
                    notificationService.sendDirect(wo.getAssignedToUserId(), "INFO", message, woId);
                }
            });

            // Notify followers
            List<WorkOrderFollower> followers = followerRepository.findByWoId(woId);
            for (WorkOrderFollower follower : followers) {
                notificationService.sendDirect(follower.getUserId(), "INFO", message, woId);
            }
        }
    }

    @Transactional
    public void toggleFollower(Integer woId, Integer userId) {
        followerRepository.findByWoIdAndUserId(woId, userId).ifPresentOrElse(
            followerRepository::delete,
            () -> followerRepository.save(WorkOrderFollower.builder().woId(woId).userId(userId).build())
        );
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(Integer woId, Integer userId) {
        return followerRepository.findByWoIdAndUserId(woId, userId).isPresent();
    }

    @Transactional(readOnly = true)
    public List<User> getFollowers(Integer woId) {
        List<Integer> userIds = followerRepository.findByWoId(woId).stream()
                .map(WorkOrderFollower::getUserId)
                .collect(Collectors.toList());
        return userRepository.findAllById(userIds);
    }

    private void enforceWoTransition(WorkOrder.WorkOrderStatus oldStatus, WorkOrder.WorkOrderStatus newStatus) {
        if (oldStatus == newStatus) return;
        boolean allowed = switch (oldStatus) {
            case CREATED -> newStatus == WorkOrder.WorkOrderStatus.ASSIGNED || newStatus == WorkOrder.WorkOrderStatus.SCHEDULED || newStatus == WorkOrder.WorkOrderStatus.CANCELLED;
            case ASSIGNED -> newStatus == WorkOrder.WorkOrderStatus.SCHEDULED || newStatus == WorkOrder.WorkOrderStatus.IN_PROGRESS || newStatus == WorkOrder.WorkOrderStatus.CANCELLED;
            case SCHEDULED -> newStatus == WorkOrder.WorkOrderStatus.IN_PROGRESS || newStatus == WorkOrder.WorkOrderStatus.ON_HOLD || newStatus == WorkOrder.WorkOrderStatus.CANCELLED;
            case IN_PROGRESS -> newStatus == WorkOrder.WorkOrderStatus.ON_HOLD || newStatus == WorkOrder.WorkOrderStatus.COMPLETED;
            case ON_HOLD -> newStatus == WorkOrder.WorkOrderStatus.IN_PROGRESS || newStatus == WorkOrder.WorkOrderStatus.COMPLETED || newStatus == WorkOrder.WorkOrderStatus.CANCELLED;
            case COMPLETED -> newStatus == WorkOrder.WorkOrderStatus.VALIDATED || newStatus == WorkOrder.WorkOrderStatus.IN_PROGRESS; // can revert
            case VALIDATED -> newStatus == WorkOrder.WorkOrderStatus.CLOSED;
            case CLOSED, CANCELLED -> false;
        };
        if (!allowed) {
            throw new IllegalStateException("Invalid work order status transition from " + oldStatus + " to " + newStatus);
        }
    }

    private List<WorkOrderResponse> batchMapToResponse(List<WorkOrder> wos) {
        Map<Integer, Equipment> equipmentById = equipmentRepository.findAllById(wos.stream().map(WorkOrder::getEquipmentId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Equipment::getEquipmentId, e -> e));
        Map<Integer, User> userById = userRepository.findAllById(wos.stream().map(WorkOrder::getAssignedToUserId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getUserId, u -> u));
        Map<Integer, Claim> claimById = claimRepository.findAllById(wos.stream().map(WorkOrder::getClaimId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Claim::getClaimId, c -> c));
        Map<Integer, Department> departmentById = departmentRepository.findAllById(equipmentById.values().stream().map(Equipment::getDepartmentId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Department::getDepartmentId, d -> d));

        LocalDateTime now = LocalDateTime.now();
        List<Integer> woIds = wos.stream().map(WorkOrder::getWoId).collect(Collectors.toList());
        List<Task> allTasks = taskRepository.findAll(); // Simple approximation, could be optimized
        Map<Integer, List<Task>> tasksByWo = allTasks.stream().collect(Collectors.groupingBy(Task::getWoId));
        
        List<WorkOrderAssignment> allAssignments = woIds.isEmpty() ? List.of() : assignmentRepository.findAll().stream()
            .filter(a -> woIds.contains(a.getWoId()))
            .collect(Collectors.toList());
        
        Map<Integer, List<WorkOrderAssignment>> assignmentsByWo = allAssignments.stream()
            .collect(Collectors.groupingBy(WorkOrderAssignment::getWoId));
            
        List<Integer> allSecondaryUserIds = allAssignments.stream().map(WorkOrderAssignment::getUserId).collect(Collectors.toList());
        Map<Integer, User> secondaryUsersById = userRepository.findAllById(allSecondaryUserIds).stream()
            .collect(Collectors.toMap(User::getUserId, u -> u, (a, b) -> a));

        List<WorkOrderFollower> allFollowers = woIds.isEmpty() ? List.of() : followerRepository.findAll().stream()
            .filter(f -> woIds.contains(f.getWoId()))
            .collect(Collectors.toList());
        
        Map<Integer, List<WorkOrderFollower>> followersByWo = allFollowers.stream()
            .collect(Collectors.groupingBy(WorkOrderFollower::getWoId));

        List<Integer> allFollowerUserIds = allFollowers.stream().map(WorkOrderFollower::getUserId).collect(Collectors.toList());
        Map<Integer, User> followerUsersById = userRepository.findAllById(allFollowerUserIds).stream()
            .collect(Collectors.toMap(User::getUserId, u -> u, (a, b) -> a));

        return wos.stream().map(wo -> {
            Equipment eq = equipmentById.get(wo.getEquipmentId());
            User assignee = wo.getAssignedToUserId() == null ? null : userById.get(wo.getAssignedToUserId());
            Claim claim = wo.getClaimId() == null ? null : claimById.get(wo.getClaimId());
            List<Task> tasks = tasksByWo.getOrDefault(wo.getWoId(), List.of());
            long completedTasks = tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.DONE || t.getStatus() == Task.TaskStatus.SKIPPED).count();
            boolean hasPendingAdHoc = tasks.stream().anyMatch(t -> Boolean.TRUE.equals(t.getIsAdHoc()) && t.getApprovalStatus() == Task.TaskApprovalStatus.PENDING);

            boolean overdue = wo.getDueDate() != null && wo.getDueDate().isBefore(now) && 
                wo.getStatus() != WorkOrder.WorkOrderStatus.COMPLETED && 
                wo.getStatus() != WorkOrder.WorkOrderStatus.VALIDATED && 
                wo.getStatus() != WorkOrder.WorkOrderStatus.CLOSED && 
                wo.getStatus() != WorkOrder.WorkOrderStatus.CANCELLED;

            return WorkOrderResponse.builder()
                    .woId(wo.getWoId())
                    .woCode(String.format("WO-%03d", wo.getWoId()))
                    .parentWoId(wo.getParentWoId())
                    .parentWoCode(wo.getParentWoId() == null ? null : String.format("WO-%03d", wo.getParentWoId()))
                    .claimId(wo.getClaimId())
                    .claimCode(claim == null ? null : String.format("CLM-%03d", claim.getClaimId()))
                    .equipmentId(wo.getEquipmentId())
                    .equipmentName(eq == null ? null : eq.getName())
                    .regulatoryPlanId(wo.getRegulatoryPlanId())
                    .departmentId(eq == null ? null : eq.getDepartmentId())
                    .departmentName(eq == null || eq.getDepartmentId() == null || departmentById.get(eq.getDepartmentId()) == null ? null : departmentById.get(eq.getDepartmentId()).getDepartmentName())
                    .woType(wo.getWoType().name())
                    .priority(wo.getPriority().name())
                    .status(wo.getStatus().name())
                    .title(wo.getTitle())
                    .description(wo.getDescription())
                    .assignedToUserId(wo.getAssignedToUserId())
                    .assignedToName(assignee == null ? null : assignee.getFullName())
                    .secondaryAssignees(assignmentsByWo.getOrDefault(wo.getWoId(), List.of()).stream()
                        .map(a -> {
                            User u = secondaryUsersById.get(a.getUserId());
                            return WorkOrderResponse.UserReference.builder()
                                .userId(a.getUserId())
                                .name(u != null ? u.getFullName() : String.valueOf(a.getUserId()))
                                .build();
                        }).collect(Collectors.toList()))
                    .followers(followersByWo.getOrDefault(wo.getWoId(), List.of()).stream()
                        .map(f -> {
                            User u = followerUsersById.get(f.getUserId());
                            return WorkOrderResponse.UserReference.builder()
                                .userId(f.getUserId())
                                .name(u != null ? u.getFullName() : String.valueOf(f.getUserId()))
                                .build();
                        }).collect(Collectors.toList()))
                    .estimatedTimeHours(wo.getEstimatedTimeHours())
                    .actualTimeHours(wo.getActualTimeHours())
                    .estimatedDuration(wo.getEstimatedDuration())
                    .actualDuration(wo.getActualDuration())
                    .estimatedCost(wo.getEstimatedCost())
                    .actualCost(wo.getActualCost())
                    .plannedStart(wo.getPlannedStart())
                    .plannedEnd(wo.getPlannedEnd())
                    .actualStart(wo.getActualStart())
                    .actualEnd(wo.getActualEnd())
                    .dueDate(wo.getDueDate())
                    .overdue(overdue)
                    .totalTasks((long) tasks.size())
                    .completedTasks(completedTasks)
                    .hasPendingAdHocTasks(hasPendingAdHoc)
                    .hasCriticalFailure(wo.getHasCriticalFailure())
                    .completedAt(wo.getCompletedAt())
                    .completionNotes(wo.getCompletionNotes())
                    .validationNotes(wo.getValidationNotes())
                    .validatedAt(wo.getValidatedAt())
                    .validatedBy(wo.getValidatedBy())
                    .closedAt(wo.getClosedAt())
                    .closedBy(wo.getClosedBy())
                    .cancellationNotes(wo.getCancellationNotes())
                    .predictiveOutcome(wo.getPredictiveOutcome() != null ? wo.getPredictiveOutcome().name() : null)
                    .predictiveOutcomeNotes(wo.getPredictiveOutcomeNotes())
                    .predictiveOutcomeAt(wo.getPredictiveOutcomeAt())
                    .createdAt(wo.getCreatedAt())
                    .updatedAt(wo.getUpdatedAt())
                    .totalTasks((long) tasks.size())
                    .completedTasks(completedTasks)
                    .build();
        }).collect(Collectors.toList());
    }

    private WorkOrderResponse toResponse(WorkOrder wo) {
        return batchMapToResponse(List.of(wo)).get(0);
    }

    private WorkOrder.WorkOrderStatus parseStatusRequired(String status) {
        try {
            return WorkOrder.WorkOrderStatus.valueOf(status.toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
    }

    private void assertCanView(WorkOrder wo, Actor actor) {
        if (actor.isAdminOrManager()) return;
        if (actor.userId != null && Objects.equals(actor.userId, wo.getAssignedToUserId())) return;
        throw new AccessDeniedException("Not allowed to view this work order");
    }

    private void assertCanUpdateStatus(WorkOrder wo, Actor actor) {
        if (actor.isAdminOrManager()) return;
        if (actor.hasRole(Role.TECHNICIAN) && Objects.equals(actor.userId, wo.getAssignedToUserId())) return;
        throw new AccessDeniedException("Not allowed to update this work order");
    }

    private void assertAdminOrManager(Actor actor) {
        if (!actor.isAdminOrManager()) {
            throw new AccessDeniedException("Requires ADMIN or MAINTENANCE_MANAGER role");
        }
    }

    private Specification<WorkOrder> accessScopeSpec(Actor actor) {
        if (actor.isAdminOrManager() || actor.hasRole(Role.FINANCE_MANAGER)) {
            return (root, cq, cb) -> cb.conjunction();
        }
        if (actor.hasRole(Role.TECHNICIAN) && actor.userId != null) {
            return (root, cq, cb) -> cb.equal(root.get("assignedToUserId"), actor.userId);
        }
        return (root, cq, cb) -> cb.disjunction();
    }

    private Actor getCurrentActorRequired() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("Authentication required");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            User user = userPrincipal.getUser();
            return new Actor(
                    user == null ? null : user.getUserId(),
                    user == null || user.getFullName() == null ? authentication.getName() : user.getFullName(),
                    user == null ? List.of() : user.getRoles().stream().map(r -> r.getRoleName().toUpperCase()).collect(Collectors.toList())
            );
        }
        return new Actor(null, authentication.getName(), List.of());
    }

    private record Actor(Integer userId, String displayName, List<String> roles) {
        boolean isAdminOrManager() {
            return roles.contains(Role.ADMIN) || roles.contains(Role.MAINTENANCE_MANAGER);
        }
        boolean hasRole(String roleName) {
            return roles.contains(roleName);
        }
    }
}
