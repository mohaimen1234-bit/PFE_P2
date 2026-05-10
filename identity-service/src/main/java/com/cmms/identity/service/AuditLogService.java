package com.cmms.identity.service;

import com.cmms.identity.entity.AuditLog;
import com.cmms.identity.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    private static final List<String> SECURITY_ACTIONS = Arrays.asList(
            "LOGIN_FAILED",
            "DELETE_USER",
            "DELETE_ROLE",
            "CHANGE_ROLE",
            "DISABLE_USER",
            "ENABLE_USER"
    );

    @org.springframework.transaction.annotation.Transactional
    @jakarta.annotation.PostConstruct
    public void migrateOldLogs() {
        log.info("Starting audit log migration to populate accountName...");
        List<AuditLog> logs = auditLogRepository.findAll();
        int updated = 0;
        for (AuditLog audit : logs) {
            if (audit.getAccountName() == null || audit.getAccountName().isEmpty()) {
                // Try to extract name from details (old format was "Name details...")
                // We'll just take the first word or skip if it's common system prefix
                String details = audit.getDetails();
                if (details != null && !details.isEmpty()) {
                    String[] parts = details.split(" ", 2);
                    if (parts.length > 0 && !parts[0].equals("User")) {
                         audit.setAccountName(parts[0]);
                         if (audit.getIpAddress() == null) {
                             audit.setIpAddress("Legacy/Unknown");
                         }
                         auditLogRepository.save(audit);
                         updated++;
                    }
                }
            }
        }
        if (updated > 0) {
            log.info("Populated accountName for {} old audit logs", updated);
        }
    }

    @Transactional
    public void log(Integer userId, String userName, String actionType, String entityName, Integer entityId, String details) {
        String ipAddress = "0.0.0.0";
        try {
            org.springframework.web.context.request.RequestAttributes ra = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (ra instanceof org.springframework.web.context.request.ServletRequestAttributes attrs) {
                jakarta.servlet.http.HttpServletRequest request = attrs.getRequest();
                if (request != null) {
                    ipAddress = request.getRemoteAddr();
                    if ("0:0:0:0:0:0:0:1".equals(ipAddress)) {
                        ipAddress = "127.0.0.1";
                    }
                    String forwarded = request.getHeader("X-Forwarded-For");
                    if (forwarded != null && !forwarded.isEmpty()) {
                        ipAddress = forwarded.split(",")[0];
                    }
                }
            }
        } catch (Exception e) {
            // Safe to ignore if outside request context
        }

        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .accountName(userName)
                .actionType(actionType)
                .entityName(entityName)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .build();
        
        auditLogRepository.save(auditLog);
        log.debug("Logged audit action: {} by user: {} from IP: {}", actionType, userName, ipAddress);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentLogs(int limit) {
        return auditLogRepository.findRecentLogs().stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getSecurityLogs(int limit) {
        return auditLogRepository.findSecurityLogs(SECURITY_ACTIONS).stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getByEntity(String entityName, Integer entityId) {
        return auditLogRepository.findByEntity(entityName, entityId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByEntities(List<String> entityNames, int limit) {
        return auditLogRepository.findByEntityNames(entityNames).stream()
                .limit(limit)
                .collect(Collectors.toList());
    }
}
