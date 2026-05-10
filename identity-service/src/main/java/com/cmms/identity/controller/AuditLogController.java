package com.cmms.identity.controller;

import com.cmms.identity.entity.AuditLog;
import com.cmms.identity.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public List<AuditLog> getRecentLogs(@RequestParam(defaultValue = "10") int limit) {
        return auditLogService.getRecentLogs(limit);
    }

    @GetMapping("/security")
    public List<AuditLog> getSecurityLogs(@RequestParam(defaultValue = "10") int limit) {
        return auditLogService.getSecurityLogs(limit);
    }

    @GetMapping("/entity/{name}/{id}")
    public List<AuditLog> getByEntity(@PathVariable String name, @PathVariable Integer id) {
        return auditLogService.getByEntity(name, id);
    }

    @GetMapping("/filter")
    public List<AuditLog> getFilteredLogs(
            @RequestParam List<String> entityNames,
            @RequestParam(defaultValue = "200") int limit) {
        return auditLogService.getLogsByEntities(entityNames, limit);
    }
}
