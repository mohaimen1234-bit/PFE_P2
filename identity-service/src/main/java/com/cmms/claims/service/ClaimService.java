package com.cmms.claims.service;

import com.cmms.claims.dto.*;
import com.cmms.claims.entity.*;
import com.cmms.claims.repository.ClaimPhotoRepository;
import com.cmms.claims.repository.ClaimRepository;
import com.cmms.claims.repository.ClaimStatusHistoryRepository;
import com.cmms.claims.exception.ResourceNotFoundException;
import com.cmms.equipment.entity.Equipment;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.identity.entity.Department;
import com.cmms.identity.entity.User;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.identity.repository.UserRepository;
import com.cmms.identity.service.AuditLogService;
import com.cmms.identity.repository.AuditLogRepository;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.ai.service.PriorityScoringService;
import com.cmms.identity.entity.AuditLog;
import com.cmms.identity.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClaimService {

    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_MAINTENANCE_MANAGER = "MAINTENANCE_MANAGER";
    private static final String ROLE_TECHNICIAN = "TECHNICIAN";

    private static final String ENTITY_NAME = "Claim";

    private final ClaimRepository claimRepository;
    private final ClaimPhotoRepository claimPhotoRepository;
    private final ClaimStatusHistoryRepository statusHistoryRepository;

    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    private final WorkOrderRepository workOrderRepository;
    private final com.cmms.notifications.service.NotificationService notificationService;

    private final AuditLogService auditLogService;
    private final AuditLogRepository auditLogRepository;

    private final PriorityScoringService priorityScoringService;

    @Transactional(readOnly = true)
    public List<ClaimListItemResponse> listClaims(
            String status,
            String priority,
            Integer equipmentId,
            Integer departmentId,
            Integer requesterId,
            Integer assignedToUserId,
            String q
    ) {
        Actor actor = getCurrentActorRequired();

        Specification<Claim> spec = Specification.where(accessScopeSpec(actor))
                .and(optionalEquals("status", parseStatusOrNull(status)))
                .and(optionalEquals("priority", parsePriorityOrNull(priority)))
                .and(optionalEquals("equipmentId", equipmentId))
                .and(optionalEquals("departmentId", departmentId))
                .and(optionalEquals("requesterId", requesterId))
                .and(optionalEquals("assignedToUserId", assignedToUserId))
                .and(freeTextSpec(q));

        List<Claim> claims = claimRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        Map<Integer, Equipment> equipmentById = equipmentRepository.findAllById(
                        claims.stream().map(Claim::getEquipmentId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Equipment::getEquipmentId, Function.identity()));

        Map<Integer, Department> departmentsById = departmentRepository.findAllById(
                        claims.stream().map(Claim::getDepartmentId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Department::getDepartmentId, Function.identity()));

        Set<Integer> woIds = claims.stream().map(Claim::getLinkedWoId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Integer, WorkOrder> woById = woIds.isEmpty() ? Collections.emptyMap() : workOrderRepository.findAllById(woIds)
                .stream()
                .collect(Collectors.toMap(WorkOrder::getWoId, Function.identity()));

        Set<Integer> userIds = new HashSet<>();
        for (Claim claim : claims) {
            if (claim.getRequesterId() != null) userIds.add(claim.getRequesterId());
            if (claim.getAssignedToUserId() != null) userIds.add(claim.getAssignedToUserId());
            
            WorkOrder linkedWo = claim.getLinkedWoId() == null ? null : woById.get(claim.getLinkedWoId());
            if (linkedWo != null && linkedWo.getAssignedToUserId() != null) {
                userIds.add(linkedWo.getAssignedToUserId());
            }
        }
        Map<Integer, User> usersById = userIds.isEmpty() ? Collections.emptyMap() : userRepository.findAllById(userIds)
                .stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));

        return claims.stream()
                .map(claim -> {
                    WorkOrder linkedWo = claim.getLinkedWoId() == null ? null : woById.get(claim.getLinkedWoId());
                    return toListItemResponse(claim, equipmentById, usersById, departmentsById, linkedWo);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClaimStatsResponse getStats() {
        Actor actor = getCurrentActorRequired();

        Specification<Claim> baseSpec = Specification.where(accessScopeSpec(actor));

        long total = claimRepository.count(baseSpec);
        long pending = claimRepository.count(baseSpec.and(optionalEquals("status", ClaimStatus.NEW)));
        long inProgress = claimRepository.count(baseSpec.and(statusInSpec(List.of(ClaimStatus.ASSIGNED, ClaimStatus.CONVERTED_TO_WORK_ORDER, ClaimStatus.IN_PROGRESS))));
        long closed = claimRepository.count(baseSpec.and(statusInSpec(List.of(ClaimStatus.CLOSED, ClaimStatus.RESOLVED))));

        return ClaimStatsResponse.builder()
                .total(total)
                .pending(pending)
                .inProgress(inProgress)
                .closed(closed)
                .build();
    }

    @Transactional(readOnly = true)
    public ClaimResponse getClaim(Integer claimId) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimEntity(claimId);
        assertCanView(claim, actor);

        return toClaimResponse(claim);
    }

    @Transactional
    public ClaimResponse createClaim(CreateClaimRequest request) {
        Actor actor = getCurrentActorRequired();

        Equipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with ID: " + request.getEquipmentId()));

        Integer resolvedDepartmentId = request.getDepartmentId();
        if (resolvedDepartmentId == null) {
            resolvedDepartmentId = equipment.getDepartmentId();
        }
        final Integer finalDepartmentId = resolvedDepartmentId;
        if (finalDepartmentId != null) {
            departmentRepository.findById(finalDepartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + finalDepartmentId));
        }

        ClaimPriority parsedPriority = null;
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            parsedPriority = parsePriorityRequired(request.getPriority());
        }
        
        ClaimSeverity reportedSeverity = null;
        if (request.getReportedSeverity() != null && !request.getReportedSeverity().isBlank()) {
            reportedSeverity = ClaimSeverity.valueOf(request.getReportedSeverity().trim().toUpperCase());
        }

        Claim claim = Claim.builder()
                .requesterId(actor.userId)
                .equipmentId(equipment.getEquipmentId())
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .priority(parsedPriority)
                .reportedSeverity(reportedSeverity)
                .status(ClaimStatus.NEW)
                .assignedToUserId(null)
                .departmentId(finalDepartmentId)
                .qualificationNotes(null)
                .closedAt(null)
                .build();

        Claim saved = claimRepository.save(claim);

        statusHistoryRepository.save(ClaimStatusHistory.builder()
                .claimId(saved.getClaimId())
                .oldStatus(null)
                .newStatus(ClaimStatus.NEW)
                .changedAt(LocalDateTime.now())
                .changedBy(actor.displayName)
                .note(null)
                .build());

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "CREATE_CLAIM",
                ENTITY_NAME,
                saved.getClaimId(),
                "Created claim " + formatClaimCode(saved.getClaimId()) + " for equipment " + equipment.getName()
        );

        notificationService.notifyAdminAndManagers(
                "INFO",
                "New Claim reported for " + equipment.getName() + ": " + saved.getTitle(),
                saved.getClaimId()
        );

        return toClaimResponse(saved);
    }

    @Transactional
    public ClaimResponse updateClaim(Integer claimId, UpdateClaimRequest request) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimEntity(claimId);
        assertCanEdit(claim, actor);

        Integer finalDepartmentId = request.getDepartmentId();
        if (finalDepartmentId != null) {
            departmentRepository.findById(finalDepartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + finalDepartmentId));
        }

        claim.setTitle(request.getTitle().trim());
        claim.setDescription(request.getDescription().trim());
        claim.setPriority(parsePriorityOrNull(request.getPriority()));
        claim.setDepartmentId(finalDepartmentId);

        if (request.getReportedSeverity() != null) {
            claim.setReportedSeverity(parseSeverityOrNull(request.getReportedSeverity()));
        }
        if (request.getValidatedSeverity() != null) {
            claim.setValidatedSeverity(parseSeverityOrNull(request.getValidatedSeverity()));
        }

        Claim saved = claimRepository.save(claim);

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "UPDATE_CLAIM",
                ENTITY_NAME,
                saved.getClaimId(),
                "Updated claim " + formatClaimCode(saved.getClaimId())
        );

        return toClaimResponse(saved);
    }

    @Transactional
    public ClaimResponse qualifyClaim(Integer claimId, ClaimQualificationRequest request) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);

        Claim claim = getClaimEntity(claimId);

        if (claim.getStatus() != ClaimStatus.NEW) {
            throw new IllegalStateException("Only NEW claims can be qualified");
        }

        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            claim.setPriority(parsePriorityRequired(request.getPriority()));
        }

        if (request.getQualificationNotes() != null) {
            claim.setQualificationNotes(request.getQualificationNotes().trim());
        }

        // Set dueDate if provided by manager during qualification
        if (request.getDueDate() != null) {
            claim.setDueDate(request.getDueDate());
        }

        if (request.getValidatedSeverity() != null && !request.getValidatedSeverity().isBlank()) {
            claim.setValidatedSeverity(ClaimSeverity.valueOf(request.getValidatedSeverity().trim().toUpperCase()));
        }

        ClaimStatus oldStatus = claim.getStatus();
        ClaimStatus newStatus;

        if (request.getAssignedToUserId() != null) {
            User assignee = getTechnicianOrThrow(request.getAssignedToUserId());
            claim.setAssignedToUserId(assignee.getUserId());
            newStatus = ClaimStatus.ASSIGNED;
        } else {
            newStatus = ClaimStatus.QUALIFIED;
        }

        claim.setStatus(newStatus);
        Claim saved = claimRepository.save(claim);

        saveStatusHistory(saved.getClaimId(), oldStatus, newStatus, actor.displayName, null);

        String auditDetails = "Qualified claim " + formatClaimCode(saved.getClaimId()) + " (" + statusLabel(newStatus) + ")";
        if (saved.getDueDate() != null) {
            auditDetails += ", dueDate=" + saved.getDueDate();
        }

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "QUALIFY_CLAIM",
                ENTITY_NAME,
                saved.getClaimId(),
                auditDetails
        );

        priorityScoringService.calculatePrioritySuggestion(saved.getClaimId());

        return toClaimResponse(saved);
    }

    @Transactional
    public ClaimResponse assignClaim(Integer claimId, ClaimAssignRequest request) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);

        Claim claim = getClaimEntity(claimId);

        if (claim.getStatus() != ClaimStatus.QUALIFIED) {
            throw new IllegalStateException("Only QUALIFIED claims can be assigned");
        }

        User assignee = getTechnicianOrThrow(request.getAssignedToUserId());

        ClaimStatus oldStatus = claim.getStatus();
        claim.setAssignedToUserId(assignee.getUserId());
        claim.setStatus(ClaimStatus.ASSIGNED);

        Claim saved = claimRepository.save(claim);

        saveStatusHistory(saved.getClaimId(), oldStatus, ClaimStatus.ASSIGNED, actor.displayName, null);

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "ASSIGN_CLAIM",
                ENTITY_NAME,
                saved.getClaimId(),
                "Assigned claim " + formatClaimCode(saved.getClaimId()) + " to " + assignee.getFullName()
        );

        return toClaimResponse(saved);
    }

    @Transactional
    public ClaimResponse updateStatus(Integer claimId, ClaimStatusUpdateRequest request) {
        Actor actor = getCurrentActorRequired();

        Claim claim = getClaimEntity(claimId);
        assertCanUpdateStatus(claim, actor);

        ClaimStatus newStatus = parseStatusRequired(request.getStatus());
        ClaimStatus oldStatus = claim.getStatus();

        if (oldStatus == ClaimStatus.CLOSED || oldStatus == ClaimStatus.REJECTED) {
            throw new IllegalStateException("Closed/Rejected claims cannot change status");
        }

        enforceTransition(oldStatus, newStatus);

        claim.setStatus(newStatus);
        if (newStatus == ClaimStatus.CLOSED) {
            claim.setClosedAt(LocalDateTime.now());
        } else if (newStatus == ClaimStatus.RESOLVED) {
            claim.setResolvedAt(LocalDateTime.now());
        } else if (newStatus == ClaimStatus.REJECTED) {
            claim.setRejectedAt(LocalDateTime.now());
        }

        Claim saved = claimRepository.save(claim);

        saveStatusHistory(saved.getClaimId(), oldStatus, newStatus, actor.displayName, trimToNull(request.getNote()));

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "UPDATE_CLAIM_STATUS",
                ENTITY_NAME,
                saved.getClaimId(),
                "Changed claim status to " + statusLabel(newStatus)
        );

        return toClaimResponse(saved);
    }

    @Transactional
    public ClaimResponse convertToWorkOrder(Integer claimId) {
        Actor actor = getCurrentActorRequired();
        assertAdminOrManager(actor);

        Claim claim = getClaimEntity(claimId);

        if (claim.getStatus() != ClaimStatus.NEW && claim.getStatus() != ClaimStatus.QUALIFIED && claim.getStatus() != ClaimStatus.ASSIGNED) {
            throw new IllegalStateException("Only NEW, QUALIFIED or ASSIGNED claims can be converted to Work Orders");
        }

        if (workOrderRepository.existsByClaimId(claimId)) {
            throw new IllegalStateException("This claim has already been converted to a Work Order");
        }

        // Removed strict priority/dueDate check to allow conversion before AI calculation or validation.
        // Falls back to MEDIUM if priority is missing.

        WorkOrder wo = WorkOrder.builder()
                .claimId(claim.getClaimId())
                .equipmentId(claim.getEquipmentId())
                .woType(WorkOrder.WorkOrderType.CORRECTIVE)
                .priority(mapPriority(claim.getPriority()))
                .dueDate(claim.getDueDate())
                .status(WorkOrder.WorkOrderStatus.CREATED)
                .title("WO: " + claim.getTitle())
                .description(claim.getDescription())
                .assignedToUserId(claim.getAssignedToUserId())
                .isArchived(false)
                .build();
                
        if (wo.getAssignedToUserId() != null) {
            wo.setStatus(WorkOrder.WorkOrderStatus.ASSIGNED);
        }

        WorkOrder savedWo = workOrderRepository.save(wo);

        ClaimStatus oldStatus = claim.getStatus();
        claim.setStatus(ClaimStatus.CONVERTED_TO_WORK_ORDER);
        claim.setLinkedWoId(savedWo.getWoId());
        claimRepository.save(claim);

        saveStatusHistory(claim.getClaimId(), oldStatus, ClaimStatus.CONVERTED_TO_WORK_ORDER, actor.displayName, "Converted to Work Order " + formatWoCode(savedWo.getWoId()));

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "CONVERT_CLAIM_TO_WO",
                ENTITY_NAME,
                claim.getClaimId(),
                "Converted claim " + formatClaimCode(claim.getClaimId()) + " to Work Order " + formatWoCode(savedWo.getWoId())
        );

        return toClaimResponse(claim);
    }

    private WorkOrder.WorkOrderPriority mapPriority(ClaimPriority claimPriority) {
        if (claimPriority == null) return WorkOrder.WorkOrderPriority.MEDIUM;
        return switch (claimPriority) {
            case CRITICAL -> WorkOrder.WorkOrderPriority.CRITICAL;
            case HIGH -> WorkOrder.WorkOrderPriority.HIGH;
            case MEDIUM -> WorkOrder.WorkOrderPriority.MEDIUM;
            case LOW -> WorkOrder.WorkOrderPriority.LOW;
        };
    }

    private static String formatWoCode(Integer woId) {
        if (woId == null) return null;
        return String.format("WO-%03d", woId);
    }

    @Transactional(readOnly = true)
    public List<ClaimHistoryEntryResponse> getHistory(Integer claimId) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimEntity(claimId);
        assertCanView(claim, actor);

        List<ClaimHistoryEntryResponse> statusEntries = statusHistoryRepository.findByClaimIdOrderByChangedAtDesc(claimId)
                .stream()
                .map(h -> ClaimHistoryEntryResponse.builder()
                        .type("STATUS")
                        .id(h.getId())
                        .claimId(h.getClaimId())
                        .oldStatus(h.getOldStatus() == null ? null : h.getOldStatus().name())
                        .newStatus(h.getNewStatus() == null ? null : h.getNewStatus().name())
                        .performedBy(h.getChangedBy())
                        .createdAt(h.getChangedAt())
                        .note(h.getNote())
                        .build())
                .collect(Collectors.toList());

        List<AuditLog> audits = auditLogRepository.findByEntity(ENTITY_NAME, claimId);

        Map<Integer, String> auditUserNames = userRepository.findAllById(
                        audits.stream().map(AuditLog::getUserId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(User::getUserId, User::getFullName));

        List<ClaimHistoryEntryResponse> auditEntries = audits.stream()
                .map(a -> ClaimHistoryEntryResponse.builder()
                        .type("AUDIT")
                        .id(a.getId())
                        .claimId(a.getEntityId())
                        .actionType(a.getActionType())
                        .details(a.getDetails())
                        .performedBy(a.getUserId() == null ? "SYSTEM" : auditUserNames.getOrDefault(a.getUserId(), String.valueOf(a.getUserId())))
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<ClaimHistoryEntryResponse> all = new ArrayList<>(statusEntries.size() + auditEntries.size());
        all.addAll(statusEntries);
        all.addAll(auditEntries);

        all.sort(Comparator.comparing(ClaimHistoryEntryResponse::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return all;
    }

    @Transactional(readOnly = true)
    public List<ClaimPhotoResponse> listPhotos(Integer claimId) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimEntity(claimId);
        assertCanView(claim, actor);

        return claimPhotoRepository.findByClaimId(claimId).stream()
                .sorted(Comparator.comparing(ClaimPhoto::getUploadedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::toPhotoResponse)
                .collect(Collectors.toList());
    }

    private Claim getClaimEntity(Integer claimId) {
        return claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found with ID: " + claimId));
    }

    private ClaimListItemResponse toListItemResponse(
            Claim claim,
            Map<Integer, Equipment> equipmentById,
            Map<Integer, User> usersById,
            Map<Integer, Department> departmentsById,
            WorkOrder linkedWo
    ) {
        Equipment equipment = claim.getEquipmentId() == null ? null : equipmentById.get(claim.getEquipmentId());
        User requester = claim.getRequesterId() == null ? null : usersById.get(claim.getRequesterId());
        
        Integer effectiveAssigneeId = claim.getAssignedToUserId();
        if (linkedWo != null && linkedWo.getAssignedToUserId() != null) {
            effectiveAssigneeId = linkedWo.getAssignedToUserId();
        }
        User assignee = effectiveAssigneeId == null ? null : usersById.get(effectiveAssigneeId);
        Department dept = claim.getDepartmentId() == null ? null : departmentsById.get(claim.getDepartmentId());

        long photoCount = claim.getClaimId() == null ? 0 : claimPhotoRepository.countByClaimId(claim.getClaimId());

        return ClaimListItemResponse.builder()
                .claimId(claim.getClaimId())
                .claimCode(formatClaimCode(claim.getClaimId()))
                .title(claim.getTitle())
                .description(claim.getDescription())
                .equipmentId(claim.getEquipmentId())
                .equipmentName(equipment == null ? null : equipment.getName())
                .priority(claim.getPriority() == null ? null : claim.getPriority().name())
                .priorityLabel(priorityLabel(claim.getPriority()))
                .reportedSeverity(claim.getReportedSeverity() == null ? null : claim.getReportedSeverity().name())
                .validatedSeverity(claim.getValidatedSeverity() == null ? null : claim.getValidatedSeverity().name())
                .status(claim.getStatus() == null ? null : claim.getStatus().name())
                .statusLabel(statusLabel(claim.getStatus()))
                .requesterId(claim.getRequesterId())
                .requesterName(requester == null ? null : requester.getFullName())
                .assignedToUserId(effectiveAssigneeId)
                .assignedToName(assignee == null ? null : assignee.getFullName())
                .departmentId(claim.getDepartmentId())
                .departmentName(dept == null ? null : dept.getDepartmentName())
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .closedAt(claim.getClosedAt())
                .dueDate(claim.getDueDate())
                .photoCount(photoCount)
                .build();
    }

    private ClaimResponse toClaimResponse(Claim claim) {
        Equipment equipment = claim.getEquipmentId() == null ? null : equipmentRepository.findById(claim.getEquipmentId()).orElse(null);
        User requester = claim.getRequesterId() == null ? null : userRepository.findById(claim.getRequesterId()).orElse(null);
        
        Integer effectiveAssigneeId = claim.getAssignedToUserId();
        if (claim.getLinkedWoId() != null) {
            WorkOrder wo = workOrderRepository.findById(claim.getLinkedWoId()).orElse(null);
            if (wo != null && wo.getAssignedToUserId() != null) {
                effectiveAssigneeId = wo.getAssignedToUserId();
            }
        }
        User assignee = effectiveAssigneeId == null ? null : userRepository.findById(effectiveAssigneeId).orElse(null);
        Department dept = claim.getDepartmentId() == null ? null : departmentRepository.findById(claim.getDepartmentId()).orElse(null);

        List<ClaimPhotoResponse> photos = claim.getClaimId() == null
                ? List.of()
                : claimPhotoRepository.findByClaimId(claim.getClaimId()).stream()
                .sorted(Comparator.comparing(ClaimPhoto::getUploadedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::toPhotoResponse)
                .collect(Collectors.toList());

        long photoCount = claim.getClaimId() == null ? 0 : claimPhotoRepository.countByClaimId(claim.getClaimId());

        return ClaimResponse.builder()
                .claimId(claim.getClaimId())
                .claimCode(formatClaimCode(claim.getClaimId()))
                .title(claim.getTitle())
                .description(claim.getDescription())
                .equipmentId(claim.getEquipmentId())
                .equipmentName(equipment == null ? null : equipment.getName())
                .priority(claim.getPriority() == null ? null : claim.getPriority().name())
                .priorityLabel(priorityLabel(claim.getPriority()))
                .reportedSeverity(claim.getReportedSeverity() == null ? null : claim.getReportedSeverity().name())
                .validatedSeverity(claim.getValidatedSeverity() == null ? null : claim.getValidatedSeverity().name())
                .status(claim.getStatus() == null ? null : claim.getStatus().name())
                .statusLabel(statusLabel(claim.getStatus()))
                .requesterId(claim.getRequesterId())
                .requesterName(requester == null ? null : requester.getFullName())
                .assignedToUserId(effectiveAssigneeId)
                .assignedToName(assignee == null ? null : assignee.getFullName())
                .departmentId(claim.getDepartmentId())
                .departmentName(dept == null ? null : dept.getDepartmentName())
                .qualificationNotes(claim.getQualificationNotes())
                .rejectionNotes(claim.getRejectionNotes())
                .linkedWoId(claim.getLinkedWoId())
                .linkedWoCode(claim.getLinkedWoId() == null ? null : formatWoCode(claim.getLinkedWoId()))
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .closedAt(claim.getClosedAt())
                .resolvedAt(claim.getResolvedAt())
                .rejectedAt(claim.getRejectedAt())
                .dueDate(claim.getDueDate())
                .photoCount(photoCount)
                .photos(photos)
                .build();
    }

    private ClaimPhotoResponse toPhotoResponse(ClaimPhoto photo) {
        return ClaimPhotoResponse.builder()
                .photoId(photo.getPhotoId())
                .claimId(photo.getClaimId())
                .originalName(photo.getOriginalName())
                .filePath(photo.getFilePath())
                .contentType(photo.getContentType())
                .fileSize(photo.getFileSize())
                .uploadedAt(photo.getUploadedAt())
                .uploadedBy(photo.getUploadedBy())
                .build();
    }

    private void saveStatusHistory(Integer claimId, ClaimStatus oldStatus, ClaimStatus newStatus, String changedBy, String note) {
        statusHistoryRepository.save(ClaimStatusHistory.builder()
                .claimId(claimId)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .changedAt(LocalDateTime.now())
                .changedBy(changedBy)
                .note(note)
                .build());
    }

    private void enforceTransition(ClaimStatus oldStatus, ClaimStatus newStatus) {
        if (newStatus == oldStatus) {
            return;
        }

        if (oldStatus == null) {
            throw new IllegalStateException("Invalid claim status transition");
        }

        boolean allowed = switch (oldStatus) {
            case NEW -> (newStatus == ClaimStatus.QUALIFIED || newStatus == ClaimStatus.ASSIGNED || newStatus == ClaimStatus.REJECTED);
            case QUALIFIED -> (newStatus == ClaimStatus.ASSIGNED || newStatus == ClaimStatus.CONVERTED_TO_WORK_ORDER || newStatus == ClaimStatus.REJECTED);
            case ASSIGNED -> (newStatus == ClaimStatus.CONVERTED_TO_WORK_ORDER || newStatus == ClaimStatus.IN_PROGRESS || newStatus == ClaimStatus.REJECTED);
            case CONVERTED_TO_WORK_ORDER -> (newStatus == ClaimStatus.IN_PROGRESS || newStatus == ClaimStatus.CLOSED); 
            case IN_PROGRESS -> (newStatus == ClaimStatus.RESOLVED || newStatus == ClaimStatus.CLOSED);
            case RESOLVED -> (newStatus == ClaimStatus.CLOSED || newStatus == ClaimStatus.IN_PROGRESS);
            case CLOSED, REJECTED -> false;
        };

        if (!allowed) {
            throw new IllegalStateException("Invalid claim status transition from " + oldStatus.name() + " to " + newStatus.name());
        }
    }

    private void assertCanView(Claim claim, Actor actor) {
        if (actor.isAdminOrManager()) {
            return;
        }
        if (actor.userId != null && Objects.equals(actor.userId, claim.getRequesterId())) {
            return;
        }
        if (actor.userId != null && Objects.equals(actor.userId, claim.getAssignedToUserId())) {
            return;
        }
        throw new AccessDeniedException("Not allowed to view this claim");
    }

    private void assertCanEdit(Claim claim, Actor actor) {
        if (actor.isAdminOrManager()) {
            if (claim.getStatus() == ClaimStatus.CLOSED) {
                throw new IllegalStateException("Closed claims cannot be edited");
            }
            return;
        }
        if (actor.userId != null && Objects.equals(actor.userId, claim.getRequesterId())) {
            if (claim.getStatus() == ClaimStatus.CLOSED) {
                throw new IllegalStateException("Closed claims cannot be edited");
            }
            return;
        }
        throw new AccessDeniedException("Not allowed to edit this claim");
    }

    private void assertCanUpdateStatus(Claim claim, Actor actor) {
        if (actor.isAdminOrManager()) {
            return;
        }
        if (actor.hasRole(ROLE_TECHNICIAN) && actor.userId != null && Objects.equals(actor.userId, claim.getAssignedToUserId())) {
            return;
        }
        throw new AccessDeniedException("Not allowed to update claim status");
    }

    private static void assertAdminOrManager(Actor actor) {
        if (actor.isAdminOrManager()) {
            return;
        }
        throw new AccessDeniedException("Requires ADMIN or MAINTENANCE_MANAGER role");
    }

    private User getTechnicianOrThrow(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
        if (!user.hasRole(ROLE_TECHNICIAN)) {
            throw new IllegalArgumentException("Assigned user must have TECHNICIAN role");
        }
        return user;
    }

    private static Specification<Claim> optionalEquals(String field, Object value) {
        return (root, cq, cb) -> value == null ? cb.conjunction() : cb.equal(root.get(field), value);
    }

    private static Specification<Claim> statusInSpec(List<ClaimStatus> statuses) {
        return (root, cq, cb) -> root.get("status").in(statuses);
    }

    private Specification<Claim> freeTextSpec(String q) {
        if (q == null || q.isBlank()) {
            return (root, cq, cb) -> cb.conjunction();
        }
        String like = "%" + q.trim().toLowerCase() + "%";
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("title")), like));
            predicates.add(cb.like(cb.lower(root.get("description")), like));
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<Claim> accessScopeSpec(Actor actor) {
        if (actor.isAdminOrManager() || actor.hasRole("FINANCE_MANAGER")) {
            return (root, cq, cb) -> cb.conjunction();
        }
        if (actor.hasRole(ROLE_TECHNICIAN) && actor.userId != null) {
            return (root, cq, cb) -> cb.or(
                    cb.equal(root.get("assignedToUserId"), actor.userId),
                    cb.equal(root.get("requesterId"), actor.userId)
            );
        }
        if (actor.userId != null) {
            return (root, cq, cb) -> cb.equal(root.get("requesterId"), actor.userId);
        }
        return (root, cq, cb) -> cb.disjunction();
    }

    private static ClaimSeverity parseSeverityOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = normalizeEnumInput(value);
        try {
            return ClaimSeverity.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static ClaimPriority parsePriorityRequired(String value) {
        ClaimPriority priority = parsePriorityOrNull(value);
        if (priority == null) {
            throw new IllegalArgumentException("Invalid priority: " + value);
        }
        return priority;
    }

    private static ClaimPriority parsePriorityOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = normalizeEnumInput(value);
        try {
            return ClaimPriority.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static ClaimStatus parseStatusRequired(String value) {
        ClaimStatus status = parseStatusOrNull(value);
        if (status == null) {
            throw new IllegalArgumentException("Invalid status: " + value);
        }
        return status;
    }

    private static ClaimStatus parseStatusOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = normalizeEnumInput(value);
        try {
            return ClaimStatus.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String normalizeEnumInput(String raw) {
        return raw.trim()
                .toUpperCase()
                .replace('-', '_')
                .replace(' ', '_');
    }

    private static String statusLabel(ClaimStatus status) {
        if (status == null) return null;
        return switch (status) {
            case NEW -> "New";
            case QUALIFIED -> "Qualified";
            case ASSIGNED -> "Assigned";
            case CONVERTED_TO_WORK_ORDER -> "WO Created";
            case IN_PROGRESS -> "In Progress";
            case RESOLVED -> "Resolved";
            case CLOSED -> "Closed";
            case REJECTED -> "Rejected";
        };
    }

    private static String priorityLabel(ClaimPriority priority) {
        if (priority == null) return null;
        return switch (priority) {
            case CRITICAL -> "Critical";
            case HIGH -> "High";
            case MEDIUM -> "Medium";
            case LOW -> "Low";
        };
    }

    private static String formatClaimCode(Integer claimId) {
        if (claimId == null) return null;
        return String.format("CLM-%03d", claimId);
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static Actor getCurrentActorRequired() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("Authentication required");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            User user = userPrincipal.getUser();
            Integer userId = user == null ? null : user.getUserId();
            String displayName = user == null ? null : user.getFullName();
            if (displayName == null || displayName.isBlank()) {
                displayName = userPrincipal.getUsername();
            }
            List<String> roles = user == null ? List.of() : user.getRoles().stream()
                    .map(r -> r.getRoleName().toUpperCase())
                    .collect(Collectors.toList());
            return new Actor(userId, displayName, roles);
        }

        return new Actor(null, authentication.getName(), List.of());
    }

    private record Actor(Integer userId, String displayName, List<String> roles) {
        boolean isAdminOrManager() {
            return roles.contains(ROLE_ADMIN) || roles.contains(ROLE_MAINTENANCE_MANAGER);
        }
        boolean hasRole(String roleName) {
            return roles.contains(roleName);
        }
    }
}
