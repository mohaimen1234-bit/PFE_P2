package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.TaskAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskAuditLogRepository extends JpaRepository<TaskAuditLog, Long> {
    List<TaskAuditLog> findByTaskIdOrderByChangedAtDesc(Integer taskId);
}
