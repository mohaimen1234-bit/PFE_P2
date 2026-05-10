package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.WorkOrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderStatusHistoryRepository extends JpaRepository<WorkOrderStatusHistory, Long> {
    List<WorkOrderStatusHistory> findByWoIdOrderByChangedAtDesc(Integer woId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE WorkOrderStatusHistory h SET h.changedBy = NULL WHERE h.changedBy = :userId")
    void nullifyChangedByReferences(@org.springframework.data.repository.query.Param("userId") Integer userId);
}
