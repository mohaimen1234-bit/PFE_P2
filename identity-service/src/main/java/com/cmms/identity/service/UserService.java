package com.cmms.identity.service;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;

import com.cmms.identity.dto.CreateUserRequest;
import com.cmms.identity.dto.UpdateUserRequest;
import com.cmms.identity.dto.UserResponse;
import com.cmms.identity.entity.Department;
import com.cmms.identity.entity.Role;
import com.cmms.identity.entity.User;
import com.cmms.identity.exception.DuplicateResourceException;
import com.cmms.identity.exception.ResourceNotFoundException;
import com.cmms.identity.mapper.UserMapper;
import com.cmms.identity.repository.AuditLogRepository;
import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.identity.repository.RoleRepository;
import com.cmms.identity.repository.UserRepository;
import com.cmms.maintenance.repository.WorkOrderAssignmentRepository;
import com.cmms.maintenance.repository.WorkOrderFollowerRepository;
import com.cmms.maintenance.repository.WorkOrderLaborRepository;
import com.cmms.maintenance.repository.WorkOrderRepository;
import com.cmms.maintenance.repository.WorkOrderStatusHistoryRepository;
import com.cmms.claims.repository.ClaimRepository;
import com.cmms.notifications.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final AuditLogService auditLogService;
    private final NotificationRepository notificationRepository;
    private final WorkOrderAssignmentRepository workOrderAssignmentRepository;
    private final WorkOrderFollowerRepository workOrderFollowerRepository;
    private final AuditLogRepository auditLogRepository;
    private final ClaimRepository claimRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderLaborRepository workOrderLaborRepository;
    private final WorkOrderStatusHistoryRepository workOrderStatusHistoryRepository;

    private String getCurrentAuditorName() {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "SYSTEM";
        }
        return authentication.getName();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Integer id) {
        User user = findUserEntityById(id);
        return userMapper.toResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already in use: " + request.getEmail());
        }

        java.util.Set<Role> roles = new java.util.HashSet<>(roleRepository.findAllById(request.getRoleIds()));
        if (roles.isEmpty()) {
            throw new ResourceNotFoundException("No valid roles found for the provided IDs");
        }
        Department department = null;
        if (request.getDepartmentId() != null) {
            department = findDepartmentEntityById(request.getDepartmentId());
        }
        boolean hasTechnicianRole = roles.stream().anyMatch(this::isTechnician);

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .department(hasTechnicianRole ? department : null)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Created new user. ID: {}, Email: {}", savedUser.getUserId(), savedUser.getEmail());

        // Log audit
        auditLogService.log(
                null, // performer ID not easily accessible here without more lookups
                getCurrentAuditorName(),
                "CREATE_USER",
                "User",
                savedUser.getUserId(),
                "Created user: " + savedUser.getEmail()
        );

        return userMapper.toResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUser(Integer id, UpdateUserRequest request) {
        User user = findUserEntityById(id);

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email is already in use: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }

        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            java.util.Set<Role> updatedRoles = new java.util.HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            if (!updatedRoles.isEmpty()) {
                user.setRoles(updatedRoles);
            }
        }

        boolean hasTechnicianRole = user.getRoles().stream().anyMatch(this::isTechnician);
        if (hasTechnicianRole) {
            if (request.getDepartmentId() != null) {
                Department department = findDepartmentEntityById(request.getDepartmentId());
                user.setDepartment(department);
            }
        } else {
            user.setDepartment(null);
        }

        User updatedUser = userRepository.save(user);
        log.info("Updated user info. ID: {}", updatedUser.getUserId());

        // Log audit
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                "UPDATE_USER",
                "User",
                updatedUser.getUserId(),
                "Updated user details for: " + updatedUser.getEmail()
        );

        return userMapper.toResponse(updatedUser);
    }

    @Transactional
    public UserResponse updateUserStatus(Integer id, Boolean isActive) {
        if (isActive == null) {
             throw new IllegalArgumentException("isActive flag must be provided");
        }
        
        User user = findUserEntityById(id);
        user.setIsActive(isActive);
        User updatedUser = userRepository.save(user);
        
        log.info("Updated user status. ID: {}, isActive: {}", updatedUser.getUserId(), isActive);

        // Log audit (Security Action)
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                isActive ? "ENABLE_USER" : "DISABLE_USER",
                "User",
                updatedUser.getUserId(),
                (isActive ? "Enabled" : "Disabled") + " account: " + updatedUser.getEmail()
        );

        return userMapper.toResponse(updatedUser);
    }

    // --- Helper Methods ---

    private User findUserEntityById(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    private Role findRoleEntityById(Integer id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
    }

    private Department findDepartmentEntityById(Integer id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
    }

    private boolean isTechnician(Role role) {
        return role != null && "TECHNICIAN".equalsIgnoreCase(role.getRoleName());
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles().stream()
                .anyMatch(r -> roleName.equalsIgnoreCase(r.getRoleName()));
    }

    @Transactional
    public void deleteUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (hasRole(user, "ADMIN")) {
            throw new com.cmms.identity.exception.ConflictException("Administrator accounts cannot be deleted to prevent system lockout.");
        }

        log.info("Performing hard delete for user ID: {}, Email: {}", userId, user.getEmail());

        // 1. Nullify historical references to allow deletion without constraint violations
        auditLogRepository.nullifyUserReferences(userId);
        claimRepository.nullifyRequesterReferences(userId);
        workOrderRepository.nullifyTechnicianReferences(userId);
        workOrderRepository.nullifyValidatorReferences(userId);
        workOrderLaborRepository.nullifyTechnicianReferences(userId);
        workOrderStatusHistoryRepository.nullifyChangedByReferences(userId);

        // 2. Clean up related data in junction/junk tables to avoid orphaned records
        notificationRepository.deleteByUserId(userId);
        workOrderAssignmentRepository.deleteByUserId(userId);
        workOrderFollowerRepository.deleteByUserId(userId);

        // 2. Perform hard delete
        userRepository.delete(user);

        // Log audit (Security Action)
        auditLogService.log(
                null,
                getCurrentAuditorName(),
                "HARD_DELETE_USER",
                "User",
                userId,
                "Permanently deleted user account and related session data: " + user.getEmail()
        );
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchUsers(Integer roleId, Integer departmentId, String search) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (roleId != null) {
                // Filter where any of the user's roles matches the requested roleId
                jakarta.persistence.criteria.Join<User, Role> rolesJoin = root.join("roles", jakarta.persistence.criteria.JoinType.INNER);
                predicates.add(cb.equal(rolesJoin.get("roleId"), roleId));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("department").get("departmentId"), departmentId));
            }
            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                Predicate emailOrName = cb.or(
                        cb.like(cb.lower(root.get("email")), likePattern),
                        cb.like(cb.lower(root.get("fullName")), likePattern)
                );
                predicates.add(emailOrName);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return userRepository.findAll(spec).stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }
}
