package com.cmms.identity.repository;

import com.cmms.identity.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {

    @Query("SELECT a FROM AuditLog a ORDER BY a.createdAt DESC")
    List<AuditLog> findRecentLogs();

    @Query("SELECT a FROM AuditLog a WHERE a.entityName IN (:entityNames) ORDER BY a.createdAt DESC")
    List<AuditLog> findByEntityNames(@Param("entityNames") List<String> entityNames);

    @Query("SELECT a FROM AuditLog a WHERE a.actionType IN (:securityActions) ORDER BY a.createdAt DESC")
    List<AuditLog> findSecurityLogs(@Param("securityActions") List<String> securityActions);

    @Query("SELECT a FROM AuditLog a WHERE a.entityName = :entityName AND a.entityId = :entityId ORDER BY a.createdAt DESC")
    List<AuditLog> findByEntity(@Param("entityName") String entityName, @Param("entityId") Integer entityId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE AuditLog a SET a.userId = NULL WHERE a.userId = :userId")
    void nullifyUserReferences(@Param("userId") Integer userId);
}
